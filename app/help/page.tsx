import Link from "next/link";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";

const primeirosPassos = [
  { title: "Escolha sua empresa", text: "Se você participa de mais de uma empresa, selecione aquela em que vai trabalhar. Cada uma tem seus próprios clientes, projetos e atividades.", href: "/organizations", action: "Selecionar empresa" },
  { title: "Cadastre um cliente", text: "Registre quem será atendido. Isso ajuda a organizar os projetos e acompanhar o trabalho realizado.", href: "/clients", action: "Ver clientes" },
  { title: "Crie um projeto", text: "Dê um nome ao trabalho, descreva o objetivo e selecione o cliente. Depois abra o projeto para acompanhar sua execução.", href: "/projects", action: "Ver projetos" },
  { title: "Organize as atividades", text: "Crie tarefas, defina responsáveis e acompanhe o andamento pelo quadro de atividades do projeto.", href: "/activities", action: "Ver atividades" },
];

const rotinas = [
  { title: "Início", href: "/", question: "Como sei o que precisa de atenção?", answer: "Confira os projetos ativos, os riscos e os avisos. Abra o projeto que precisa de acompanhamento." },
  { title: "Planejamento", href: "/planning", question: "Como organizar uma ideia antes de executar?", answer: "Registre a oportunidade, reúna as necessidades e revise as decisões. Um projeto não é criado automaticamente ao avançar pelas etapas." },
  { title: "Projetos", href: "/projects", question: "Onde acompanho um trabalho?", answer: "Escolha o projeto para ver seu andamento, as atividades, decisões, riscos e pessoas envolvidas." },
  { title: "Atividades", href: "/activities", question: "Como acompanho o que está sendo feito?", answer: "Veja o que ainda precisa começar, o que está em andamento e o que foi concluído. Atualize o responsável e a etapa de cada tarefa." },
  { title: "Clientes", href: "/clients", question: "Onde consulto as informações dos clientes?", answer: "Cadastre e atualize os clientes para manter seus projetos organizados." },
  { title: "Daily", href: "/daily", question: "Como preparo meu acompanhamento diário?", answer: "Revise as prioridades, as pendências e os riscos antes de conversar com a equipe." },
  { title: "Kairos e conversa por voz", href: "/chat", question: "Como posso pedir ajuda para analisar um projeto?", answer: "Abra um projeto e descreva sua dúvida ao Kairos. Revise as sugestões antes de transformar qualquer orientação em uma ação." },
  { title: "Memória", href: "/memory", question: "Onde encontro informações registradas?", answer: "Consulte os registros salvos para recuperar o contexto de trabalhos anteriores da empresa selecionada." },
  { title: "Trocar de empresa", href: "/organizations", question: "Como trabalhar em outra empresa?", answer: "Abra Selecionar empresa e escolha a organização desejada. Confira o nome da empresa ativa no topo da tela." },
];

export default function HelpPage() {
  return (
    <main className="space-y-6">
      <PageIntro eyebrow="CENTRAL DE AJUDA" title="Como usar o 7Commander" description="Um guia simples para organizar clientes, planejar projetos e acompanhar o trabalho da sua equipe." />
      <SurfaceCard className="p-5">
        <h2 className="text-xl font-semibold text-(--text-primary)">Está começando? Siga este caminho</h2>
        <p className="mt-2 text-sm text-(--text-secondary)">Você não precisa aprender tudo de uma vez. Comece com estas quatro ações.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {primeirosPassos.map((step,index)=>(
            <div key={step.title} className="rounded-xl border border-(--border) p-4">
              <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--accent) font-semibold text-white">{index+1}</span><h3 className="font-semibold">{step.title}</h3></div>
              <p className="mt-3 text-sm leading-6 text-(--text-secondary)">{step.text}</p>
              <Link href={step.href} className="mt-3 inline-block text-sm font-semibold underline">{step.action}</Link>
            </div>
          ))}
        </div>
      </SurfaceCard>
      <section>
        <h2 className="text-xl font-semibold text-(--text-primary)">Encontre o que você precisa fazer</h2>
        <p className="mt-2 text-sm text-(--text-secondary)">Escolha uma dúvida para conhecer a função e acessar a tela correspondente.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rotinas.map(item=>(
            <SurfaceCard className="p-5" key={item.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-(--accent)">{item.title}</p>
              <h3 className="mt-2 font-semibold text-(--text-primary)">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-(--text-secondary)">{item.answer}</p>
              <Link href={item.href} className="mt-3 inline-block text-sm font-semibold underline">Abrir {item.title}</Link>
            </SurfaceCard>
          ))}
        </div>
      </section>
      <SurfaceCard className="p-5">
        <h2 className="font-semibold">Uma orientação importante</h2>
        <p className="mt-2 text-sm leading-6 text-(--text-secondary)">Antes de salvar uma alteração, confira se você está na empresa e no projeto corretos. A troca de empresa não apaga nem transfere os registros da outra organização.</p>
      </SurfaceCard>
    </main>
  );
}
