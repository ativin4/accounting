import { NextRequest } from "next/server";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { company_id, customer_id, date, amount, type, description } = data;
  const result = await sql`
    INSERT INTO ledger_entries (company_id, customer_id, date, amount, type, description)
    VALUES (${company_id}, ${customer_id}, ${date}, ${amount}, ${type}, ${description})
    RETURNING *;
  `;
  return Response.json(result[0]);
}

export async function GET() {
  const result = await sql`SELECT * FROM ledger_entries`;
  return Response.json(result);
}
