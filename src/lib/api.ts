import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, type AuthRole, verifyAuthToken } from "@/lib/auth";

export type AuthenticatedUser = {
  userId: number;
  email: string;
  role: AuthRole;
};

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function getAuthenticatedUser(request: NextRequest): AuthenticatedUser | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export function requireAuthenticatedUser(request: NextRequest) {
  const user = getAuthenticatedUser(request);

  if (!user) {
    return { error: jsonError("Not authenticated.", 401), user: null };
  }

  return { error: null, user };
}

export function requireRole(request: NextRequest, role: AuthRole) {
  const auth = requireAuthenticatedUser(request);

  if (auth.error || !auth.user) {
    return auth;
  }

  if (auth.user.role !== role) {
    return { error: jsonError("Forbidden.", 403), user: null };
  }

  return { error: null, user: auth.user };
}

export function requireAnyRole(request: NextRequest, roles: AuthRole[]) {
  const auth = requireAuthenticatedUser(request);

  if (auth.error || !auth.user) {
    return auth;
  }

  if (!roles.includes(auth.user.role)) {
    return { error: jsonError("Forbidden.", 403), user: null };
  }

  return { error: null, user: auth.user };
}

export function asRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function asOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return asRequiredString(value);
}

export function asPositiveNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

export function asPositiveInteger(value: unknown): number | null {
  const numberValue = asPositiveNumber(value);

  if (numberValue === null || !Number.isInteger(numberValue)) {
    return null;
  }

  return numberValue;
}

export async function readJsonBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function getSqlErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Database operation failed.";
}
