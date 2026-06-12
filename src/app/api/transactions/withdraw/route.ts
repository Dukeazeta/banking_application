import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { verifyPassword } from "@/lib/auth";
import {
  asOptionalString,
  asPositiveInteger,
  asPositiveNumber,
  asRequiredString,
  getSqlErrorMessage,
  readJsonBody,
  requireRole,
} from "@/lib/api";
import { callProcedure, query } from "@/lib/db";

type WithdrawBody = {
  accountId?: unknown;
  amount?: unknown;
  description?: unknown;
  transactionPin?: unknown;
};

type UserPinRow = RowDataPacket & {
  transaction_pin_hash: string;
};

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "CUSTOMER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readJsonBody<WithdrawBody>(request);
  const accountId = asPositiveInteger(body?.accountId);
  const amount = asPositiveNumber(body?.amount);
  const description = asOptionalString(body?.description);
  const transactionPin = asRequiredString(body?.transactionPin);

  if (accountId === null || amount === null || transactionPin === null) {
    return NextResponse.json(
      { error: "A valid accountId, positive amount, and transaction PIN are required." },
      { status: 400 },
    );
  }

  if (!/^\d{4}$/.test(transactionPin)) {
    return NextResponse.json(
      { error: "Transaction PIN must be exactly 4 digits." },
      { status: 400 },
    );
  }

  try {
    const [pinRows] = await query<UserPinRow[]>(
      "SELECT transaction_pin_hash FROM users WHERE user_id = ? LIMIT 1",
      [auth.user.userId],
    );

    const pinHash = pinRows[0]?.transaction_pin_hash;

    if (!pinHash || !(await verifyPassword(transactionPin, pinHash))) {
      return NextResponse.json({ error: "Invalid transaction PIN." }, { status: 401 });
    }

    await callProcedure("sp_withdraw", [
      auth.user.userId,
      accountId,
      amount,
      description,
    ]);

    return NextResponse.json({ message: "Withdrawal processed." });
  } catch (error) {
    return NextResponse.json(
      { error: getSqlErrorMessage(error) },
      { status: 400 },
    );
  }
}
