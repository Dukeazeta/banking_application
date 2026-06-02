import { NextResponse, type NextRequest } from "next/server";

import {
  asOptionalString,
  asPositiveInteger,
  asPositiveNumber,
  asRequiredString,
  getSqlErrorMessage,
  readJsonBody,
  requireRole,
} from "@/lib/api";
import { callProcedure } from "@/lib/db";

type TransferBody = {
  fromAccountId?: unknown;
  toAccountNumber?: unknown;
  amount?: unknown;
  description?: unknown;
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

  if (fromAccountId === null || toAccountNumber === null || amount === null) {
    return NextResponse.json(
      {
        error:
          "A valid fromAccountId, toAccountNumber, and positive amount are required.",
      },
      { status: 400 },
    );
  }

  try {
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
