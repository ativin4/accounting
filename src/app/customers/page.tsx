import AddCustomerForm from "./AddCustomerForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Customers</h1>
        <p>You must be signed in to view this page.</p>
      </main>
    );
  }
  // For demo, use companyId = 1. Replace with real company/user logic.
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>
      <AddCustomerForm companyId={1} />
      {/* List of customers will be rendered here */}
    </main>
  );
}
