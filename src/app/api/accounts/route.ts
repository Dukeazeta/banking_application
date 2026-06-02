import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";

import {
  asRequiredString,
  getSqlErrorMessage,
  readJsonBody,
  requireRole,
} from "@/lib/api";
import { callProcedure, query } from "@/lib/db";

type OpenAccountBody = {
  accountType?: unknown;
};

type AccountRow = RowDataPacket & {
  account_id: number;
  account_number: string;
  account_type: "SAVINGS" | "CHECKING";
  balance: string;
  status: "ACTIVE" | "CLOSED" | "FROZEN";
  opened_at: Date;
  closed_at: Date | null;
};

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "CUSTOMER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const [accounts] = await query<AccountRow[]>(
    `SELECT
       a.account_id,
       a.account_number,
       a.account_type,
       a.balance,
       a.status,
       a.opened_at,
       a.closed_at
     FROM accounts a
     JOIN customers c ON a.customer_id = c.customer_id
     WHERE c.user_id = ?
     ORDER BY a.opened_at DESC`,
    [auth.user.userId],
  );

  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "CUSTOMER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readJsonBody<OpenAccountBody>(request);
  const accountType = asRequiredString(body?.accountType)?.toUpperCase();

  if (accountType !== "SAVINGS" && accountType !== "CHECKING") {
    return NextResponse.json(
      { error: "Account type must be SAVINGS or CHECKING." },
      { status: 400 },
    );
  }

  try {
    await callProcedure("sp_open_account", [auth.user.userId, accountType]);

    return NextResponse.json(
      { message: "Account opened successfully." },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: getSqlErrorMessage(error) },
      { status: 400 },
    );
  }
}
