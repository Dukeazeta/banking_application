import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import {
  asOptionalString,
  asPositiveNumber,
  asRequiredString,
  getSqlErrorMessage,
  readJsonBody,
  requireRole,
} from "@/lib/api";
import { callProcedure, query } from "@/lib/db";

type DepositBody = {
  accountNumber?: unknown;
  amount?: unknown;
  description?: unknown;
};

type ActiveTellerRow = RowDataPacket & {
  user_id: number;
};

type ActiveAccountRow = RowDataPacket & {
  account_id: number;
};

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "TELLER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readJsonBody<DepositBody>(request);
  const accountNumber = asRequiredString(body?.accountNumber);
  const amount = asPositiveNumber(body?.amount);
  const description = asOptionalString(body?.description);

  if (accountNumber === null || amount === null) {
    return NextResponse.json(
      { error: "A valid accountNumber and positive amount are required." },
      { status: 400 },
    );
  }

  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json(
      { error: "Account number must be exactly 10 digits." },
      { status: 400 },
    );
  }

  try {
    const [tellerRows] = await query<ActiveTellerRow[]>(
      `SELECT u.user_id
         FROM users u
         JOIN tellers t ON t.user_id = u.user_id
        WHERE u.user_id = ?
          AND u.role = 'TELLER'
          AND t.status = 'ACTIVE'
        LIMIT 1`,
      [auth.user.userId],
    );

    if (!tellerRows[0]) {
      return NextResponse.json(
        { error: "Teller profile not found or inactive." },
        { status: 403 },
      );
    }

    const [accountRows] = await query<ActiveAccountRow[]>(
      `SELECT account_id
         FROM accounts
        WHERE account_number = ?
          AND status = 'ACTIVE'
        LIMIT 1`,
      [accountNumber],
    );

    if (!accountRows[0]) {
      return NextResponse.json(
        { error: "Destination account not found or inactive." },
        { status: 400 },
      );
    }

    await callProcedure("sp_deposit", [
      auth.user.userId,
      accountNumber,
      amount,
      description,
    ]);

    return NextResponse.json({ message: "Deposit completed." });
  } catch (error) {
    return NextResponse.json(
      { error: getSqlErrorMessage(error) },
      { status: 400 },
    );
  }
}
