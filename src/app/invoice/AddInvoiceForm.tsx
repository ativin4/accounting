"use client";
import { useState } from "react";

export default function AddInvoiceForm({ companyId, customers }: { companyId: number, customers: { id: number, name: string }[] }) {
  const [form, setForm] = useState({ customer_id: "", type: "gst", date: "", total: "", freight: "", discount: "", payment_mode: "cash" });
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company_id: companyId }),
    });
    if (res.ok) setMessage("Invoice added!");
    else setMessage("Error adding invoice");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-100 rounded p-4">
      <select className="w-full p-2 rounded border" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} required>
        <option value="">Select Customer</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="w-full p-2 rounded border" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
        <option value="gst">GST Invoice</option>
        <option value="normal">Normal Invoice</option>
      </select>
      <input type="date" className="w-full p-2 rounded border" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
      <input type="number" placeholder="Total" className="w-full p-2 rounded border" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} required />
      <input type="number" placeholder="Freight" className="w-full p-2 rounded border" value={form.freight} onChange={e => setForm(f => ({ ...f, freight: e.target.value }))} />
      <input type="number" placeholder="Discount" className="w-full p-2 rounded border" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
      <select className="w-full p-2 rounded border" value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}>
        <option value="cash">Cash</option>
        <option value="credit">Credit</option>
      </select>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Invoice</button>
      {message && <div>{message}</div>}
    </form>
  );
}
