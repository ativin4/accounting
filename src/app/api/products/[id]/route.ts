import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { requireAuth, canManageProducts } from '../../../../../lib/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    // Get product with serial number information
    const productResult = await sql`
      SELECT
        i.*,
        COUNT(DISTINCT psn.id) FILTER (WHERE psn.status = 'available') as available_serial_count,
        COUNT(DISTINCT psn.id) FILTER (WHERE psn.status = 'sold') as sold_serial_count,
        COUNT(DISTINCT psn.id) FILTER (WHERE psn.status = 'returned') as returned_serial_count
      FROM inventory i
      LEFT JOIN product_serial_numbers psn ON i.id = psn.product_id
      WHERE i.id = ${id}
        AND i.organization_id = ${user.organizationId}
      GROUP BY i.id
      LIMIT 1
    `;

    if (productResult.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productResult[0];

    return NextResponse.json({
      id: product.id,
      name: product.name,
      hsn: product.hsn,
      wholesalePrice: parseFloat(product.wholesale_price),
      retailPrice: parseFloat(product.retail_price),
      stock: parseInt(product.stock),
      category: product.category,
      trackSerialNumbers: product.track_serial_numbers,
      availableSerialCount: parseInt(product.available_serial_count),
      soldSerialCount: parseInt(product.sold_serial_count),
      returnedSerialCount: parseInt(product.returned_serial_count),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
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

    if (!canManageProducts(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage products' },
        { status: 403 }
      );
    }

    const {
      name,
      hsn,
      wholesalePrice,
      retailPrice,
      stock,
      category,
      trackSerialNumbers,
    } = await request.json();

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    // Update product
    const result = await sql`
      UPDATE inventory
      SET name = ${name.trim()},
          hsn = ${hsn || ''},
          wholesale_price = ${wholesalePrice},
          retail_price = ${retailPrice},
          stock = ${stock},
          category = ${category || null},
          track_serial_numbers = ${trackSerialNumbers || false},
          updated_at = NOW()
      WHERE id = ${id}
        AND organization_id = ${user.organizationId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = result[0];

    return NextResponse.json({
      id: product.id,
      name: product.name,
      hsn: product.hsn,
      wholesalePrice: parseFloat(product.wholesale_price),
      retailPrice: parseFloat(product.retail_price),
      stock: parseInt(product.stock),
      category: product.category,
      trackSerialNumbers: product.track_serial_numbers,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
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

    if (!canManageProducts(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage products' },
        { status: 403 }
      );
    }

    // Check if product is used in any invoices
    const usageResult = await sql`
      SELECT COUNT(*) as usage_count
      FROM invoice_items
      WHERE product_id = ${id}
      LIMIT 1
    `;

    if (parseInt(usageResult[0].usage_count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product that is used in invoices' },
        { status: 400 }
      );
    }

    // Delete product and related serial numbers
    await sql.begin(async (sql) => {
      // Delete serial numbers
      await sql`DELETE FROM product_serial_numbers WHERE product_id = ${id}`;

      // Delete product
      await sql`DELETE FROM inventory WHERE id = ${id} AND organization_id = ${user.organizationId}`;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}