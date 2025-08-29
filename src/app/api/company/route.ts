import { NextRequest } from "next/server";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { company, gstin, address, bank, mobile } = data;
  const result = await sql`
    INSERT INTO companies (name, gstin, address, bank_info, mobile)
    VALUES (${company}, ${gstin}, ${address}, ${bank}, ${mobile})
    RETURNING *;
  `;
  return Response.json(result[0]);
}
