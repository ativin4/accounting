import { NextRequest } from "next/server";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { company_id, name, gstin, address, city, state, pincode, mobile } = data;
  const result = await sql`
    INSERT INTO customers (company_id, name, gstin, address, city, state, pincode, mobile)
    VALUES (${company_id}, ${name}, ${gstin}, ${address}, ${city}, ${state}, ${pincode}, ${mobile})
    RETURNING *;
  `;
  return Response.json(result[0]);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupBy = searchParams.get("groupBy");
  let result;
  if (groupBy === "city") {
    result = await sql`SELECT city, array_agg(customers) as customers FROM customers GROUP BY city`;
  } else if (groupBy === "pincode") {
    result = await sql`SELECT pincode, array_agg(customers) as customers FROM customers GROUP BY pincode`;
  } else {
    result = await sql`SELECT * FROM customers`;
  }
  return Response.json(result);
}
