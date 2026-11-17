"use client";
import {useEffect,useState} from "react";
import {getClientAuthHeaders} from "@/lib/client-auth";

type Diagnostic = Record<string,unknown>;
export default function LocalDiagnosticsPage(){
  const [result,setResult]=useState<Diagnostic|null>(null);
  const [loading,setLoading]=useState(true);
  async function inspect(){
    setLoading(true);
    try{
      const res=await fetch("/api/local-diagnostics",{
        headers:getClientAuthHeaders(),cache:"no-store",credentials:"same-origin",
      });
      const data=await res.json().catch(()=>({error:"Resposta inválida"}));
      setResult({httpStatus:res.status,...data});
    }catch(error){
      setResult({error:error instanceof Error?error.message:"Falha na consulta"});
    }finally{setLoading(false)}
  }
  useEffect(()=>{void inspect()},[]);
  return <main className="mx-auto max-w-3xl space-y-4 p-6">
    <h1 className="text-xl font-semibold">Diagnóstico local de leitura</h1>
    <p className="text-sm text-(--text-secondary)">
      Consulta apenas metadados e contagens autorizadas. Nenhum registro é alterado.
      Não copie tokens ou informações da aba de cabeçalhos de rede.
    </p>
    <button type="button" className="rounded-lg border border-(--border) px-4 py-2" onClick={()=>void inspect()}>
      Verificar novamente
    </button>
    {loading?<p>Consultando...</p>:<pre className="overflow-x-auto rounded-lg border border-(--border) p-4 text-sm whitespace-pre-wrap">
      {JSON.stringify(result,null,2)}
    </pre>}
  </main>;
}
