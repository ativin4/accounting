import type { NextApiRequest, NextApiResponse } from "next";

export type Customer = {
  id: string;
  name: string;
  gstin: string;
  address: string;
  mobile: string;
  balance: number;
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
};

export type InvoiceItem = {
  id: string;
  name: string;
  hsn: string;
  quantity: number;
  price: number;
  type: "wholesale" | "retail";
};

export type LedgerEntry = {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  hsn: string;
  wholesalePrice: number;
  retailPrice: number;
  stock: number;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  company: string;
  gstin: string;
  address: string;
  mobile: string;
};
