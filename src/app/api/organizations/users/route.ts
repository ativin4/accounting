import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { requireAuth, canManageTeam } from '../../../../../lib/auth-utils';
import type { OrganizationUser } from '../../../../../types';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get all users in the organization
    const users = await sql`
      SELECT
        ou.id,
        ou.role,
        ou.joined_at,
        ou.created_at,
        u.id as user_id,
        u.name,
        u.email,
        u.email_verified,
        u.image,
        inviter.name as invited_by_name
      FROM organization_users ou
      JOIN users u ON ou.user_id = u.id
      LEFT JOIN organization_users inviter_ou ON ou.invited_by = inviter_ou.id
      LEFT JOIN users inviter ON inviter_ou.user_id = inviter.id
      WHERE ou.organization_id = ${user.organizationId}
      ORDER BY ou.created_at ASC
    `;

    const formattedUsers = users.map(userRecord => ({
      id: userRecord.id,
      organizationId: userRecord.organization_id || user.organizationId,
      userId: userRecord.user_id,
      role: userRecord.role,
      joinedAt: userRecord.joined_at,
      createdAt: userRecord.created_at,
      user: {
        id: userRecord.user_id,
        name: userRecord.name,
        email: userRecord.email,
        emailVerified: userRecord.email_verified,
        image: userRecord.image,
      },
      invitedBy: userRecord.invited_by_name,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { userId, role } = await request.json();

    // Check permissions (only owners can change roles)
    if (!canManageTeam(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to change user roles' },
        { status: 403 }
      );
    }

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['owner', 'invoice_manager', 'inventory_manager', 'sales_rep', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Prevent user from changing their own role if they're the only owner
    if (userId === user.id && role !== 'owner') {
      // Check if there are other owners
      const otherOwners = await sql`
        SELECT COUNT(*) as count
        FROM organization_users
        WHERE organization_id = ${user.organizationId}
          AND role = 'owner'
          AND user_id != ${user.id}
      `;

      if (parseInt(otherOwners[0].count) === 0) {
        return NextResponse.json(
          { error: 'Cannot change role: organization must have at least one owner' },
          { status: 400 }
        );
      }
    }

    // Update user role
    const result = await sql`
      UPDATE organization_users
      SET role = ${role}
      WHERE organization_id = ${user.organizationId}
        AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      role: result[0].role,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}