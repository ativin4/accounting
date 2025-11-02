import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { requireAuth, canEditInvoices, canDeleteInvoices } from '../../../../../lib/auth-utils';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    // Get invoice with items
    const invoiceResult = await sql`
      SELECT i.*, c.name as customer_name, c.gstin as customer_gstin, c.address as customer_address, c.mobile as customer_mobile
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ${id}
        AND i.organization_id = ${user.organizationId}
        AND i.deleted_at IS NULL
      LIMIT 1
    `;

    if (invoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult[0];

    // Get invoice items
    const itemsResult = await sql`
      SELECT
        ii.*,
        psn.serial_number
      FROM invoice_items ii
      LEFT JOIN product_serial_numbers psn ON ii.id = psn.invoice_item_id
      WHERE ii.invoice_id = ${id}
      ORDER BY ii.created_at
    `;

    // Group items by ID and collect serial numbers
    const itemsMap = new Map();
    itemsResult.forEach(row => {
      if (!itemsMap.has(row.id)) {
        itemsMap.set(row.id, {
          id: row.id,
          name: row.name,
          hsn: row.hsn,
          quantity: parseFloat(row.quantity),
          price: parseFloat(row.price),
          type: row.type,
          productId: row.product_id,
          serialNumbers: [],
        });
      }
      if (row.serial_number) {
        itemsMap.get(row.id).serialNumbers.push(row.serial_number);
      }
    });

    const items = Array.from(itemsMap.values());

    return NextResponse.json({
      id: invoice.id,
      customerId: invoice.customer_id,
      customer: {
        name: invoice.customer_name,
        gstin: invoice.customer_gstin,
        address: invoice.customer_address,
        mobile: invoice.customer_mobile,
      },
      date: invoice.date,
      total: parseFloat(invoice.total),
      gst: invoice.gst,
      freight: parseFloat(invoice.freight || '0'),
      discount: parseFloat(invoice.discount || '0'),
      paymentType: invoice.payment_mode,
      version: invoice.version || 1,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      items,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    if (!canEditInvoices(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit invoices' },
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

    // Get old invoice for audit log
    const oldInvoiceResult = await sql`
      SELECT * FROM invoices
      WHERE id = ${id}
        AND organization_id = ${user.organizationId}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (oldInvoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const oldInvoice = oldInvoiceResult[0];

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Archive old invoice by incrementing version
      const newVersion = (oldInvoice.version || 1) + 1;

      await sql`
        UPDATE invoices
        SET version = ${newVersion}, updated_at = NOW()
        WHERE id = ${id}
      `;

      // Update invoice main details
      const updatedInvoiceResult = await sql`
        UPDATE invoices
        SET customer_id = ${customerId},
            date = ${date},
            total = ${total},
            gst = ${gst},
            freight = ${freight},
            discount = ${discount},
            payment_mode = ${paymentType},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Delete old items
      await sql`DELETE FROM invoice_items WHERE invoice_id = ${id}`;

      // Create new items
      const itemPromises = items.map(async (item: any) => {
        const itemId = crypto.randomUUID();
        await sql`
          INSERT INTO invoice_items (
            id, invoice_id, name, hsn, quantity, price, type, product_id, created_at
          )
          VALUES (
            ${itemId}, ${id}, ${item.name}, ${item.hsn || ''}, ${item.quantity}, ${item.price}, ${item.type}, ${item.productId || null}, NOW()
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

      // Update customer balance (adjust for difference)
      const oldTotal = parseFloat(oldInvoice.total);
      const difference = total - oldTotal;

      await sql`
        UPDATE customers
        SET balance = balance + ${difference}
        WHERE id = ${customerId}
          AND organization_id = ${user.organizationId}
      `;

      return {
        invoice: {
          id: updatedInvoiceResult[0].id,
          customerId: updatedInvoiceResult[0].customer_id,
          date: updatedInvoiceResult[0].date,
          total: parseFloat(updatedInvoiceResult[0].total),
          gst: updatedInvoiceResult[0].gst,
          freight: parseFloat(updatedInvoiceResult[0].freight || '0'),
          discount: parseFloat(updatedInvoiceResult[0].discount || '0'),
          paymentType: updatedInvoiceResult[0].payment_mode,
          version: newVersion,
          createdAt: updatedInvoiceResult[0].created_at,
          updatedAt: updatedInvoiceResult[0].updated_at,
        },
        items: createdItems,
      };
    });

    // Create audit log
    await createAuditLog(
      user.organizationId,
      user.id,
      'update',
      'invoice',
      id,
      oldInvoice,
      result
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    if (!canDeleteInvoices(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete invoices' },
        { status: 403 }
      );
    }

    // Get invoice for audit log and balance adjustment
    const invoiceResult = await sql`
      SELECT * FROM invoices
      WHERE id = ${id}
        AND organization_id = ${user.organizationId}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (invoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult[0];

    // Start transaction
    await sql.begin(async (sql) => {
      // Soft delete invoice
      await sql`
        UPDATE invoices
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
      `;

      // Update customer balance (remove invoice total)
      await sql`
        UPDATE customers
        SET balance = balance - ${parseFloat(invoice.total)}
        WHERE id = ${invoice.customer_id}
          AND organization_id = ${user.organizationId}
      `;

      // Mark serial numbers as available again
      await sql`
        UPDATE product_serial_numbers
        SET status = 'available', invoice_item_id = NULL
        WHERE invoice_item_id IN (
          SELECT id FROM invoice_items WHERE invoice_id = ${id}
        )
      `;
    });

    // Create audit log
    await createAuditLog(
      user.organizationId,
      user.id,
      'delete',
      'invoice',
      id,
      invoice,
      null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}