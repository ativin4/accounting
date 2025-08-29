import AddInvoiceForm from "./AddInvoiceForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function getCustomers() {
  const res = await fetch("http://localhost:3000/api/customers", { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

export default async function InvoicePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Invoice</h1>
        <p>You must be signed in to view this page.</p>
      </main>
    );
  }
  // For demo, use companyId = 1. Replace with real company/user logic.
  const customers = await getCustomers();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Invoice</h1>
      <AddInvoiceForm companyId={1} customers={customers} />
      {/* List of invoices will be rendered here */}
    </main>
  );
}
