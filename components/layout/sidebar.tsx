"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { BrandLockup } from "@/components/brand/brand-lockup";

const NAV_ITEMS = [
  { section: "Principal", href: "/", label: "Inicio" },
  { section: "Principal", href: "/voice", label: "Voice Room" },
  { section: "Principal", href: "/chat", label: "Dashboard Kairos" },
  { section: "Principal", href: "/daily", label: "Daily" },
  { section: "Dados", href: "/clients", label: "Clientes" },
  { section: "Dados", href: "/projects", label: "Projetos" },
  { section: "Dados", href: "/activities", label: "Atividades" },
  { section: "Dados", href: "/memory", label: "Memoria" },
  { section: "Sistema", href: "/help", label: "Ajuda" },
  { section: "Sistema", href: "/settings", label: "Configuracoes" },
];

export function Sidebar() {
  const pathname = usePathname();
  const auth = useKairosAuth();
  const userEmail = auth.user?.email ?? "sem e-mail de sessao";
  const sections = Array.from(new Set(NAV_ITEMS.map((item) => item.section)));

  return (
    <aside className="relative w-full overflow-hidden border-b border-white/15 bg-(--sidebar) px-3 py-4 md:h-screen md:w-[250px] md:border-b-0 md:border-r md:px-4 md:py-5">
      <div className="absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(circle_at_95%_15%,rgba(0,174,239,0.28),transparent_2px),linear-gradient(135deg,transparent_0%,transparent_64%,rgba(0,174,239,0.18)_64%,transparent_65%)] opacity-70" />
      <div className="relative border-b border-white/15 px-1 pb-4">
        <BrandLockup subtitle="Workspace operacional" description={userEmail} size="sm" tone="light" />
      </div>

      <nav className="relative mt-5 flex flex-wrap gap-4 md:flex-col md:gap-5">
        {sections.map((section) => (
          <div key={section}>
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.1em] text-white/55">
              {section}
            </p>
            <div className="flex flex-wrap gap-2 md:flex-col">
              {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
                const isActive =
                  item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "rounded-lg px-3 py-[9px] text-sm font-medium transition-colors",
                      isActive
                        ? "bg-(--brand-highlight) text-(--sidebar-deep) shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
