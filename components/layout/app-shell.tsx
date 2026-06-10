"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const auth = useKairosAuth();
  const pathname = usePathname();
  const canBypassAuth =
    pathname === "/login" || pathname.startsWith("/auth/callback");
  const mustWaitForAuth = auth.required && auth.loading && !canBypassAuth;
  const mustBlock = auth.required && !auth.loading && !auth.user && !canBypassAuth;

  if (mustWaitForAuth) {
    return (
      <div className="min-h-screen bg-(--bg-page) md:flex">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 p-5 md:p-7">
            <section className="rounded-[1.6rem] border border-(--border) bg-(--bg-surface) p-6 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">
                Autenticacao
              </p>
              <h2 className="mt-2 text-xl font-semibold text-(--text-primary)">Validando sessao</h2>
              <p className="mt-2 text-sm text-(--text-secondary)">
                Aguarde enquanto o Kairos confirma o acesso antes de carregar o workspace.
              </p>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (mustBlock) {
    return (
      <div className="min-h-screen bg-(--bg-page) md:flex">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 p-5 md:p-7">
            <section className="rounded-[1.6rem] border border-(--border) bg-(--bg-surface) p-6 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">
                Acesso protegido
              </p>
              <h2 className="mt-2 text-xl font-semibold text-(--text-primary)">Login obrigatorio</h2>
              <p className="mt-2 text-sm text-(--text-secondary)">
                Entre com Google para acessar o workspace operacional do 7C Commander.
              </p>
              <a
                href="/login"
                className="mt-4 inline-block rounded-xl bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-contrast)"
              >
                Ir para login
              </a>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-page) md:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
