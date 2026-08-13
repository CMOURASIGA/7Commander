"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_LOGO_URL, BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { DEFAULT_CLIENT_BRAND, getClientBrandSettings, ClientBrandSettings } from "@/lib/brand-settings";
import { resetDemoData } from "@/lib/demo-store";

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
  const [clientBrand, setClientBrand] = useState<ClientBrandSettings>(DEFAULT_CLIENT_BRAND);
  const sections = Array.from(new Set(NAV_ITEMS.map((item) => item.section)));
  const isConsultServicesBrand = clientBrand.logoUrl === DEFAULT_CLIENT_BRAND.logoUrl;

  useEffect(() => {
    const refreshBrand = () => setClientBrand(getClientBrandSettings());
    refreshBrand();
    window.addEventListener("client-brand-updated", refreshBrand);
    return () => window.removeEventListener("client-brand-updated", refreshBrand);
  }, []);

  return (
    <aside className="sidebar-shell relative w-full overflow-hidden border-b border-white/15 md:min-h-screen md:w-[250px] md:self-stretch md:border-b-0 md:border-r">
      <div className="absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(circle_at_95%_15%,rgba(0,174,239,0.28),transparent_2px),linear-gradient(135deg,transparent_0%,transparent_64%,rgba(0,174,239,0.18)_64%,transparent_65%)] opacity-70" />
      <div className="sidebar-brand-panel relative">
        <div className={`sidebar-brand-logo-frame${isConsultServicesBrand ? " sidebar-brand-logo-frame-consult" : ""}`}>
          <img src={clientBrand.logoUrl || BRAND_LOGO_URL} alt={clientBrand.clientName || "Consult Services Tecnologia"} className={`sidebar-brand-logo${isConsultServicesBrand ? " sidebar-brand-logo-consult" : ""}`} />
        </div>
      </div>
      <div className="sidebar-product relative">
        <p className="sidebar-product-name">{BRAND_NAME}</p>
        <p className="sidebar-product-subtitle">{BRAND_SUBTITLE}</p>
        <p className="sidebar-product-owner">Uma plataforma Consult Services Tecnologia</p>
        <div className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">Modo demonstração</p>
          <p className="mt-1 text-[11px] leading-4 text-white/70">Dados fictícios salvos somente neste navegador.</p>
          <button type="button" onClick={resetDemoData} className="mt-2 text-[11px] font-semibold text-cyan-100 underline underline-offset-2">Restaurar dados iniciais</button>
        </div>
      </div>

      <nav className="relative mt-5 flex flex-wrap gap-4 px-3 pb-5 md:flex-col md:gap-5 md:px-3">
        {sections.map((section) => (
          <div key={section}>
            <p className="sidebar-section-label mb-2 px-2">
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
                      "sidebar-nav-link rounded-lg px-3 py-[9px] text-sm font-medium transition-colors",
                      isActive
                        ? "sidebar-nav-link-active shadow-sm"
                        : "",
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
