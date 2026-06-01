import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";

import { AUTH_COOKIE_NAME, type AuthRole, verifyAuthToken } from "@/lib/auth";
import { query } from "@/lib/db";

type UserRow = RowDataPacket & {
  user_id: number;
  email: string;
  role: AuthRole;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const payload = verifyAuthToken(token);
    const [users] = await query<UserRow[]>(
      "SELECT user_id, email, role FROM users WHERE user_id = ? LIMIT 1",
      [payload.userId],
    );
    const user = users[0];

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        userId: user.user_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }
}
