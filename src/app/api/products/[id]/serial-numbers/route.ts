import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../../lib/db';
import { requireAuth, canManageProducts } from '../../../../../../lib/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'available' | 'sold' | 'returned' | undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let whereClause = sql`WHERE psn.product_id = ${id}`;
    if (status) {
      whereClause = sql`WHERE psn.product_id = ${id} AND psn.status = ${status}`;
    }

    // Get serial numbers with invoice information
    const serialNumbers = await sql`
      SELECT
        psn.*,
        ii.invoice_id,
        i.date as invoice_date,
        c.name as customer_name
      FROM product_serial_numbers psn
      LEFT JOIN invoice_items ii ON psn.invoice_item_id = ii.id
      LEFT JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      ${whereClause}
      ORDER BY psn.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM product_serial_numbers psn
      ${whereClause}
    `;

    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      serialNumbers: serialNumbers.map(sn => ({
        id: sn.id,
        productId: sn.product_id,
        serialNumber: sn.serial_number,
        status: sn.status,
        invoiceId: sn.invoice_id,
        invoiceDate: sn.invoice_date,
        customerName: sn.customer_name,
        createdAt: sn.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching serial numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch serial numbers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    if (!canManageProducts(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage products' },
        { status: 403 }
      );
    }

    const { serialNumbers } = await request.json();

    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Serial numbers array is required' },
        { status: 400 }
      );
    }

    // Check if product exists and belongs to user's organization
    const productResult = await sql`
      SELECT id, track_serial_numbers
      FROM inventory
      WHERE id = ${id}
        AND organization_id = ${user.organizationId}
      LIMIT 1
    `;

    if (productResult.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productResult[0];

    if (!product.track_serial_numbers) {
      return NextResponse.json(
        { error: 'Serial number tracking is not enabled for this product' },
        { status: 400 }
      );
    }

    // Add serial numbers
    const createdSerialNumbers = [];
    const skippedSerialNumbers = [];

    for (const serialNumber of serialNumbers) {
      if (serialNumber && serialNumber.trim() !== '') {
        try {
          await sql`
            INSERT INTO product_serial_numbers (product_id, serial_number, status, created_at)
            VALUES (${id}, ${serialNumber.trim()}, 'available', NOW())
          `;
          createdSerialNumbers.push(serialNumber.trim());
        } catch (error) {
          // Skip duplicate serial numbers
          skippedSerialNumbers.push(serialNumber.trim());
        }
      }
    }

    return NextResponse.json({
      success: true,
      createdSerialNumbers,
      skippedSerialNumbers,
      totalCreated: createdSerialNumbers.length,
      totalSkipped: skippedSerialNumbers.length,
    });
  } catch (error) {
    console.error('Error adding serial numbers:', error);
    return NextResponse.json(
      { error: 'Failed to add serial numbers' },
      { status: 500 }
    );
  }
}