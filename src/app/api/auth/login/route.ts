import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";

import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  signAuthToken,
  type AuthRole,
  verifyPassword,
} from "@/lib/auth";
import { query } from "@/lib/db";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

type UserRow = RowDataPacket & {
  user_id: number;
  email: string;
  password_hash: string;
  role: AuthRole;
};

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const [users] = await query<UserRow[]>(
    "SELECT user_id, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  const user = users[0];

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = signAuthToken({
    userId: user.user_id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({
    user: {
      userId: user.user_id,
      email: user.email,
      role: user.role,
    },
  });

  response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

  return response;
}
