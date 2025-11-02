import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 2) {
      return NextResponse.json({ products: [] });
    }

    // Search products with available stock
    const products = await sql`
      SELECT
        id,
        name,
        hsn,
        wholesale_price,
        retail_price,
        stock,
        category,
        track_serial_numbers,
        created_at,
        updated_at
      FROM inventory
      WHERE organization_id = ${user.organizationId}
        AND stock > 0
        AND (name ILIKE ${'%' + query + '%'} OR hsn ILIKE ${'%' + query + '%'})
      ORDER BY
        CASE
          WHEN name ILIKE ${query + '%'} THEN 1
          WHEN name ILIKE ${'%' + query + '%'} THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      products: products.map(product => ({
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
      })),
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}