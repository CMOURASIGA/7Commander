"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { KairosLauncher } from "@/components/kairos/kairos-launcher";
import { KairosPanel } from "@/components/kairos/kairos-panel";
import { TaskAlerts } from "@/components/notifications/task-alerts";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const auth = useKairosAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [companyContextChanged,setCompanyContextChanged]=useState(false);
  const canBypassAuth =
    pathname === "/login" || pathname.startsWith("/auth/callback");
  const mustWaitForAuth = auth.required && auth.loading && !canBypassAuth;
  const mustBlock = auth.required && !auth.loading && !auth.user && !canBypassAuth;

  useEffect(() => {
    if (!mustBlock) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [mustBlock, pathname, router]);

  // The operational tenant is server-side and shared across tabs.
  // Fail closed after a switch elsewhere: never silently reprocess the old
  // tab under the newly selected company. Full independent tenant contexts
  // require explicit per-request tenant authorization in every API.
  useEffect(()=>{
    const onStorage=(event:StorageEvent)=>{
      if(event.key==="7commander:company-changed")setCompanyContextChanged(true);
    };
    window.addEventListener("storage",onStorage);
    return()=>window.removeEventListener("storage",onStorage);
  },[]);

  // Fecha a gaveta mobile automaticamente ao trocar de rota.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (canBypassAuth) {
    return (
      <div className="min-h-screen bg-(--bg-page)">
        <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 md:px-6">
          {children}
        </main>
      </div>
    );
  }

  if(companyContextChanged && !canBypassAuth){
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <section role="alert" className="rounded-xl border border-(--border) bg-(--bg-surface) p-6">
          <h1 className="text-lg font-semibold">Empresa alterada em outra aba</h1>
          <p className="mt-3 text-sm text-(--text-secondary)">O Commander utiliza atualmente um contexto operacional de empresa por sessão. Esta aba foi bloqueada para impedir operações com a empresa incorreta. A navegação independente entre empresas ainda requer isolamento por requisição.</p>
          <button type="button" className="workspace-button-primary mt-4" onClick={()=>window.location.reload()}>Atualizar para a empresa ativa</button>
        </section>
      </main>
    );
  }

  if (mustWaitForAuth) {
    return (
      <div className="min-h-screen bg-(--bg-page)">
        <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 md:px-6">
          <section className="w-full max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">
              Autenticacao
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-(--text-primary)">Validando sessao</h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              Aguarde enquanto o Kairos confirma o acesso antes de liberar o workspace.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (mustBlock) {
    return (
      <div className="min-h-screen bg-(--bg-page)">
        <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 md:px-6">
          <section className="w-full max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">
              Acesso protegido
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-(--text-primary)">Redirecionando para login</h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              O workspace requer autenticacao antes de carregar os modulos operacionais.
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-page) md:flex md:items-stretch">
      <Sidebar isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)} mobileNavOpen={mobileNavOpen} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-5">{pathname === "/" && <TaskAlerts center />}{children}</main>
      </div>
      <KairosLauncher />
      <KairosPanel />
    </div>
  );
}
