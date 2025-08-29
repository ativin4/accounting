import AddInventoryForm from "./AddInventoryForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Inventory</h1>
        <p>You must be signed in to view this page.</p>
      </main>
    );
  }
  // For demo, use companyId = 1. Replace with real company/user logic.
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>
      <AddInventoryForm companyId={1} />
      {/* Inventory items will be rendered here */}
    </main>
  );
}
