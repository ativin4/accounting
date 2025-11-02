import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { requireAuth, canManageTeam } from '../../../../lib/auth-utils';
import type { Organization } from '../../../../types';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get the user's organization
    const organizations = await sql`
      SELECT o.*, ou.role
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = ${user.id}
      LIMIT 1
    `;

    if (organizations.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = organizations[0];
    return NextResponse.json({
      id: org.id,
      name: org.name,
      gstin: org.gstin,
      address: org.address,
      phone: org.phone,
      createdAt: org.created_at,
      updatedAt: org.updated_at,
      role: org.role,
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { name, gstin, address, phone } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check if user already has an organization
    const existingOrgs = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = ${user.id}
      LIMIT 1
    `;

    if (existingOrgs.length > 0) {
      return NextResponse.json(
        { error: 'User already has an organization' },
        { status: 400 }
      );
    }

    // Create new organization
    const orgResult = await sql`
      INSERT INTO organizations (name, gstin, address, phone, created_at, updated_at)
      VALUES (${name.trim()}, ${gstin || null}, ${address || null}, ${phone || null}, NOW(), NOW())
      RETURNING *
    `;

    const organization = orgResult[0];

    // Add user as owner
    await sql`
      INSERT INTO organization_users (organization_id, user_id, role, joined_at, created_at)
      VALUES (${organization.id}, ${user.id}, 'owner', NOW(), NOW())
    `;

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      gstin: organization.gstin,
      address: organization.address,
      phone: organization.phone,
      createdAt: organization.created_at,
      updatedAt: organization.updated_at,
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { name, gstin, address, phone } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check user permissions (only owners can edit organization)
    if (!canManageTeam(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update organization
    const result = await sql`
      UPDATE organizations
      SET name = ${name.trim()},
          gstin = ${gstin || null},
          address = ${address || null},
          phone = ${phone || null},
          updated_at = NOW()
      WHERE id = ${user.organizationId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organization = result[0];

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      gstin: organization.gstin,
      address: organization.address,
      phone: organization.phone,
      createdAt: organization.created_at,
      updatedAt: organization.updated_at,
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}