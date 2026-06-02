import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";

import { requireRole } from "@/lib/api";
import { callProcedure, query } from "@/lib/db";

type BankingReportRow = RowDataPacket & {
  total_customers: number;
  total_accounts: number;
  total_balance: string | null;
  total_deposits: string;
  total_withdrawals: string;
  total_transfers: number;
  total_failed_txns: number;
};

type SystemTotalsRow = RowDataPacket & {
  total_customers: number;
  total_accounts: number;
  total_balance: string | null;
  total_failed_transactions: number;
};

type TransactionTypeTotalsRow = RowDataPacket & {
  transaction_type: string;
  tx_count: number;
  total_amount: string | null;
};

type AccountTypeTotalsRow = RowDataPacket & {
  account_type: string;
  account_count: number;
  total_balance: string | null;
};

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "ADMIN");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const [summaryRows] = await query<BankingReportRow[]>(
    "SELECT * FROM vw_banking_report",
  );
  const [resultSets] = await callProcedure<RowDataPacket[][]>("sp_banking_report");

  return NextResponse.json({
    summary: summaryRows[0] ?? null,
    systemTotals: (resultSets[0] ?? []) as SystemTotalsRow[],
    transactionTotalsByType: (resultSets[1] ?? []) as TransactionTypeTotalsRow[],
    accountBalancesByType: (resultSets[2] ?? []) as AccountTypeTotalsRow[],
  });
}
