"use client";

import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { useCentralPilotReadOnly } from "@/lib/use-central-pilot-read-only";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import {IconActionButton} from "@/components/ui/icon-action-button";
import {useConfirm} from "@/components/ui/confirm-dialog";

type ClientItem = {
  id: string;
  name: string;
  description: string;
  contact: string;
  status: "ativo" | "inativo";
  createdAt: string;
};

export default function ClientsPage() {
  const { readOnly, checking } = useCentralPilotReadOnly();
  const confirm=useConfirm();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState<"todos"|"ativo"|"inativo">("todos");
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    contact: "",
    status: "ativo" as "ativo" | "inativo",
  });

  async function loadClients() {
    setLoading(true);
    try {
      const response = await fetch("/api/clients", { headers: getClientAuthHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar clientes.");
      setClients((payload?.data ?? []) as ClientItem[]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar clientes.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  async function handleSave() {
    if (readOnly || checking || !form.name.trim() || saving) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const endpoint = editingId ? `/api/clients/${editingId}` : "/api/clients";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          contact: form.contact.trim(),
          status: form.status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao salvar cliente.");

      setForm({
        name: "",
        description: "",
        contact: "",
        status: "ativo",
      });
      setEditingId(null);
      setDrawerOpen(false);
      setStatusMessage(editingId ? "Cliente atualizado." : "Cliente criado.");
      await loadClients();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(client: ClientItem) {
    if (readOnly || checking) return;
    setEditingId(client.id);
    setDrawerOpen(true);
    setStatusMessage(null);
    setForm({
      name: client.name,
      description: client.description ?? "",
      contact: client.contact ?? "",
      status: client.status ?? "ativo",
    });
  }

  async function handleDelete(clientId: string) {
    if (readOnly || checking) return;
    const client=clients.find(item=>item.id===clientId);
    if(!client || !await confirm({title:`Excluir cliente "${client.name}"?`,description:"Esta ação remove o cadastro e pode ser bloqueada caso existam vínculos. Confirme apenas se realmente deseja excluí-lo.",confirmLabel:"Excluir cliente",tone:"danger"}))return;
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao remover cliente.");
      if (editingId === clientId) {
        setEditingId(null);
        setForm({
          name: "",
          description: "",
          contact: "",
          status: "ativo",
        });
      }
      setStatusMessage("Cliente removido.");
      await loadClients();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao remover cliente.");
    }
  }

  const filteredClients=clients.filter(client=>(statusFilter==="todos"||client.status===statusFilter)&&
    [client.name,client.contact,client.description].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  function openCreate(){
    setEditingId(null);
    setForm({name:"",description:"",contact:"",status:"ativo"});
    setStatusMessage(null);
    setDrawerOpen(true);
  }
  return (
    <section className="space-y-3">
      <PageIntro
        eyebrow="7Commander"
        title="Base de clientes"
        description="Cadastro, vínculo operacional e manutenção dos clientes conectados aos projetos do command center."
        aside={
          <>
            <StatusPill tone="accent">{clients.length} clientes</StatusPill>
            <StatusPill tone="success">
              {clients.filter((client) => client.status === "ativo").length} ativos
            </StatusPill>
          </>
        }
      />

      <div className="workspace-card flex flex-wrap items-center gap-3 p-4">
        <label className="flex-1 text-sm">Buscar cliente
          <input className="workspace-input mt-1 w-full" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Nome, contato ou descrição"/>
        </label>
        <label className="text-sm">Situação
          <select className="workspace-select mt-1 w-full" value={statusFilter}
            onChange={e=>setStatusFilter(e.target.value as "todos"|"ativo"|"inativo")}>
            <option value="todos">Todos</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option>
          </select>
        </label>
        {!readOnly&&!checking?<button type="button" className="workspace-button-primary mt-5" onClick={openCreate}>Adicionar cliente</button>:null}
      </div>
      {!checking && readOnly ? <p className="rounded-lg border border-(--border) p-3 text-sm" role="status">Acesso somente leitura: cadastro e manutenção de clientes indisponíveis para este perfil.</p> : null}
      {!readOnly && !checking && drawerOpen ? <div className="fixed inset-0 z-50">
        <button type="button" aria-label="Fechar editor de cliente" className="absolute inset-0 bg-black/35" onClick={()=>setDrawerOpen(false)}/>
        <aside className="relative ml-auto h-dvh w-full max-w-xl overflow-y-auto bg-(--bg-surface) p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label={editingId?"Editar cliente":"Criar cliente"}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId?"Editar cliente":"Adicionar cliente"}</h2><button className="workspace-button-secondary" onClick={()=>setDrawerOpen(false)}>Fechar</button></div>
        <SurfaceCard>
        <SectionLabel>
          {editingId ? "Editar cliente" : "Novo cliente"}
        </SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Dados cadastrais</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nome do cliente"
            className="workspace-input"
          />
          <input
            value={form.contact}
            onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            placeholder="Contato principal"
            className="workspace-input"
          />
        </div>
        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Descricao do cliente"
          className="workspace-textarea mt-2"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as "ativo" | "inativo" }))}
            className="workspace-select max-w-44"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="workspace-button-primary"
          >
            {saving ? "Salvando..." : editingId ? "Atualizar cliente" : "Criar cliente"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDrawerOpen(false);
                setForm({ name: "", description: "", contact: "", status: "ativo" });
              }}
              className="workspace-button-secondary"
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
        {statusMessage ? <p className="mt-2 text-xs text-(--text-primary)">{statusMessage}</p> : null}
        </SurfaceCard>
        </aside>
      </div> : null}
      {readOnly && statusMessage ? <p role="alert" className="text-sm">{statusMessage}</p> : null}

      {statusMessage&&!drawerOpen?<p role="status" className="workspace-card p-3 text-sm">{statusMessage}</p>:null}
      <SurfaceCard>
        <SectionLabel>Carteira de clientes</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Clientes registrados</h3>
        {loading ? (
          <p className="mt-2 text-sm text-(--text-secondary)">Carregando...</p>
        ) : filteredClients.length === 0 ? (
          <p className="workspace-empty-state mt-3 text-sm">Nenhum cliente encontrado para os filtros selecionados.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="workspace-card-muted grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-(--text-primary)">{client.name}</p>
                  <p className="text-xs text-(--text-secondary)">Contato: {client.contact || "Nao informado"}</p>
                  <p className="text-xs text-(--text-secondary)">Status: {client.status}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-(--text-secondary)" title={client.description||undefined}>
                    {client.description || "Sem descrição."}
                  </p>
                </div>
                {!readOnly && !checking ? <div className="flex shrink-0 items-center gap-2">
                  <IconActionButton icon="pencil" tone="edit" label={"Editar "+client.name}
                    onClick={()=>handleEdit(client)}/>
                  <IconActionButton icon="trash" tone="danger" label={"Excluir "+client.name}
                    onClick={()=>void handleDelete(client.id)}/>
                </div> : null}
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </section>
  );
}
