import sql from '../lib/db';
import type { User, Organization, OrganizationUser, Role } from '../types';
import { randomUUID } from 'crypto';

export async function findOrCreateUser(email: string, name?: string): Promise<User> {
  try {
    // Try to find existing user
    const existingUsers = await sql`SELECT * FROM users WHERE email = ${email}`;

    if (existingUsers.length > 0) {
      return existingUsers[0] as User;
    }

    // Create new user
    const userId = randomUUID();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO users (id, email, name, created_at, updated_at)
      VALUES (${userId}, ${email}, ${name || null}, ${now}, ${now})
    `;

    return {
      id: userId,
      email,
      name: name || null,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Error finding or creating user:', error);
    throw error;
  }
}

export async function createOrganizationForUser(userId: string, userName?: string): Promise<Organization> {
  try {
    const organizationId = randomUUID();
    const orgUserLinkId = randomUUID();
    const now = new Date().toISOString();

    const orgName = userName ? `${userName}'s Organization` : 'My Organization';

    // Create organization
    await sql`
      INSERT INTO organizations (id, name, created_at, updated_at)
      VALUES (${organizationId}, ${orgName}, ${now}, ${now})
    `;

    // Create organization user link with owner role
    await sql`
      INSERT INTO organization_users (id, organization_id, user_id, role, joined_at, created_at)
      VALUES (${orgUserLinkId}, ${organizationId}, ${userId}, 'owner', ${now}, ${now})
    `;

    return {
      id: organizationId,
      name: orgName,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Error creating organization for user:', error);
    throw error;
  }
}

export async function getUserOrganization(userId: string): Promise<{ organization: Organization; role: Role } | null> {
  try {
    const result = await sql`
      SELECT o.*, ou.role
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = ${userId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    const { role, ...organization } = result[0];
    return {
      organization: organization as Organization,
      role: role as Role,
    };
  } catch (error) {
    console.error('Error getting user organization:', error);
    return null;
  }
}

export async function ensureUserHasOrganization(userId: string, userName?: string): Promise<{ organization: Organization; role: Role }> {
  try {
    // Check if user already has an organization
    const existingOrg = await getUserOrganization(userId);

    if (existingOrg) {
      return existingOrg;
    }

    // Create new organization for the user
    const organization = await createOrganizationForUser(userId, userName);

    return {
      organization,
      role: 'owner',
    };
  } catch (error) {
    console.error('Error ensuring user has organization:', error);
    throw error;
  }
}