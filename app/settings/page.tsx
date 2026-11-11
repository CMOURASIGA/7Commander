import { validatePublicEnv, validateServerEnv } from "@/lib/env";
import { AuthClientConfig } from "@/components/settings/auth-client-config";
import { ClientBrandConfig } from "@/components/settings/client-brand-config";
import { KairosProfileConfig } from "@/components/settings/kairos-profile-config";
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
        eyebrow="Consult Services · 7Commander"
        title="Configurações operacionais"
        description="Acompanhe a disponibilidade dos serviços essenciais do workspace e as preferências de acesso do operador."
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

      <nav aria-label="Áreas de configuração" className="workspace-card flex flex-wrap gap-2 p-3">
        {[
          {href:"#identity",label:"Identidade visual"},
          {href:"#kairos-profile",label:"Perfil Kairos"},
          {href:"#frontend-env",label:"Frontend"},
          {href:"#backend-env",label:"Backend"},
          {href:"#integrations",label:"Integrações"},
          {href:"#voice-config",label:"Voz"},
          {href:"#auth-settings",label:"Acesso"},
        ].map(item=><a key={item.href} className="workspace-button-secondary text-xs" href={item.href}>{item.label}</a>)}
      </nav>
      <div id="identity" className="scroll-mt-24"><ClientBrandConfig /></div>
      <div id="kairos-profile" className="scroll-mt-24"><KairosProfileConfig /></div>

      <div id="frontend-env" className="scroll-mt-24"><SurfaceCard>
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
      </SurfaceCard></div>

      <div id="backend-env" className="scroll-mt-24"><SurfaceCard>
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
      </SurfaceCard></div>

      <div id="integrations" className="scroll-mt-24"><SurfaceCard>
        <SectionLabel>Administração técnica</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Serviços protegidos</h3>
        <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
          Chaves de integração e parâmetros internos ficam protegidos no ambiente de hospedagem. Esta área apresenta apenas a situação de cada serviço, sem expor configurações sensíveis ao operador.
        </p>
      </SurfaceCard></div>

      <div id="voice-config" className="scroll-mt-24"><SurfaceCard>
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
      </SurfaceCard></div>

      <div id="auth-settings" className="scroll-mt-24"><AuthClientConfig /></div>
    </section>
  );
}
