import { NextRequest, NextResponse } from "next/server";
import { POST as exchange } from "@/app/api/auth/central-exchange/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const denied = () => NextResponse.json({ ok: false, code: "PORTAL_SSO_DENIED" }, { status: 403, headers });

/**
 * Cross-origin form POST without query-string tokens.
 * The central JWT is verified again by the existing Commander broker.
 * A short-lived HTTP-only cookie transfers a single-use local OTP hash
 * to the same-origin browser completion step.
 */
export async function POST(request: NextRequest) {
  if (process.env.COMMANDER_PORTAL_SSO_ENABLED !== "true" ||
      process.env.COMMANDER_CENTRAL_BROKER_MULTITENANT_ENABLED !== "true" ||
      process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS !== "true") return denied();
  const allowed = (process.env.COMMANDER_PORTAL_SSO_ALLOWED_ORIGINS ?? "")
    .split(",").map(value => value.trim()).filter(Boolean);
  const origin = request.headers.get("origin");
  if (!origin || !origin.startsWith("https://") || !allowed.includes(origin)) return denied();
  if (request.headers.get("sec-fetch-site") === "same-origin") return denied();
  if (Number(request.headers.get("content-length") ?? 0) > 11000) return denied();
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded") &&
      !type.startsWith("multipart/form-data")) return denied();
  const form = await request.formData().catch(() => null);
  const tokens = form?.getAll("centralAccessToken") ?? [];
  if (tokens.length !== 1 || typeof tokens[0] !== "string") return denied();
  const token = tokens[0];
  if (!/^[-A-Za-z0-9_.~]{50,10000}$/.test(token)) return denied();

  const internalRequest = new NextRequest(new URL("/api/auth/central-exchange", request.url), {
    method: "POST",
    headers: { "content-type": "application/json", origin: request.nextUrl.origin },
    body: JSON.stringify({ centralAccessToken: token }),
  });
  const result = await exchange(internalRequest);
  if (!result.ok) return denied();
  const payload = await result.json().catch(() => null) as
    | { ok?: boolean; tokenHash?: string; localUserId?: string } | null;
  if (payload?.ok !== true ||
      !/^[a-zA-Z0-9_-]{16,256}$/.test(payload.tokenHash ?? "") ||
      !/^[0-9a-f-]{36}$/i.test(payload.localUserId ?? "")) return denied();

  const next = NextResponse.redirect(new URL("/portal-finalize", request.url), {
    status: 303, headers,
  });
  for (const cookie of result.cookies.getAll()) {
    next.cookies.set(cookie.name, cookie.value, {
      httpOnly: true, secure: true, sameSite: "strict", path: "/",
      maxAge: cookie.name.includes("crefresh") ? 0 : 900,
    });
  }
  next.cookies.set("__Host-commander_portal_otp",
    Buffer.from(JSON.stringify({
      tokenHash: payload.tokenHash, localUserId: payload.localUserId,
    })).toString("base64url"),
    { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 45 },
  );
  return next;
}
