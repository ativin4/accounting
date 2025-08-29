import { NextRequest } from "next/server";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { company_id, name, hsn, wholesale_price, retail_price } = data;
  const result = await sql`
    INSERT INTO inventory (company_id, name, hsn, wholesale_price, retail_price)
    VALUES (${company_id}, ${name}, ${hsn}, ${wholesale_price}, ${retail_price})
    RETURNING *;
  `;
  return Response.json(result[0]);
}

export async function GET() {
  const result = await sql`SELECT * FROM inventory`;
  return Response.json(result);
}
