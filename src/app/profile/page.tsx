import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { useState } from "react";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <p>You must be signed in to view this page.</p>
      </main>
    );
  }

  // Form state and submit handler will be implemented as a client component
  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Company Profile</h1>
      <form className="space-y-4 bg-gray-100 rounded p-4" action="/api/company" method="POST">
        <div>
          <label className="block font-semibold mb-1">Company Name</label>
          <input type="text" className="w-full p-2 rounded border" name="company" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">GSTIN</label>
          <input type="text" className="w-full p-2 rounded border" name="gstin" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Address</label>
          <textarea className="w-full p-2 rounded border" name="address" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Bank Info</label>
          <input type="text" className="w-full p-2 rounded border" name="bank" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Mobile Number</label>
          <input type="text" className="w-full p-2 rounded border" name="mobile" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
      </form>
    </main>
  );
}
