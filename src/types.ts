import type { NextApiRequest, NextApiResponse } from "next";

export type Role = 'owner' | 'invoice_manager' | 'inventory_manager' | 'sales_rep' | 'viewer';

export type Customer = {
  id: string;
  name: string;
  gstin: string;
  address: string;
  mobile: string;
  balance: number;
  organizationId?: string;
};

export type Invoice = {
  id: string;
  customerId: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  gst: boolean;
  freight: number;
  discount: number;
  paymentType: "cash" | "credit";
  organizationId?: string;
  version?: number;
  deletedAt?: string;
};

export type InvoiceItem = {
  id: string;
  name: string;
  hsn: string;
  quantity: number;
  price: number;
  type: "wholesale" | "retail";
  invoiceId: string;
  productId?: string;
  serialNumbers?: string[];
};

export type LedgerEntry = {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  organizationId?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  hsn: string;
  wholesalePrice: number;
  retailPrice: number;
  stock: number;
  organizationId?: string;
  trackSerialNumbers?: boolean;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = InventoryItem; // Alias for clarity

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  company?: string;
  gstin?: string;
  address?: string;
  mobile?: string;
  organizationId?: string;
  role?: Role;
};

export type Organization = {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationUser = {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  invitedBy?: string;
  joinedAt: string;
  createdAt: string;
  user?: UserProfile;
};

export type InviteLink = {
  id: string;
  organizationId: string;
  token: string;
  role: Role;
  expiresAt: string;
  usedBy?: string;
  createdAt: string;
  organization?: Organization;
};

export type AuditLog = {
  id: string;
  organizationId: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
  user?: UserProfile;
};

export type ProductSerialNumber = {
  id: string;
  productId: string;
  serialNumber: string;
  status: 'available' | 'sold' | 'returned';
  invoiceItemId?: string;
  createdAt: string;
};

export type User = {
  id: string;
  name?: string;
  email: string;
  emailVerified?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
};

export type Account = {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string;
  createdAt: string;
  updatedAt: string;
};

export type VerificationToken = {
  identifier: string;
  token: string;
  expires: string;
  createdAt: string;
  updatedAt: string;
};
