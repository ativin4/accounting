import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { customer_id, date, amount, type, description } = await request.json();

    if (!customer_id || !date || !amount || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, date, amount, type' },
        { status: 400 }
      );
    }

    if (!['credit', 'debit'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either credit or debit' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO ledger_entries (customer_id, date, amount, type, description, organization_id, created_at, updated_at)
      VALUES (${customer_id}, ${date}, ${amount}, ${type}, ${description || null}, ${user.organizationId}, NOW(), NOW())
      RETURNING *
    `;

    // Update customer balance
    const balanceChange = type === 'credit' ? amount : -amount;
    await sql`
      UPDATE customers
      SET balance = balance + ${balanceChange}
      WHERE id = ${customer_id}
        AND organization_id = ${user.organizationId}
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to create ledger entry' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let whereClause = sql`WHERE le.organization_id = ${user.organizationId}`;
    if (customerId) {
      whereClause = sql`WHERE le.organization_id = ${user.organizationId} AND le.customer_id = ${customerId}`;
    }

    const result = await sql`
      SELECT
        le.*,
        c.name as customer_name,
        c.gstin as customer_gstin
      FROM ledger_entries le
      JOIN customers c ON le.customer_id = c.id
      ${whereClause}
      ORDER BY le.date DESC, le.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM ledger_entries le
      ${whereClause}
    `;

    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      entries: result.map(entry => ({
        id: entry.id,
        customerId: entry.customer_id,
        customerName: entry.customer_name,
        customerGstin: entry.customer_gstin,
        date: entry.date,
        amount: parseFloat(entry.amount),
        type: entry.type,
        description: entry.description,
        createdAt: entry.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}
