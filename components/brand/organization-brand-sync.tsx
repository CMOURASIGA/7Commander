"use client";
import { useEffect } from "react";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { applyClientBrandSettings, CLIENT_BRAND_STORAGE_KEY, DEFAULT_CLIENT_BRAND, type ClientBrandSettings } from "@/lib/brand-settings";

function publishBrand(brand: ClientBrandSettings) {
  // The API confirms the active tenant. Browser storage only caches styling.
  const serialized=JSON.stringify(brand);
  const previous=window.localStorage.getItem(CLIENT_BRAND_STORAGE_KEY);
  applyClientBrandSettings(brand);
  if(previous===serialized)return;
  window.localStorage.setItem(CLIENT_BRAND_STORAGE_KEY,serialized);
  window.dispatchEvent(new CustomEvent("client-brand-updated", { detail: brand }));
}

export function OrganizationBrandSync() {
  const auth = useKairosAuth();
  useEffect(() => {
    if (auth.loading) return;
    let alive = true;
    async function load() {
      if (!auth.user) {
        publishBrand(DEFAULT_CLIENT_BRAND);
        return;
      }
      try {
        const response=await fetch("/api/organizations/branding",{headers:getClientAuthHeaders(),cache:"no-store"});
        if(!response.ok)throw new Error("Sem branding ativo");
        const payload=await response.json();
        const data=payload.data as {name?:string;branding?:{displayName?:string;primaryColor?:string;secondaryColor?:string;logoUrl?:string}};
        if(!alive)return;
        const b=data.branding;
        const color=(value:unknown,fallback:string) => typeof value==="string" && /^#[0-9a-fA-F]{6}$/.test(value)?value:fallback;
        const isConsult = data.name?.trim().toLowerCase().includes("consult services");
        const logo=typeof b?.logoUrl==="string" && (b.logoUrl.startsWith("https://") || /^data:image\/(png|jpeg|webp);base64,/.test(b.logoUrl))?b.logoUrl:DEFAULT_CLIENT_BRAND.logoUrl;
        // A identidade institucional da Consult Services é imutável no workspace proprietário.
        if(isConsult){publishBrand(DEFAULT_CLIENT_BRAND);return;}
        publishBrand({clientName:b?.displayName||data.name||DEFAULT_CLIENT_BRAND.clientName,logoUrl:logo,primaryColor:color(b?.primaryColor,DEFAULT_CLIENT_BRAND.primaryColor),highlightColor:color(b?.secondaryColor,DEFAULT_CLIENT_BRAND.highlightColor)});
      }catch {
        // Transient network or session failures must not erase a verified tenant's
        // brand. Only signing out resets the local visual cache.
      }
    }
    void load();
    const onChange=()=>void load();
    window.addEventListener("7commander:organization-selected",onChange);
    return ()=>{alive=false;window.removeEventListener("7commander:organization-selected",onChange);};
  },[auth.loading,auth.user?.id]);
  return null;
}
