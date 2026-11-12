"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { CLIENT_BRAND_STORAGE_KEY, getClientBrandSettings, type ClientBrandSettings } from "@/lib/brand-settings";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";

const NAV_ITEMS = [
  { section: "Principal", href: "/", label: "Início", icon: "home" as const, level: 0 },
  { section: "Dados", href: "/clients", label: "Clientes", icon: "clients" as const, level: 0 },
  { section: "Dados", href: "/planning", label: "Prospect", icon: "planning" as const, level: 0 },
  { section: "Dados", href: "/projects", label: "Projetos", icon: "projects" as const, level: 0 },
  { section: "Dados", href: "/activities", label: "Atividades", icon: "activities" as const, level: 1 },
  { section: "Operacional", href: "/scrum", label: "Scrum e Sprints", icon: "planning" as const, level: 0 },
  { section: "Operacional", href: "/scrum/backlog", label: "Backlog de US", icon: "activities" as const, level: 1 },
  { section: "Operacional", href: "/scrum/kanban", label: "Kanban de US", icon: "daily" as const, level: 1 },
  { section: "Operacional", href: "/daily", label: "Daily", icon: "daily" as const, level: 0 },
  { section: "Sistema", href: "/decisions", label: "Decisões dos projetos", icon: "planning" as const, level: 0 },
  { section: "Sistema", href: "/operational-decisions", label: "Avaliações operacionais", icon: "planning" as const, level: 0 },
  { section: "Sistema", href: "/memory", label: "Memória", icon: "memory" as const, level: 0 },
  { section: "Sistema", href: "/help", label: "Ajuda", icon: "help" as const, level: 0 },
  { section: "Sistema", href: "/settings", label: "Configurações", icon: "settings" as const, level: 0 },
];
type IconName = (typeof NAV_ITEMS)[number]["icon"];
const ICON_PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />,
  daily: <><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 10h16" /><path d="M8 3.5v3M16 3.5v3" /></>,
  clients: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 6" /><path d="M15 14.2c2.9.4 4.9 2.4 5.5 5.8" /></>,
  projects: <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />,
  planning: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h7M7 17h5" /></>,
  activities: <><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="m3 6 1 1 2-2" /><path d="m3 12 1 1 2-2" /><path d="m3 18 1 1 2-2" /></>,
  memory: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" /><path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.4.9-1.4 2v.3" /><path d="M12 17h.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10c.4.3.9.5 1.6.5H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1Z" /></>,
};
function NavIcon({ name }: { name: IconName }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">{ICON_PATHS[name]}</svg>; }

type SidebarProps = { isMobileOpen: boolean; onCloseMobile: () => void; expanded: boolean; onToggleExpanded: () => void };
export function Sidebar({ isMobileOpen, onCloseMobile, expanded, onToggleExpanded }: SidebarProps) {
  const pathname = usePathname();
  const {user}=useKairosAuth();
  const [clientBrand, setClientBrand] = useState<ClientBrandSettings|null>(null);
  const sections = Array.from(new Set(NAV_ITEMS.map((item) => item.section)));
  useEffect(()=>{
    if(!user){setClientBrand(null);return;}
    const update=()=>setClientBrand(getClientBrandSettings());
    update();
    const onStorage=(event:StorageEvent)=>{if(event.key===CLIENT_BRAND_STORAGE_KEY)update();};
    window.addEventListener("client-brand-updated",update);
    window.addEventListener("storage",onStorage);
    return()=>{window.removeEventListener("client-brand-updated",update);window.removeEventListener("storage",onStorage);};
  },[user?.id]);
  return <>
    {isMobileOpen ? <button type="button" aria-label="Fechar menu" className="sidebar-backdrop" onClick={onCloseMobile} /> : null}
    <aside id="commander-sidebar" aria-label="Navegação principal" className={["sidebar-shell commander-adaptive-sidebar overflow-y-auto md:min-h-screen md:self-stretch", expanded ? "commander-sidebar-expanded" : "commander-sidebar-compact", isMobileOpen ? "is-open" : ""].join(" ")}>
      <div className="commander-sidebar-brand">
        <div className="commander-sidebar-logo-frame" title={clientBrand?.clientName || BRAND_NAME}>
          {clientBrand?.logoUrl
            ? <img src={clientBrand.logoUrl} alt={clientBrand.clientName} className="commander-sidebar-logo" />
            : <span className="commander-sidebar-logo-fallback">{(clientBrand?.clientName || "7C").slice(0,2).toUpperCase()}</span>}
        </div>
        <div className="commander-sidebar-brand-copy">
          <p className="sidebar-product-name">{BRAND_NAME}</p>
          <p className="sidebar-product-subtitle">{BRAND_SUBTITLE}</p>
        </div>
        <button type="button" onClick={onCloseMobile} className="sidebar-close absolute right-3 top-3 md:hidden" aria-label="Fechar menu">×</button>
      </div>
      <button type="button" className="commander-sidebar-resize" onClick={onToggleExpanded}
        aria-label={expanded ? "Recolher menu lateral" : "Expandir menu lateral"}
        title={expanded ? "Recolher menu" : "Expandir menu"}
        aria-expanded={expanded} aria-controls="commander-sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          {expanded ? <path d="m15 6-6 6 6 6"/> : <path d="m9 6 6 6-6 6"/>}
        </svg>
      </button>
      <nav className="commander-sidebar-nav" aria-label="Rotinas">
        {sections.map(section=><div className="commander-sidebar-section" key={section}>
          <p className="commander-sidebar-section-label">{section}</p>
          <div className="commander-sidebar-links">
          {NAV_ITEMS.filter(item=>item.section===section).map(item=>{
            const isActive=item.href==="/"||item.href==="/scrum" ? pathname===item.href : pathname===item.href || pathname.startsWith(item.href+"/");
            return <Link key={item.href} href={item.href} title={item.label}
              aria-label={item.label} aria-current={isActive?"page":undefined}
              onClick={onCloseMobile}
              className={["sidebar-nav-link commander-sidebar-link",isActive?"sidebar-nav-link-active":"",item.level===1?"commander-sidebar-child":""].join(" ")}>
              <NavIcon name={item.icon}/>
              <span className="commander-sidebar-expanded-content">{item.label}</span>
            </Link>;
          })}
          </div>
        </div>)}
      </nav>
    </aside>
  </>;
}
