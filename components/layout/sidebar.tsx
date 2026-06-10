"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { BrandLockup } from "@/components/brand/brand-lockup";

const NAV_ITEMS = [
  { section: "Principal", href: "/", label: "Inicio" },
  { section: "Principal", href: "/voice", label: "Voice Room" },
  { section: "Principal", href: "/chat", label: "Dashboard IA" },
  { section: "Principal", href: "/daily", label: "Daily" },
  { section: "Dados", href: "/clients", label: "Clientes" },
  { section: "Dados", href: "/projects", label: "Projetos" },
  { section: "Dados", href: "/activities", label: "Atividades" },
  { section: "Dados", href: "/memory", label: "Memoria" },
  { section: "Sistema", href: "/settings", label: "Configuracoes" },
];

export function Sidebar() {
  const pathname = usePathname();
  const auth = useKairosAuth();
  const userEmail = auth.user?.email ?? "sem e-mail de sessao";
  const sections = Array.from(new Set(NAV_ITEMS.map((item) => item.section)));

  return (
    <aside className="w-full border-b border-(--border) bg-(--bg-muted) px-3 py-4 md:h-screen md:w-[220px] md:border-b-0 md:border-r md:px-3 md:py-4">
      <div className="border-b border-(--border) px-1 pb-4">
        <BrandLockup subtitle="Workspace operacional" description={userEmail} size="sm" />
      </div>

      <nav className="mt-4 flex flex-wrap gap-4 md:flex-col md:gap-5">
        {sections.map((section) => (
          <div key={section}>
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.06em] text-(--text-tertiary)">
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
                        ? "bg-(--accent-soft) text-(--accent-strong)"
                        : "text-(--text-secondary) hover:bg-white hover:text-(--text-primary)",
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
