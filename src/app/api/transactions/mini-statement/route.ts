import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";

import { asPositiveInteger, requireRole } from "@/lib/api";
import { callProcedure } from "@/lib/db";

type TransactionRow = RowDataPacket & {
  transaction_id: number;
  transaction_reference: string;
  account_id: number;
  performed_by_user_id: number;
  transaction_type: string;
  amount: string;
  balance_after: string;
  status: string;
  description: string | null;
  created_at: Date;
};

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "CUSTOMER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const accountId = asPositiveInteger(
    request.nextUrl.searchParams.get("accountId"),
  );

  if (accountId === null) {
    return NextResponse.json(
      { error: "A valid accountId query parameter is required." },
      { status: 400 },
    );
  }

  const [resultSets] = await callProcedure<RowDataPacket[][]>("sp_mini_statement", [
    auth.user.userId,
    accountId,
  ]);

  return NextResponse.json({
    transactions: (resultSets[0] ?? []) as TransactionRow[],
  });
}
