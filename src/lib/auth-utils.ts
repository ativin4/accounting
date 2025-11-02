import { getServerSession } from "next-auth/next";
import { authOptions } from "../app/api/auth/[...nextauth]/route";
import type { Role } from "../types";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  organizationId: string;
  role: Role;
  organizationName: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const user = session.user as any;

  if (!user.organizationId || !user.role) {
    return null;
  }

  return {
    id: user.id || user.userId,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    role: user.role,
    organizationName: user.organizationName,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    'viewer': 1,
    'sales_rep': 2,
    'inventory_manager': 3,
    'invoice_manager': 4,
    'owner': 5,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function requireRole(userRole: Role, requiredRole: Role): void {
  if (!hasPermission(userRole, requiredRole)) {
    throw new Error(`Insufficient permissions. Required role: ${requiredRole}, Current role: ${userRole}`);
  }
}

export function canDeleteInvoices(userRole: Role): boolean {
  return userRole === 'owner';
}

export function canEditInvoices(userRole: Role): boolean {
  return userRole === 'owner' || userRole === 'invoice_manager';
}

export function canCreateInvoices(userRole: Role): boolean {
  return userRole === 'owner' || userRole === 'invoice_manager' || userRole === 'sales_rep';
}

export function canManageProducts(userRole: Role): boolean {
  return userRole === 'owner' || userRole === 'inventory_manager';
}

export function canManageTeam(userRole: Role): boolean {
  return userRole === 'owner';
}

export function canViewReports(userRole: Role): boolean {
  return userRole === 'owner' || userRole === 'invoice_manager' || userRole === 'viewer';
}