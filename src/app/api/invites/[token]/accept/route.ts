import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth-utils';
import type { OrganizationUser } from '../../../../../types';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const user = await requireAuth();
    const { token } = params;

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Find and lock the invite
      const invites = await sql`
        SELECT * FROM invite_links
        WHERE token = ${token}
          AND expires_at > NOW()
          AND used_by IS NULL
        FOR UPDATE
        LIMIT 1
      `;

      if (invites.length === 0) {
        throw new Error('Invalid or expired invite link');
      }

      const invite = invites[0];

      // Check if user is already in the organization
      const existingMembership = await sql`
        SELECT id FROM organization_users
        WHERE organization_id = ${invite.organization_id}
          AND user_id = ${user.id}
        LIMIT 1
      `;

      if (existingMembership.length > 0) {
        throw new Error('User is already a member of this organization');
      }

      // Mark invite as used
      await sql`
        UPDATE invite_links
        SET used_by = ${user.id}
        WHERE id = ${invite.id}
      `;

      // Add user to organization
      const orgUserResult = await sql`
        INSERT INTO organization_users (organization_id, user_id, role, joined_at, created_at)
        VALUES (${invite.organization_id}, ${user.id}, ${invite.role}, NOW(), NOW())
        RETURNING *
      `;

      return {
        organizationId: invite.organization_id,
        role: invite.role,
        orgUser: orgUserResult[0],
      };
    });

    return NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      role: result.role,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid or expired invite link') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message === 'User is already a member of this organization') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}