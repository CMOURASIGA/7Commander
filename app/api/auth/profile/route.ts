import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    if (auth.context.authMode !== "supabase") {
      return NextResponse.json({ data: { synced: false, reason: "legacy_auth" } });
    }

    const email = auth.context.userEmail?.trim().toLowerCase() ?? "";
    if (!email) {
      return NextResponse.json({ data: { synced: false, reason: "missing_email" } }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase indisponivel." }, { status: 500 });
    }

    const payload = await request.json().catch(() => ({}));
    const nome = typeof payload?.nome === "string" ? payload.nome.trim().slice(0, 120) : "";
    const avatarUrl = typeof payload?.avatarUrl === "string" ? payload.avatarUrl.trim().slice(0, 400) : "";
    const provider = typeof payload?.provider === "string" ? payload.provider.trim().slice(0, 40) : "google";

    const upserted = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: auth.context.userId,
          email,
          nome: nome || null,
          avatar_url: avatarUrl || null,
          provider: provider || "google",
        },
        { onConflict: "user_id" },
      )
      .select("user_id, email, nome, avatar_url, provider, updated_at")
      .single();

    if (upserted.error || !upserted.data) {
      throw new Error(upserted.error?.message || "Falha ao sincronizar perfil.");
    }

    return NextResponse.json({
      data: {
        synced: true,
        profile: upserted.data,
      },
    });
  } catch (error) {
    console.error("[/api/auth/profile] POST error", error);
    return NextResponse.json({ error: "Erro ao sincronizar perfil." }, { status: 500 });
  }
}
