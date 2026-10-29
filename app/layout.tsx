import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { KairosAuthProvider } from "@/components/auth/kairos-auth-provider";
import { OrganizationBrandSync } from "@/components/brand/organization-brand-sync";
import { KairosPanelProvider } from "@/components/kairos/kairos-context";
import { KairosCoreProvider } from "@/components/kairos/kairos-core-context";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { isAuthRequired } from "@/lib/env";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Preview de homologação usa a mesma autenticação real exigida pelas APIs.
  // Uma interface sem sessão não pode validar operações com Supabase.
  const authRequired = process.env.VERCEL_ENV === "preview" ? true : isAuthRequired();

  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <KairosAuthProvider required={authRequired}>
              <OrganizationBrandSync />
              <KairosCoreProvider>
                <KairosPanelProvider>
                  <AppShell>{children}</AppShell>
                </KairosPanelProvider>
              </KairosCoreProvider>
            </KairosAuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
