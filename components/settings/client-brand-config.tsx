"use client";
import Link from "next/link";
import { SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";

export function ClientBrandConfig() {
  return <SurfaceCard>
    <SectionLabel>White label por empresa</SectionLabel>
    <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Identidade visual corporativa</h3>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-secondary)">
      A marca é administrada por empresa e persistida no Supabase. Para trocar logotipo, nome ou cores, use a área de superadmin.
      Uma preferência local deste navegador não substitui a marca oficial do cliente.
    </p>
    <Link href="/platform/companies" className="workspace-button-primary mt-4 inline-flex">Administrar marcas e empresas</Link>
    <p className="mt-2 text-xs text-(--text-secondary)">O acesso à área administrativa exige o papel de superadmin. A troca operacional de empresas permanece bloqueada até a homologação do isolamento multiempresa.</p>
  </SurfaceCard>;
}
