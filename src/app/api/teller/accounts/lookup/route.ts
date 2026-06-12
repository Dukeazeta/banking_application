import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { jsonError, requireRole } from "@/lib/api";
import { query } from "@/lib/db";

type TellerAccountLookupRow = RowDataPacket & {
  account_number: string;
  account_type: "SAVINGS" | "CURRENT";
  first_name: string;
  last_name: string;
  status: "ACTIVE" | "CLOSED" | "FROZEN";
};

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "TELLER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const accountNumber = request.nextUrl.searchParams.get("accountNumber")?.trim() ?? "";

  if (!/^\d{10}$/.test(accountNumber)) {
    return jsonError("Account number must be exactly 10 digits.", 400);
  }

  const [rows] = await query<TellerAccountLookupRow[]>(
    `SELECT a.account_number,
            a.account_type,
            a.status,
            c.first_name,
            c.last_name
       FROM accounts a
       JOIN customers c ON c.customer_id = a.customer_id
      WHERE a.account_number = ?
      LIMIT 1`,
    [accountNumber],
  );

  const account = rows[0];

  if (!account) {
    return jsonError("Account not found.", 404);
  }

  return NextResponse.json({
    account: {
      accountNumber: account.account_number,
      accountType: account.account_type,
      holderName: `${account.first_name} ${account.last_name}`,
      status: account.status,
    },
  });
}
