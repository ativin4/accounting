import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { requireAuth, canViewReports } from '../../../../lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!canViewReports(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit logs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    let whereConditions = [sql`al.organization_id = ${user.organizationId}`];

    if (entityType) {
      whereConditions.push(sql`al.entity_type = ${entityType}`);
    }

    if (userId) {
      whereConditions.push(sql`al.user_id = ${userId}`);
    }

    if (action) {
      whereConditions.push(sql`al.action = ${action}`);
    }

    if (startDate) {
      whereConditions.push(sql`al.created_at >= ${startDate}`);
    }

    if (endDate) {
      whereConditions.push(sql`al.created_at <= ${endDate}`);
    }

    const whereClause = whereConditions.reduce((acc, condition, index) => {
      if (index === 0) return sql`WHERE ${condition}`;
      return sql`${acc} AND ${condition}`;
    }, sql``);

    // Get audit logs with user information
    const logs = await sql`
      SELECT
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `;

    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        organizationId: log.organization_id,
        userId: log.user_id,
        userName: log.user_name,
        userEmail: log.user_email,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        oldValues: log.old_values,
        newValues: log.new_values,
        createdAt: log.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}