"use client";
import { useState } from "react";

export default function AddInventoryForm({ companyId }: { companyId: number }) {
  const [form, setForm] = useState({ name: "", hsn: "", wholesale_price: "", retail_price: "" });
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company_id: companyId }),
    });
    if (res.ok) setMessage("Item added!");
    else setMessage("Error adding item");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-100 rounded p-4">
      <input type="text" placeholder="Name" className="w-full p-2 rounded border" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      <input type="text" placeholder="HSN" className="w-full p-2 rounded border" value={form.hsn} onChange={e => setForm(f => ({ ...f, hsn: e.target.value }))} />
      <input type="number" placeholder="Wholesale Price" className="w-full p-2 rounded border" value={form.wholesale_price} onChange={e => setForm(f => ({ ...f, wholesale_price: e.target.value }))} />
      <input type="number" placeholder="Retail Price" className="w-full p-2 rounded border" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Item</button>
      {message && <div>{message}</div>}
    </form>
  );
}
