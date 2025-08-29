import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

// Dummy data for demonstration
const companyInfo = {
  name: "Acme Corp.",
  gstin: "22AAAAA0000A1Z5",
  address: "123 Main St, City, State, 123456",
  mobile: "+91-9876543210",
};

const latestInvoices = [
  { id: "INV001", customer: "John Doe", total: 1200, date: "2025-08-28" },
  { id: "INV002", customer: "Jane Smith", total: 950, date: "2025-08-27" },
];

const topBalances = [
  { name: "John Doe", balance: 5000 },
  { name: "Jane Smith", balance: 3200 },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Welcome to Accounting App</h1>
      {session ? (
        <>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Company Info</h2>
            <div className="bg-gray-100 rounded p-4 mb-2">
              <p>
                <b>Name:</b> {companyInfo.name}
              </p>
              <p>
                <b>GSTIN:</b> {companyInfo.gstin}
              </p>
              <p>
                <b>Address:</b> {companyInfo.address}
              </p>
              <p>
                <b>Mobile:</b> {companyInfo.mobile}
              </p>
            </div>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Quick Links</h2>
            <div className="flex flex-wrap gap-4">
              <Link href="/customers" className="btn">
                Customers
              </Link>
              <Link href="/ledger" className="btn">
                Ledger
              </Link>
              <Link href="/gst-invoice" className="btn">
                GST Invoice
              </Link>
              <Link href="/invoice" className="btn">
                Invoice
              </Link>
              <Link href="/inventory" className="btn">
                Inventory
              </Link>
              <Link href="/profile" className="btn">
                Profile
              </Link>
            </div>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Latest Invoices</h2>
            <table className="w-full bg-white rounded shadow text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Invoice #</th>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {latestInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b">
                    <td className="p-2">{inv.id}</td>
                    <td className="p-2">{inv.customer}</td>
                    <td className="p-2">₹{inv.total}</td>
                    <td className="p-2">{inv.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">Top Balances</h2>
            <ul className="list-disc pl-5">
              {topBalances.map((cust) => (
                <li key={cust.name}>
                  {cust.name}: <b>₹{cust.balance}</b>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <Link href="/api/auth/signin">Sign in with Google</Link>
      )}
    </main>
  );
}
