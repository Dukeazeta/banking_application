import { NextResponse, type NextRequest } from "next/server";

import { hashPassword } from "@/lib/auth";
import { callProcedure } from "@/lib/db";

type RegisterBody = {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  address?: unknown;
  dateOfBirth?: unknown;
};

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isValidDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function getSqlErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

export async function POST(request: NextRequest) {
  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const dateOfBirth =
    typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First name and last name are required." },
      { status: 400 },
    );
  }

  if (!dateOfBirth || !isValidDateOnly(dateOfBirth)) {
    return NextResponse.json(
      { error: "Date of birth must use YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(password);

    await callProcedure("sp_register_customer", [
      email,
      passwordHash,
      firstName,
      lastName,
      cleanOptionalString(body.phone),
      cleanOptionalString(body.address),
      dateOfBirth,
    ]);

    return NextResponse.json(
      { message: "Customer registered successfully." },
      { status: 201 },
    );
  } catch (error) {
    if (getSqlErrorCode(error) === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
