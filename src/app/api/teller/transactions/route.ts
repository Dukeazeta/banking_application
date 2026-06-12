import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { requireRole } from "@/lib/api";
import { query } from "@/lib/db";

type TellerTransactionRow = RowDataPacket & {
  transaction_id: number;
  transaction_reference: string;
  account_number: string;
  first_name: string;
  last_name: string;
  amount: string;
  status: "SUCCESS" | "FAILED";
  created_at: Date;
};

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "TELLER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  try {
    const [rows] = await query<TellerTransactionRow[]>(
      `SELECT t.transaction_id,
              t.transaction_reference,
              t.amount,
              t.status,
              t.created_at,
              a.account_number,
              c.first_name,
              c.last_name
         FROM transactions t
         JOIN accounts a ON t.account_id = a.account_id
         JOIN customers c ON a.customer_id = c.customer_id
        WHERE t.performed_by_user_id = ?
          AND t.transaction_type = 'DEPOSIT'
        ORDER BY t.created_at DESC
        LIMIT 50`,
      [auth.user.userId],
    );

    return NextResponse.json({ transactions: rows });
  } catch (error) {
    console.error("Failed to fetch teller transactions:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching transactions." },
      { status: 500 },
    );
  }
}
