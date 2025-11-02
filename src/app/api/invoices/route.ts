import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { requireAuth, canCreateInvoices, canEditInvoices, canDeleteInvoices } from '../../../../lib/auth-utils';
import { randomUUID } from 'crypto';
import type { Invoice, InvoiceItem } from '../../../../types';

// Helper function to create audit log
async function createAuditLog(
  organizationId: string,
  userId: string,
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  oldValues?: any,
  newValues?: any
) {
  try {
    await sql`
      INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, old_values, new_values, created_at)
      VALUES (${organizationId}, ${userId}, ${action}, ${entityType}, ${entityId}, ${JSON.stringify(oldValues || null)}, ${JSON.stringify(newValues || null)}, NOW())
    `;
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get invoices with customer information and items
    const invoices = await sql`
      SELECT
        i.*,
        c.name as customer_name,
        c.gstin as customer_gstin,
        COUNT(ii.id) as item_count
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.organization_id = ${user.organizationId}
        AND i.deleted_at IS NULL
      GROUP BY i.id, c.name, c.gstin
      ORDER BY i.date DESC, i.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM invoices i
      WHERE i.organization_id = ${user.organizationId}
        AND i.deleted_at IS NULL
    `;

    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        customerId: invoice.customer_id,
        customerName: invoice.customer_name,
        customerGstin: invoice.customer_gstin,
        date: invoice.date,
        total: parseFloat(invoice.total),
        gst: invoice.gst,
        freight: parseFloat(invoice.freight || '0'),
        discount: parseFloat(invoice.discount || '0'),
        paymentType: invoice.payment_mode,
        itemCount: parseInt(invoice.item_count),
        version: invoice.version || 1,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!canCreateInvoices(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create invoices' },
        { status: 403 }
      );
    }

    const {
      customerId,
      date,
      items,
      total,
      gst = false,
      freight = 0,
      discount = 0,
      paymentType,
    } = await request.json();

    // Validation
    if (!customerId || !date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, date, items' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Create invoice
      const invoiceResult = await sql`
        INSERT INTO invoices (
          customer_id, date, total, gst, freight, discount, payment_mode, organization_id, version, created_at, updated_at
        )
        VALUES (
          ${customerId}, ${date}, ${total}, ${gst}, ${freight}, ${discount}, ${paymentType}, ${user.organizationId}, 1, NOW(), NOW()
        )
        RETURNING *
      `;

      const invoice = invoiceResult[0];

      // Create invoice items
      const itemPromises = items.map(async (item: Partial<InvoiceItem>) => {
        const itemId = randomUUID();
        await sql`
          INSERT INTO invoice_items (
            id, invoice_id, name, hsn, quantity, price, type, product_id, created_at
          )
          VALUES (
            ${itemId}, ${invoice.id}, ${item.name}, ${item.hsn || ''}, ${item.quantity}, ${item.price}, ${item.type}, ${item.productId || null}, NOW()
          )
        `;

        // Handle serial numbers if provided
        if (item.serialNumbers && Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0) {
          for (const serialNumber of item.serialNumbers) {
            await sql`
              INSERT INTO product_serial_numbers (product_id, serial_number, status, invoice_item_id, created_at)
              VALUES (${item.productId}, ${serialNumber}, 'sold', ${itemId}, NOW())
              ON CONFLICT (product_id, serial_number) DO UPDATE SET
                status = 'sold',
                invoice_item_id = ${itemId}
            `;
          }
        }

        return { ...item, id: itemId };
      });

      const createdItems = await Promise.all(itemPromises);

      // Update customer balance
      await sql`
        UPDATE customers
        SET balance = balance + ${total}
        WHERE id = ${customerId}
          AND organization_id = ${user.organizationId}
      `;

      return {
        invoice: {
          id: invoice.id,
          customerId: invoice.customer_id,
          date: invoice.date,
          total: parseFloat(invoice.total),
          gst: invoice.gst,
          freight: parseFloat(invoice.freight || '0'),
          discount: parseFloat(invoice.discount || '0'),
          paymentType: invoice.payment_mode,
          version: invoice.version,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at,
        },
        items: createdItems,
      };
    });

    // Create audit log
    await createAuditLog(
      user.organizationId,
      user.id,
      'create',
      'invoice',
      result.invoice.id,
      null,
      result
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
