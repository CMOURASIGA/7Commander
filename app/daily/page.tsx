import { getDailySnapshot } from "@/services/daily-service";
import { getDefaultUserId } from "@/lib/user-context";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { PageIntro, SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";

export const dynamic = "force-dynamic";

function DailySection({ title, items }: { title: string; items: string[] }) {
  return (
    <SurfaceCard>
      <SectionLabel>{title}</SectionLabel>
      <h3 className="mt-2 text-base font-semibold text-(--text-primary)">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-(--text-primary)">
        {items.map((item) => (
          <li key={item} className="workspace-card-muted px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}

export default async function DailyPage() {
  const daily = await getDailySnapshot(getDefaultUserId());

  return (
    <section className="space-y-4">
      <PageIntro
        eyebrow={BRAND_NAME}
        title={`${BRAND_SUBTITLE} diário`}
        description="Resumo operacional com prioridades, pendências, agenda, riscos e perguntas de continuidade para a rotina do time."
      />

      <SurfaceCard>
        <SectionLabel>Resumo do dia</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Panorama atual</h3>
        <p className="mt-3 text-sm leading-6 text-(--text-primary)">{daily.summary}</p>
      </SurfaceCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailySection title="Prioridades" items={daily.priorities} />
        <DailySection title="Pendencias" items={daily.pendings} />
        <DailySection title="Agenda" items={daily.agenda} />
        <DailySection title="Riscos" items={daily.risks} />
        <DailySection title="Sugestoes" items={daily.suggestions} />
        <DailySection title="Perguntas Inteligentes" items={daily.smartQuestions} />
      </div>
    </section>
  );
}
