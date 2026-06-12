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

type TransferBody = {
  fromAccountId?: unknown;
  toAccountNumber?: unknown;
  amount?: unknown;
  description?: unknown;
  transactionPin?: unknown;
};

type SourceAccountRow = RowDataPacket & {
  account_id: number;
  account_number: string;
};

type DestinationAccountRow = RowDataPacket & {
  account_id: number;
  account_number: string;
  account_type: "SAVINGS" | "CURRENT";
  first_name: string;
  last_name: string;
};

type UserPinRow = RowDataPacket & {
  transaction_pin_hash: string;
};

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "CUSTOMER");

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readJsonBody<TransferBody>(request);
  const fromAccountId = asPositiveInteger(body?.fromAccountId);
  const toAccountNumber = asRequiredString(body?.toAccountNumber);
  const amount = asPositiveNumber(body?.amount);
  const description = asOptionalString(body?.description);
  const transactionPin = asRequiredString(body?.transactionPin);

  if (
    fromAccountId === null ||
    toAccountNumber === null ||
    amount === null ||
    transactionPin === null
  ) {
    return NextResponse.json(
      {
        error:
          "A valid fromAccountId, toAccountNumber, positive amount, and transaction PIN are required.",
      },
      { status: 400 },
    );
  }

  if (!/^\d{10}$/.test(toAccountNumber)) {
    return NextResponse.json(
      { error: "Destination account number must be exactly 10 digits." },
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
    const [sourceRows] = await query<SourceAccountRow[]>(
      `SELECT a.account_id, a.account_number
         FROM accounts a
         JOIN customers c ON c.customer_id = a.customer_id
        WHERE a.account_id = ?
          AND c.user_id = ?
          AND a.status = 'ACTIVE'
        LIMIT 1`,
      [fromAccountId, auth.user.userId],
    );

    const sourceAccount = sourceRows[0];

    if (!sourceAccount) {
      return NextResponse.json(
        { error: "Source account not found, inactive, or not owned by you." },
        { status: 400 },
      );
    }

    const [destinationRows] = await query<DestinationAccountRow[]>(
      `SELECT a.account_id,
              a.account_number,
              a.account_type,
              c.first_name,
              c.last_name
         FROM accounts a
         JOIN customers c ON c.customer_id = a.customer_id
        WHERE a.account_number = ?
          AND a.status = 'ACTIVE'
        LIMIT 1`,
      [toAccountNumber],
    );

    const destinationAccount = destinationRows[0];

    if (!destinationAccount) {
      return NextResponse.json(
        { error: "Recipient account not found or inactive." },
        { status: 400 },
      );
    }

    if (sourceAccount.account_id === destinationAccount.account_id) {
      return NextResponse.json(
        { error: "You cannot transfer to the same account." },
        { status: 400 },
      );
    }

    const [pinRows] = await query<UserPinRow[]>(
      "SELECT transaction_pin_hash FROM users WHERE user_id = ? LIMIT 1",
      [auth.user.userId],
    );

    const pinHash = pinRows[0]?.transaction_pin_hash;

    if (!pinHash || !(await verifyPassword(transactionPin, pinHash))) {
      return NextResponse.json({ error: "Invalid transaction PIN." }, { status: 401 });
    }

    await callProcedure("sp_transfer", [
      auth.user.userId,
      fromAccountId,
      toAccountNumber,
      amount,
      description,
    ]);

    return NextResponse.json({ message: "Transfer processed." });
  } catch (error) {
    return NextResponse.json(
      { error: getSqlErrorMessage(error) },
      { status: 400 },
    );
  }
}
