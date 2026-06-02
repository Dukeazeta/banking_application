import { NextResponse, type NextRequest } from "next/server";

import {
  asOptionalString,
  asPositiveInteger,
  asPositiveNumber,
  getSqlErrorMessage,
  readJsonBody,
  requireRole,
} from "@/lib/api";
import { callProcedure } from "@/lib/db";

type WithdrawBody = {
  accountId?: unknown;
  amount?: unknown;
  description?: unknown;
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

  if (accountId === null || amount === null) {
    return NextResponse.json(
      { error: "A valid accountId and positive amount are required." },
      { status: 400 },
    );
  }

  try {
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
