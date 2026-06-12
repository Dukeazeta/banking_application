import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { jsonError, requireRole } from "@/lib/api";
import { query } from "@/lib/db";

type AccountLookupRow = RowDataPacket & {
  account_number: string;
  account_type: "SAVINGS" | "CURRENT";
  first_name: string;
  last_name: string;
};

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "CUSTOMER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const accountNumber = request.nextUrl.searchParams.get("accountNumber")?.trim() ?? "";

  if (!/^\d{10}$/.test(accountNumber)) {
    return jsonError("Account number must be exactly 10 digits.", 400);
  }

  const [rows] = await query<AccountLookupRow[]>(
    `SELECT a.account_number,
            a.account_type,
            c.first_name,
            c.last_name
       FROM accounts a
       JOIN customers c ON c.customer_id = a.customer_id
      WHERE a.account_number = ?
        AND a.status = 'ACTIVE'
      LIMIT 1`,
    [accountNumber],
  );

  const account = rows[0];

  if (!account) {
    return jsonError("Recipient account not found or inactive.", 404);
  }

  return NextResponse.json({
    account: {
      accountNumber: account.account_number,
      accountType: account.account_type,
      customerName: `${account.first_name} ${account.last_name}`,
    },
  });
}
