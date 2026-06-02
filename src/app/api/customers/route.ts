import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";

import { requireRole } from "@/lib/api";
import { query } from "@/lib/db";

type CustomerProfileRow = RowDataPacket & {
  customer_id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  date_of_birth: Date;
  created_at: Date;
};

type AdminCustomerRow = RowDataPacket & {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  total_accounts: number;
  total_balance: string;
};

export async function GET(request: NextRequest) {
  const customerAuth = requireRole(request, "CUSTOMER");

  if (!customerAuth.error && customerAuth.user) {
    const [customers] = await query<CustomerProfileRow[]>(
      `SELECT
         c.customer_id,
         c.user_id,
         u.email,
         c.first_name,
         c.last_name,
         c.phone,
         c.address,
         c.date_of_birth,
         c.created_at
       FROM customers c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.user_id = ?
       LIMIT 1`,
      [customerAuth.user.userId],
    );

    return NextResponse.json({ customer: customers[0] ?? null });
  }

  const adminAuth = requireRole(request, "ADMIN");

  if (adminAuth.error || !adminAuth.user) {
    return adminAuth.error;
  }

  const [customers] = await query<AdminCustomerRow[]>(
    "SELECT * FROM vw_customer_accounts ORDER BY last_name, first_name",
  );

  return NextResponse.json({ customers });
}
