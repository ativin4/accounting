"use client";
import { useState } from "react";

export default function AddCustomerForm({ companyId }: { companyId: number }) {
  const [form, setForm] = useState({ name: "", gstin: "", address: "", city: "", state: "", pincode: "", mobile: "" });
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company_id: companyId }),
    });
    if (res.ok) setMessage("Customer added!");
    else setMessage("Error adding customer");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-100 rounded p-4">
      <input type="text" placeholder="Name" className="w-full p-2 rounded border" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      <input type="text" placeholder="GSTIN" className="w-full p-2 rounded border" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} />
      <input type="text" placeholder="Address" className="w-full p-2 rounded border" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      <input type="text" placeholder="City" className="w-full p-2 rounded border" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
      <input type="text" placeholder="State" className="w-full p-2 rounded border" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
      <input type="text" placeholder="Pincode" className="w-full p-2 rounded border" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
      <input type="text" placeholder="Mobile" className="w-full p-2 rounded border" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Customer</button>
      {message && <div>{message}</div>}
    </form>
  );
}
