import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { name, gstin, address, mobile } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO customers (name, gstin, address, mobile, balance, organization_id, created_at, updated_at)
      VALUES (${name.trim()}, ${gstin || null}, ${address || null}, ${mobile || null}, 0, ${user.organizationId}, NOW(), NOW())
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get("groupBy");

    let result;
    if (groupBy === "city") {
      result = await sql`
        SELECT city, array_agg(customers) as customers
        FROM customers
        WHERE organization_id = ${user.organizationId}
        GROUP BY city
      `;
    } else if (groupBy === "pincode") {
      result = await sql`
        SELECT pincode, array_agg(customers) as customers
        FROM customers
        WHERE organization_id = ${user.organizationId}
        GROUP BY pincode
      `;
    } else {
      result = await sql`
        SELECT * FROM customers
        WHERE organization_id = ${user.organizationId}
        ORDER BY name ASC
      `;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
