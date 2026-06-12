import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "bank_token";
const PUBLIC_AUTH_PATHS = ["/login", "/register"];

type AuthRole = "CUSTOMER" | "ADMIN";

type MiddlewareTokenPayload = {
  userId: number;
  email: string;
  role: AuthRole;
  exp?: number;
};

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function base64UrlToJson<T>(value: string): T {
  const bytes = base64UrlToBytes(value);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as T;
}

function isRole(value: unknown): value is AuthRole {
  return value === "CUSTOMER" || value === "ADMIN";
}

function isValidPayload(value: unknown): value is MiddlewareTokenPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "userId" in value &&
    "email" in value &&
    "role" in value &&
    typeof value.userId === "number" &&
    typeof value.email === "string" &&
    isRole(value.role)
  );
}

async function verifyToken(token: string): Promise<MiddlewareTokenPayload | null> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const header = base64UrlToJson<{ alg?: string; typ?: string }>(encodedHeader);

  if (header.alg !== "HS256") {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const isSignatureValid = await crypto.subtle.verify(
    "HMAC",
    key,
    toArrayBuffer(base64UrlToBytes(encodedSignature)),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );

  if (!isSignatureValid) {
    return null;
  }

  const payload = base64UrlToJson<unknown>(encodedPayload);

  if (!isValidPayload(payload)) {
    return null;
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    return null;
  }

  return payload;
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function redirectAuthenticatedUser(request: NextRequest, role: AuthRole) {
  const url = request.nextUrl.clone();
  url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (PUBLIC_AUTH_PATHS.includes(pathname) && payload) {
    return redirectAuthenticatedUser(request, payload.role);
  }

  if (pathname.startsWith("/dashboard")) {
    if (!payload) {
      return redirectToLogin(request);
    }

    if (payload.role !== "CUSTOMER") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!payload) {
      return redirectToLogin(request);
    }

    if (payload.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*", "/admin/:path*"],
};
