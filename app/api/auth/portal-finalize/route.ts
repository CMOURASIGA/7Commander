import { NextRequest, NextResponse } from "next/server";
import { sameOriginMutation } from "@/lib/central-local-session";

export const dynamic = "force-dynamic";
const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
};
export async function POST(request: NextRequest) {
  if (!sameOriginMutation(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  const raw = request.cookies.get("__Host-commander_portal_otp")?.value;
  const response = NextResponse.json(
    { ok: false, code: "PORTAL_SSO_EXPIRED" }, { status: 401, headers: noStore },
  );
  response.cookies.set("__Host-commander_portal_otp", "", {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0,
  });
  if (!raw || raw.length > 2000) return response;
  let payload: unknown;
  try { payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")); }
  catch { return response; }
  if (!payload || typeof payload !== "object") return response;
  const { tokenHash, localUserId } = payload as Record<string, unknown>;
  if (typeof tokenHash !== "string" || !/^[a-zA-Z0-9_-]{16,256}$/.test(tokenHash) ||
      typeof localUserId !== "string" || !/^[0-9a-f-]{36}$/i.test(localUserId)) return response;
  const success = NextResponse.json({ ok: true, tokenHash, localUserId }, { headers: noStore });
  success.cookies.set("__Host-commander_portal_otp", "", {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0,
  });
  return success;
}
