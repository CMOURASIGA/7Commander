"use client";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DemoResetCard() {
  const confirm = useConfirm();
  if (process.env.NEXT_PUBLIC_COMMANDER_DEMO_MODE !== "true") return null;
  return <section className="workspace-card p-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-(--accent)">Ambiente demonstrativo</p>
    <h3 className="mt-2 text-base font-semibold">Restaurar massa de dados</h3>
    <p className="mt-2 text-sm text-(--text-secondary)">Remove somente as alterações feitas neste navegador e recria os dados fictícios originais.</p>
    <button type="button" className="workspace-button-secondary mt-4" onClick={async()=>{
      const accepted=await confirm({title:"Restaurar demonstração?",description:"Inclusões, edições e exclusões locais serão desfeitas.",confirmLabel:"Restaurar dados",tone:"danger"});
      if(accepted)window.dispatchEvent(new Event("commander-demo-reset"));
    }}>Restaurar dados originais</button>
  </section>;
}
