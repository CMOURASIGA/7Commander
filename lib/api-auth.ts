import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDefaultUserId } from "@/lib/user-context";
import { getPublicEnv, isAuthRequired } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const USER_ID_HEADER = "x-kairos-user-id";
const API_KEY_HEADER = "x-kairos-api-key";
const AUTHORIZATION_HEADER = "authorization";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeHeaderValue(value: string | null): string {
  return value?.trim() ?? "";
}

function extractApiKeyFromRequest(request: NextRequest): string {
  const direct = normalizeHeaderValue(request.headers.get(API_KEY_HEADER));
  if (direct) return direct;

  const authorization = normalizeHeaderValue(request.headers.get(AUTHORIZATION_HEADER));
  if (!authorization) return "";

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || !token) return "";
  if (scheme.toLowerCase() !== "bearer") return "";
  return token.trim();
}

function extractBearerToken(request: NextRequest): string {
  const authorization = normalizeHeaderValue(request.headers.get(AUTHORIZATION_HEADER));
  if (!authorization) return "";

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || !token) return "";
  if (scheme.toLowerCase() !== "bearer") return "";
  return token.trim();
}

function seemsJwtToken(value: string): boolean {
  return value.split(".").length === 3;
}

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export type AuthenticatedRequestContext = {
  userId: string;
  userEmail: string | null;
  authMode: "supabase" | "legacy";
};

export async function requireApiAuth(request: NextRequest): Promise<{
  ok: true;
  context: AuthenticatedRequestContext;
} | {
  ok: false;
  response: NextResponse;
}> {
  const configuredApiKey = normalizeHeaderValue(process.env.KAIROS_API_KEY ?? "");
  const requestApiKey = extractApiKeyFromRequest(request);
  const bearerToken = extractBearerToken(request);
  const authRequired = isAuthRequired();

  if (bearerToken && seemsJwtToken(bearerToken) && bearerToken !== configuredApiKey) {
    const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
    if (NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const authClient = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      const userResult = await authClient.auth.getUser(bearerToken);

      if (userResult.data.user && !userResult.error) {
        const db = getSupabaseServerClient();
        if (!db) return { ok: false, response: NextResponse.json({ error: "Banco indisponivel" }, { status: 503 }) };
        const userId = userResult.data.user.id;
        const admin = await db.from("platform_admins").select("active").eq("user_id", userId).eq("active", true).maybeSingle();
        const access = await db.from("internal_user_access").select("active,role").eq("user_id", userId).maybeSingle();
        if (admin.error || access.error) return { ok: false, response: NextResponse.json({ error: "Verificacao de acesso indisponivel" }, { status: 503 }) };
        if (!admin.data && !access.data?.active) return { ok: false, response: NextResponse.json({ error: "Usuario nao autorizado ou suspenso" }, { status: 403 }) };
        const isPrivileged = Boolean(admin.data);
        const method = request.method.toUpperCase();
        const path = request.nextUrl.pathname;
        const write = !["GET", "HEAD", "OPTIONS"].includes(method);
        if (!isPrivileged && write && path !== "/api/auth/profile") {
          if (access.data?.role === "leitor" || (access.data?.role === "colaborador" && method === "DELETE")) {
            return { ok: false, response: NextResponse.json({ error: "Seu perfil nao permite esta operacao." }, { status: 403 }) };
          }
        }
        return {
          ok: true,
          context: {
            userId: userResult.data.user.id,
            userEmail: userResult.data.user.email ?? null,
            authMode: "supabase",
          },
        };
      }
    }
  }

  if (authRequired) {
    if (configuredApiKey && requestApiKey === configuredApiKey) {
      const requestedUserId = normalizeHeaderValue(request.headers.get(USER_ID_HEADER));
      if (requestedUserId && !isValidUuid(requestedUserId)) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              error: `Header '${USER_ID_HEADER}' invalido. Informe um UUID no formato padrao.`,
            },
            { status: 400 },
          ),
        };
      }

      return {
        ok: true,
        context: {
          userId: requestedUserId || getDefaultUserId(),
          userEmail: null,
          authMode: "legacy",
        },
      };
    }

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Nao autenticado. Entre com seu e-mail e senha para continuar.",
        },
        { status: 401 },
      ),
    };
  }

  if (configuredApiKey && requestApiKey !== configuredApiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Nao autorizado. Informe uma chave valida em 'x-kairos-api-key' ou 'Authorization: Bearer <token>'.",
        },
        { status: 401 },
      ),
    };
  }

  const requestedUserId = normalizeHeaderValue(request.headers.get(USER_ID_HEADER));
  if (requestedUserId && !isValidUuid(requestedUserId)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Header '${USER_ID_HEADER}' invalido. Informe um UUID no formato padrao.`,
        },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    context: {
      userId: requestedUserId || getDefaultUserId(),
      userEmail: null,
      authMode: "legacy",
    },
  };
}

