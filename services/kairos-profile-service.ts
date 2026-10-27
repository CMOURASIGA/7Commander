import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_SCHEMA_READY, requireEffectiveTenant } from "@/lib/tenant-runtime";

const ALLOW_LOCAL_FALLBACK = process.env.KAIROS_ENABLE_LOCAL_FALLBACK === "true";
const localProfiles = new Map<string, KairosProfileConfig>();

export type KairosProfileConfig = {
  instructions: string;
  knowledge: string;
  icebreakers: string[];
};

export const DEFAULT_KAIROS_PROFILE: KairosProfileConfig = {
  instructions: "",
  knowledge: "",
  icebreakers: [],
};

function normalizeText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeIcebreakers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item, 240))
    .filter(Boolean)
    .slice(0, 8);
}

export function normalizeKairosProfile(input: Partial<KairosProfileConfig>): KairosProfileConfig {
  return {
    instructions: normalizeText(input.instructions, 12000),
    knowledge: normalizeText(input.knowledge, 24000),
    icebreakers: normalizeIcebreakers(input.icebreakers),
  };
}

export async function getKairosProfile(userId: string): Promise<KairosProfileConfig> {
  if (TENANT_SCHEMA_READY) {
    const organizationId = await requireEffectiveTenant(userId);
    const db = getSupabaseServerClient();
    if (!db) throw new Error("Tenant profile database unavailable");
    const row = await db.from("kairos_organization_profiles")
      .select("instructions,knowledge,icebreakers")
      .eq("user_id",userId).eq("organization_id",organizationId).maybeSingle();
    if (row.error) throw new Error("Could not read scoped Kairos profile");
    return row.data ? normalizeKairosProfile(row.data) : DEFAULT_KAIROS_PROFILE;
  }
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const result = await supabase
        .from("kairos_profiles")
        .select("instructions, knowledge, icebreakers")
        .eq("user_id", userId)
        .maybeSingle();
      if (!result.error && result.data) return normalizeKairosProfile(result.data);
    } catch {
      // Use the default profile when the optional schema is not available yet.
    }
  }

  return localProfiles.get(userId) ?? DEFAULT_KAIROS_PROFILE;
}

export async function saveKairosProfile(
  userId: string,
  input: Partial<KairosProfileConfig>,
): Promise<KairosProfileConfig> {
  const profile = normalizeKairosProfile(input);
  if (TENANT_SCHEMA_READY) {
    const organizationId = await requireEffectiveTenant(userId);
    const db = getSupabaseServerClient();
    if (!db) throw new Error("Tenant profile database unavailable");
    const upsert = await db.from("kairos_organization_profiles").upsert({
      organization_id:organizationId,user_id:userId,
      instructions:profile.instructions,knowledge:profile.knowledge,
      icebreakers:profile.icebreakers,updated_at:new Date().toISOString()
    },{onConflict:"organization_id,user_id"}).select("instructions,knowledge,icebreakers").single();
    if(upsert.error||!upsert.data) throw new Error("Could not save scoped Kairos profile");
    return normalizeKairosProfile(upsert.data);
  }
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("kairos_profiles")
      .upsert(
        {
          user_id: userId,
          instructions: profile.instructions,
          knowledge: profile.knowledge,
          icebreakers: profile.icebreakers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("instructions, knowledge, icebreakers")
      .single();
    if (!result.error && result.data) return normalizeKairosProfile(result.data);
    if (!ALLOW_LOCAL_FALLBACK) throw new Error(result.error?.message || "Falha ao salvar configuracao do Kairos.");
  }

  localProfiles.set(userId, profile);
  return profile;
}
