import React, { useState } from 'react';
import { Client } from '../types';
import { useThemeStore } from '../store/useThemeStore';

interface ClientFormProps {
  initialClient?: Client | null;
  onCancel: () => void;
  presentation?: 'inline' | 'drawer';
  onSubmit: (values: {
    name: string;
    description?: string;
    owner?: string;
    notes?: string;
  }) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialClient, onCancel, onSubmit, presentation = 'inline' }) => {
  const theme = useThemeStore((state) => state.theme);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(initialClient?.name || '');
  const [description, setDescription] = useState(initialClient?.description || '');
  const [owner, setOwner] = useState(initialClient?.owner || '');
  const [notes, setNotes] = useState(initialClient?.notes || '');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit({
          name,
          description,
          owner,
          notes,
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      data-testid="client-form"
      onSubmit={submit}
      className={`${
        presentation === 'inline'
          ? `rounded-3xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`
          : 'space-y-4'
      }`}
    >
      {presentation === 'inline' && <h3 className="mb-4 text-lg font-black">{initialClient ? 'Editar cliente' : 'Novo cliente'}</h3>}

      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm">
          Nome
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>

        <label className="text-sm">
          Descricao
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 h-20 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>

        <label className="text-sm">
          Responsavel
          <input value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>

        <label className="text-sm">
          Observacoes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 h-16 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button data-testid="client-form-cancel" type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Cancelar</button>
        <button data-testid="client-form-submit" type="submit" disabled={submitting} className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Salvando...' : 'Salvar cliente'}
        </button>
      </div>
    </form>
  );
};
