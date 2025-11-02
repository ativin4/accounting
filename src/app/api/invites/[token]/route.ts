import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import type { InviteLink, Organization } from '../../../../../types';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Find valid invite
    const invites = await sql`
      SELECT il.*, o.name as organization_name
      FROM invite_links il
      JOIN organizations o ON il.organization_id = o.id
      WHERE il.token = ${token}
        AND il.expires_at > NOW()
        AND il.used_by IS NULL
      LIMIT 1
    `;

    if (invites.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 404 }
      );
    }

    const invite = invites[0];

    return NextResponse.json({
      id: invite.id,
      organization: {
        id: invite.organization_id,
        name: invite.organization_name,
      },
      role: invite.role,
      expiresAt: invite.expires_at,
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
}