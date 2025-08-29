import { NextRequest } from "next/server";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { company_id, customer_id, type, date, total, freight, discount, payment_mode } = data;
  const result = await sql`
    INSERT INTO invoices (company_id, customer_id, type, date, total, freight, discount, payment_mode)
    VALUES (${company_id}, ${customer_id}, ${type}, ${date}, ${total}, ${freight}, ${discount}, ${payment_mode})
    RETURNING *;
  `;
  return Response.json(result[0]);
}

export async function GET() {
  const result = await sql`SELECT * FROM invoices`;
  return Response.json(result);
}
