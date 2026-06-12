import "server-only";

import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

export type AuthRole = "CUSTOMER" | "ADMIN" | "TELLER";

export type AuthTokenPayload = {
  userId: number;
  email: string;
  role: AuthRole;
};

export const AUTH_COOKIE_NAME = "bank_token";
export const AUTH_TOKEN_EXPIRES_IN: SignOptions["expiresIn"] = "24h";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};

const PASSWORD_SALT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret === undefined || secret.trim() === "") {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }

  return secret;
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === "CUSTOMER" || value === "ADMIN" || value === "TELLER";
}

function isAuthTokenPayload(value: string | JwtPayload): value is AuthTokenPayload {
  return (
    typeof value !== "string" &&
    typeof value.userId === "number" &&
    typeof value.email === "string" &&
    isAuthRole(value.role)
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: AUTH_TOKEN_EXPIRES_IN,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());

  if (!isAuthTokenPayload(decoded)) {
    throw new Error("Invalid auth token payload");
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
}
