import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function GSTInvoicePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">GST Invoice</h1>
        <p>You must be signed in to view this page.</p>
      </main>
    );
  }
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">GST Invoice</h1>
      {/* GST Invoice creation form and list will be rendered here */}
    </main>
  );
}
