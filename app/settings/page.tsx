import { validatePublicEnv, validateServerEnv } from "@/lib/env";
import { AuthClientConfig } from "@/components/settings/auth-client-config";
import { PageIntro, SectionLabel, SurfaceCard, StatusPill } from "@/components/ui/workspace-primitives";

export default function SettingsPage() {
  const missingPublic = validatePublicEnv();
  const missingServer = validateServerEnv();
  const hasTTSModel = Boolean(process.env.OPENAI_TTS_MODEL?.trim());
  const hasTTSVoice = Boolean(process.env.OPENAI_TTS_VOICE?.trim());
  const hasEmbeddingModel = Boolean(process.env.OPENAI_EMBEDDING_MODEL?.trim());

  return (
    <section className="space-y-4">
      <PageIntro
        eyebrow="7C Commander"
        title="Configurações operacionais"
        description="Validação do ambiente, autenticação do operador e parâmetros de voz para manter o workspace consistente entre frontend e backend."
        aside={
          <>
            <StatusPill tone={missingPublic.length === 0 ? "success" : "accent"}>
              Públicas: {missingPublic.length === 0 ? "ok" : `${missingPublic.length} pendências`}
            </StatusPill>
            <StatusPill tone={missingServer.length === 0 ? "success" : "accent"}>
              Server: {missingServer.length === 0 ? "ok" : `${missingServer.length} pendências`}
            </StatusPill>
          </>
        }
      />

      <SurfaceCard>
        <SectionLabel>Variáveis públicas</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Validação do frontend</h3>
        {missingPublic.length === 0 ? (
          <p className="mt-2 text-sm text-(--success)">OK: configuradas.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-(--danger)">
            {missingPublic.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SectionLabel>Variáveis server-side</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Validação do backend</h3>
        {missingServer.length === 0 ? (
          <p className="mt-2 text-sm text-(--success)">OK: configuradas.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-(--danger)">
            {missingServer.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SectionLabel>Provisionamento</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Origem de cada chave</h3>
        <ul className="mt-2 space-y-1 text-sm text-(--text-secondary)">
          <li>NEXT_PUBLIC_SUPABASE_URL - Supabase Project Settings &gt; API &gt; Project URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase Project Settings &gt; API &gt; anon public</li>
          <li>SUPABASE_SERVICE_ROLE_KEY - Supabase Project Settings &gt; API &gt; service_role secret</li>
          <li>OPENAI_API_KEY - OpenAI Dashboard &gt; API keys</li>
          <li>OPENAI_TTS_MODEL - modelo de TTS (ex.: gpt-4o-mini-tts)</li>
          <li>OPENAI_TTS_VOICE - voz de TTS (ex.: sage)</li>
          <li>OPENAI_EMBEDDING_MODEL - modelo de embedding (ex.: text-embedding-3-small)</li>
        </ul>
      </SurfaceCard>

      <SurfaceCard>
        <SectionLabel>Voz</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Configuração de TTS e embeddings</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li className={hasTTSModel ? "text-(--success)" : "text-(--warning)"}>
            OPENAI_TTS_MODEL: {hasTTSModel ? "configurada" : "nao configurada (usara padrao)"}
          </li>
          <li className={hasTTSVoice ? "text-(--success)" : "text-(--warning)"}>
            OPENAI_TTS_VOICE: {hasTTSVoice ? "configurada" : "nao configurada (usara padrao)"}
          </li>
          <li className={hasEmbeddingModel ? "text-(--success)" : "text-(--warning)"}>
            OPENAI_EMBEDDING_MODEL:{" "}
            {hasEmbeddingModel ? "configurada" : "nao configurada (usara padrao)"}
          </li>
        </ul>
      </SurfaceCard>

      <AuthClientConfig />
    </section>
  );
}
