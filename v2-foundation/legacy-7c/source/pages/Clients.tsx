import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Client } from '../types';
import { ClientForm } from '../components/ClientForm';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { SideDrawer } from '../components/SideDrawer';
import { useFeedback } from '../components/FeedbackProvider';
import { backendApi } from '../services/backendApi';

export const Clients: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const feedback = useFeedback();
  const clients = useWorkspaceStore((state) => state.clients);
  const projects = useWorkspaceStore((state) => state.projects);
  const dataSource = useWorkspaceStore((state) => state.dataSource);
  const syncFromApi = useWorkspaceStore((state) => state.syncFromApi);
  const createClient = useWorkspaceStore((state) => state.createClient);
  const updateClient = useWorkspaceStore((state) => state.updateClient);
  const deleteClient = useWorkspaceStore((state) => state.deleteClient);

  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const filtered = useMemo(() => {
    const value = search.toLowerCase();
    return clients.filter((client) => client.name.toLowerCase().includes(value));
  }, [clients, search]);

  const submit = async (values: { name: string; description?: string; owner?: string; notes?: string }) => {
    const actor = user?.email || 'local.admin@7c.local';
    setDeleteError(null);
    try {
      if (editing) {
        if (dataSource === 'api') {
          await backendApi.updateClient(editing.id, {
            name: values.name,
            description: values.description,
            owner: values.owner,
            notes: values.notes,
          });
          await syncFromApi();
        } else {
          updateClient(editing.id, values, actor);
        }
        feedback.success('Cliente atualizado com sucesso.');
        setEditing(null);
      } else {
        if (dataSource === 'api') {
          await backendApi.createClient({
            name: values.name,
            description: values.description,
            owner: values.owner,
            notes: values.notes,
          });
          await syncFromApi();
        } else {
          createClient(values, actor);
        }
        feedback.success('Cliente criado com sucesso.');
      }
      setOpenForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel salvar o cliente.';
      feedback.error(message);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    const actor = user?.email || 'local.admin@7c.local';
    const approved = await feedback.confirm({
      title: 'Excluir cliente',
      message: `Deseja excluir o cliente "${client.name}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      destructive: true,
    });
    if (!approved) return;

    setDeletingId(client.id);
    try {
      if (dataSource === 'api') {
        await backendApi.deleteClient(client.id);
        await syncFromApi();
      } else {
        const result = deleteClient(client.id, actor);
        if (!result.ok) {
          setDeleteError(result.reason || 'Nao foi possivel excluir o cliente.');
          feedback.warning(result.reason || 'Nao foi possivel excluir o cliente.');
          return;
        }
      }
      setDeleteError(null);
      feedback.success('Cliente excluido com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel excluir o cliente.';
      setDeleteError(message);
      feedback.warning(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Clientes</p>
          <h1 className="text-3xl font-black">Gestao de clientes</h1>
        </div>
        <button
          data-testid="clients-new-button"
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <Plus size={15} /> Novo cliente
        </button>
      </header>

      {deleteError && (
        <div
          data-testid="clients-delete-error-banner"
          className={`rounded-2xl border p-3 text-sm ${
            theme === 'light'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-amber-900/50 bg-amber-950/40 text-amber-200'
          }`}
        >
          {deleteError}
        </div>
      )}

      <SideDrawer
        open={openForm}
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        subtitle="Preencha os dados e salve para atualizar a base de clientes."
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
      >
        <ClientForm
          presentation="drawer"
          initialClient={editing}
          onCancel={() => {
            setOpenForm(false);
            setEditing(null);
          }}
          onSubmit={submit}
        />
      </SideDrawer>

      <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <Search size={15} className="text-slate-400" />
        <input
          data-testid="clients-search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar cliente..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`h-44 animate-pulse rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((client) => {
          const projectCount = projects.filter((project) => project.clientId === client.id).length;
          return (
            <article data-testid="client-card" key={client.id} className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{client.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{client.description || 'Sem descricao'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    title="Visualizar cliente"
                    aria-label="Visualizar cliente"
                    data-testid="client-view-button"
                    onClick={() => setViewing(client)}
                    className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    title="Editar cliente"
                    aria-label="Editar cliente"
                    data-testid="client-edit-button"
                    onClick={() => {
                      setEditing(client);
                      setOpenForm(true);
                    }}
                    className="rounded-lg border border-slate-300/70 p-2 text-slate-500 hover:text-brand-500 dark:border-slate-700"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    title="Excluir cliente"
                    aria-label="Excluir cliente"
                    data-testid="client-delete-button"
                    disabled={deletingId === client.id}
                    onClick={() => handleDeleteClient(client)}
                    className="rounded-lg border border-red-200/70 p-2 text-red-500 hover:text-red-600 disabled:opacity-50 dark:border-red-900/40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                  <p className="font-semibold text-slate-500">Responsavel</p>
                  <p>{client.owner || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-2 dark:border-slate-700">
                  <p className="font-semibold text-slate-500">Projetos</p>
                  <p>{projectCount}</p>
                </div>
              </div>

              {client.notes && <p className="mt-3 text-xs text-slate-500">Observacoes: {client.notes}</p>}
            </article>
          );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className={`rounded-2xl border p-6 text-center text-sm ${theme === 'light' ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>
          Nenhum cliente encontrado.
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Cliente</p>
                <h3 className="mt-1 text-xl font-black">{viewing.name}</h3>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="rounded-lg border border-slate-300/70 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Descricao</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.description || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Responsavel</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.owner || '-'}</p>
              </div>
              <div className={`rounded-xl border p-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Observacoes</p>
                <p className={theme === 'light' ? 'text-slate-800' : 'text-slate-100'}>{viewing.notes || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
