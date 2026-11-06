import { NextResponse } from "next/server";
import { validatePublicEnv, validateServerEnv, isAuthRequired } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Release gate, not an authentication endpoint.
 * Exposes only readiness status, never secrets or environment variable names.
 * Any productive central rollout must have its own verified configuration,
 * not the QA pilot tenant or an unauthenticated fallback.
 */
export async function GET() {
  const production = process.env.VERCEL_ENV === "production";
  const integration = process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS === "true";
  const baseReady = validatePublicEnv().length === 0
    && validateServerEnv().length === 0
    && isAuthRequired()
    && process.env.SEVEN_COMMANDER_TENANT_SCHEMA_READY === "true"
    && process.env.SEVEN_COMMANDER_MULTI_TENANT_READY === "true";

  const centralReady = !integration || Boolean(
    process.env.COMMANDER_CENTRAL_AUTH_ENABLED === "true"
    && process.env.SERVICE_7SERVICE_ORIGIN?.startsWith("https://")
    && process.env.SERVICE_7SERVICE_SUPABASE_URL?.startsWith("https://")
    && process.env.SERVICE_7SERVICE_SUPABASE_ANON_KEY
  );
  // The QA-only pilot integration must never be mistaken for a multi-client
  // productive entitlement rollout.
  const rolloutReady = !production || (
    integration
    && process.env.SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS === "true"
    && process.env.COMMANDER_CENTRAL_BROKER_ENABLED === "true"
    && !process.env.SERVICE_7SERVICE_PILOT_ORG_ID
  );
  if (!baseReady || !centralReady || !rolloutReady) {
    return NextResponse.json({ ready:false }, {status:503, headers});
  }

  try {
    const db = getSupabaseServerClient();
    if (!db) return NextResponse.json({ready:false}, {status:503, headers});
    const query = await db.from("organizations").select("id").limit(1);
    return NextResponse.json({ready:!query.error}, {status:query.error ? 503 : 200, headers});
  } catch {
    return NextResponse.json({ready:false}, {status:503, headers});
  }
}
