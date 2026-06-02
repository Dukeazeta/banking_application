import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";

import { requireRole } from "@/lib/api";
import { query } from "@/lib/db";

type FailedLogRow = RowDataPacket & {
  log_id: number;
  attempted_by: string;
  source_account: string;
  target_account: string | null;
  transaction_type: string;
  attempted_amount: string;
  failure_reason: string;
  created_at: Date;
};

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "ADMIN");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const [failedLogs] = await query<FailedLogRow[]>(
    "SELECT * FROM vw_failed_transaction_log ORDER BY created_at DESC",
  );

  return NextResponse.json({ failedLogs });
}
