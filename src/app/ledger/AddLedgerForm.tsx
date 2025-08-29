"use client";
import { useState } from "react";

export default function AddLedgerForm({ companyId, customers }: { companyId: number, customers: { id: number, name: string }[] }) {
  const [form, setForm] = useState({ customer_id: "", date: "", amount: "", type: "credit", description: "" });
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company_id: companyId }),
    });
    if (res.ok) setMessage("Entry added!");
    else setMessage("Error adding entry");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-100 rounded p-4">
      <select className="w-full p-2 rounded border" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} required>
        <option value="">Select Customer</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input type="date" className="w-full p-2 rounded border" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
      <input type="number" placeholder="Amount" className="w-full p-2 rounded border" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
      <select className="w-full p-2 rounded border" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
        <option value="credit">Credit</option>
        <option value="debit">Debit</option>
      </select>
      <input type="text" placeholder="Description" className="w-full p-2 rounded border" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Entry</button>
      {message && <div>{message}</div>}
    </form>
  );
}
