import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { requireAuth, canManageProducts } from '../../../../lib/auth-utils';
import { randomUUID } from 'crypto';
import type { Product } from '../../../../types';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let whereClause = sql`WHERE organization_id = ${user.organizationId}`;
    if (search) {
      whereClause = sql`WHERE organization_id = ${user.organizationId} AND (name ILIKE ${'%' + search + '%'} OR hsn ILIKE ${'%' + search + '%'})`;
    }
    if (category) {
      whereClause = sql`WHERE organization_id = ${user.organizationId} AND category = ${category}`;
    }

    // Get products with serial number counts
    const products = await sql`
      SELECT
        i.*,
        COUNT(DISTINCT psn.id) FILTER (WHERE psn.status = 'available') as available_serial_count,
        COUNT(DISTINCT psn.id) FILTER (WHERE psn.status = 'sold') as sold_serial_count,
        COUNT(DISTINCT psn.id) FILTER (WHERE psn.status = 'returned') as returned_serial_count
      FROM inventory i
      LEFT JOIN product_serial_numbers psn ON i.id = psn.product_id
      ${whereClause}
      GROUP BY i.id
      ORDER BY i.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM inventory i
      ${whereClause}
    `;

    const total = parseInt(countResult[0].total);

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
        availableSerialCount: parseInt(product.available_serial_count),
        soldSerialCount: parseInt(product.sold_serial_count),
        returnedSerialCount: parseInt(product.returned_serial_count),
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

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
      stock = 0,
      category,
      trackSerialNumbers = false,
      serialNumbers = [],
    } = await request.json();

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (wholesalePrice === undefined || wholesalePrice === null || wholesalePrice < 0) {
      return NextResponse.json(
        { error: 'Valid wholesale price is required' },
        { status: 400 }
      );
    }

    if (retailPrice === undefined || retailPrice === null || retailPrice < 0) {
      return NextResponse.json(
        { error: 'Valid retail price is required' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Create product
      const productResult = await sql`
        INSERT INTO inventory (
          name, hsn, wholesale_price, retail_price, stock, category, track_serial_numbers, organization_id, created_at, updated_at
        )
        VALUES (
          ${name.trim()}, ${hsn || ''}, ${wholesalePrice}, ${retailPrice}, ${stock}, ${category || null}, ${trackSerialNumbers}, ${user.organizationId}, NOW(), NOW()
        )
        RETURNING *
      `;

      const product = productResult[0];

      // Create serial numbers if tracking is enabled
      let createdSerialNumbers = [];
      if (trackSerialNumbers && Array.isArray(serialNumbers) && serialNumbers.length > 0) {
        for (const serialNumber of serialNumbers) {
          if (serialNumber && serialNumber.trim() !== '') {
            try {
              await sql`
                INSERT INTO product_serial_numbers (product_id, serial_number, status, created_at)
                VALUES (${product.id}, ${serialNumber.trim()}, 'available', NOW())
              `;
              createdSerialNumbers.push(serialNumber.trim());
            } catch (error) {
              // Ignore duplicate serial number errors
              console.warn(`Duplicate serial number skipped: ${serialNumber}`);
            }
          }
        }
      }

      return {
        product: {
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
        },
        createdSerialNumbers,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}