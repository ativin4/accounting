import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { requireAuth, canManageTeam } from '../../../../lib/auth-utils';
import { randomBytes } from 'crypto';
import type { InviteLink, Role } from '../../../../types';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { role, expiresInDays = 7 } = await request.json();

    // Check permissions (only owners can create invites)
    if (!canManageTeam(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create invites' },
        { status: 403 }
      );
    }

    // Validate role
    const validRoles: Role[] = ['owner', 'invoice_manager', 'inventory_manager', 'sales_rep', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invite link
    const result = await sql`
      INSERT INTO invite_links (organization_id, token, role, expires_at, created_at)
      VALUES (${user.organizationId}, ${token}, ${role}, ${expiresAt.toISOString()}, NOW())
      RETURNING *
    `;

    const invite = result[0];

    return NextResponse.json({
      id: invite.id,
      token: invite.token,
      role: invite.role,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
      inviteUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${token}`,
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permissions (only owners can view invites)
    if (!canManageTeam(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view invites' },
        { status: 403 }
      );
    }

    // Get all active invites for the organization
    const invites = await sql`
      SELECT il.*, u.name as used_by_name, u.email as used_by_email
      FROM invite_links il
      LEFT JOIN users u ON il.used_by = u.id
      WHERE il.organization_id = ${user.organizationId}
        AND il.expires_at > NOW()
      ORDER BY il.created_at DESC
    `;

    const formattedInvites = invites.map(invite => ({
      id: invite.id,
      token: invite.token,
      role: invite.role,
      expiresAt: invite.expires_at,
      usedBy: invite.used_by ? {
        name: invite.used_by_name,
        email: invite.used_by_email,
      } : null,
      createdAt: invite.created_at,
      inviteUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${invite.token}`,
    }));

    return NextResponse.json(formattedInvites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}