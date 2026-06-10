import React, { useMemo, useRef, useState } from 'react';
import { Client, Project, ProjectHealth } from '../types';
import { useThemeStore } from '../store/useThemeStore';
import { CalendarDays } from 'lucide-react';

interface ProjectFormValues {
  name: string;
  objective: string;
  description: string;
  clientId: string;
  responsible: string;
  methodology: Project['methodology'];
  status: Project['status'];
  startDate: string;
  endDate?: string;
  stakeholders: string;
  nextStep: string;
  phase: string;
  health: ProjectHealth;
}

interface ProjectFormProps {
  clients: Client[];
  initialProject?: Project | null;
  onCancel: () => void;
  presentation?: 'inline' | 'drawer';
  onSubmit: (values: ProjectFormValues) => void;
}

const toInputDate = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day && month && year) {
      return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const toStorageDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const DateInputWithPicker: React.FC<{
  inputTestId: string;
  buttonTestId: string;
  value: string;
  onChange: (value: string) => void;
  theme: 'light' | 'dark';
}> = ({ inputTestId, buttonTestId, value, onChange, theme }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
  };

  return (
    <div className="relative mt-1">
      <input
        data-testid={inputTestId}
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border bg-transparent px-3 py-2 pr-10 text-sm ${theme === 'light' ? 'border-slate-300 text-slate-900' : 'border-slate-700 text-slate-100'} [color-scheme:light] dark:[color-scheme:dark]`}
      />
      <button
        data-testid={buttonTestId}
        type="button"
        onClick={openPicker}
        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border p-1.5 ${theme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-slate-700 text-slate-200 hover:bg-slate-800'}`}
        title="Abrir calendario"
        aria-label="Abrir calendario"
      >
        <CalendarDays size={14} />
      </button>
    </div>
  );
};

export const ProjectForm: React.FC<ProjectFormProps> = ({ clients, initialProject, onCancel, onSubmit, presentation = 'inline' }) => {
  const theme = useThemeStore((state) => state.theme);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<ProjectFormValues>({
    name: initialProject?.name || '',
    objective: initialProject?.objective || '',
    description: initialProject?.description || '',
    clientId: initialProject?.clientId || clients[0]?.id || '',
    responsible: initialProject?.responsible || '',
    methodology: initialProject?.methodology || 'Hybrid',
    status: initialProject?.status || 'Planejamento',
    startDate: toInputDate(initialProject?.startDate) || new Date().toISOString().slice(0, 10),
    endDate: toInputDate(initialProject?.endDate),
    stakeholders: (initialProject?.stakeholders || []).join(', '),
    nextStep: initialProject?.nextStep || '',
    phase: initialProject?.phase || 'Descoberta',
    health: initialProject?.health || 'Saudavel',
  });

  const noClient = useMemo(() => clients.length === 0, [clients.length]);

  const onChange = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (noClient) return;
    setSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit({
          ...values,
          startDate: toStorageDate(values.startDate),
          endDate: values.endDate ? toStorageDate(values.endDate) : '',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      data-testid="project-form"
      onSubmit={submit}
      className={`${
        presentation === 'inline'
          ? `rounded-3xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`
          : 'space-y-4'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-black">{initialProject ? 'Editar projeto' : 'Novo projeto'}</h3>
        {noClient && <span className="text-xs text-amber-500">Cadastre um cliente antes de criar projeto.</span>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm">
          Nome do projeto
          <input required value={values.name} onChange={(e) => onChange('name', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>
        <label className="text-sm">
          Cliente
          <select required value={values.clientId} onChange={(e) => onChange('clientId', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>

        <label className="text-sm md:col-span-2">
          Objetivo
          <input required value={values.objective} onChange={(e) => onChange('objective', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>

        <label className="text-sm md:col-span-2">
          Descricao
          <textarea required value={values.description} onChange={(e) => onChange('description', e.target.value)} className="mt-1 h-20 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>

        <label className="text-sm">
          Responsavel
          <input required value={values.responsible} onChange={(e) => onChange('responsible', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>
        <label className="text-sm">
          Metodologia
          <select value={values.methodology} onChange={(e) => onChange('methodology', e.target.value as Project['methodology'])} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
            <option value="Agile">Agile</option>
            <option value="Waterfall">Waterfall</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </label>

        <label className="text-sm">
          Status
          <select value={values.status} onChange={(e) => onChange('status', e.target.value as Project['status'])} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
            <option value="Planejamento">Planejamento</option>
            <option value="Ativo">Ativo</option>
            <option value="Em Risco">Em Risco</option>
            <option value="Suspenso">Suspenso</option>
            <option value="Concluido">Concluido</option>
          </select>
        </label>
        <label className="text-sm">
          Saude
          <select value={values.health} onChange={(e) => onChange('health', e.target.value as ProjectHealth)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
            <option value="Saudavel">Saudavel</option>
            <option value="Atencao">Atencao</option>
            <option value="Critico">Critico</option>
          </select>
        </label>

        <label className="text-sm">
          Data de inicio
          <DateInputWithPicker
            inputTestId="project-start-date-input"
            buttonTestId="project-start-date-picker-button"
            value={values.startDate}
            onChange={(value) => onChange('startDate', value)}
            theme={theme}
          />
        </label>
        <label className="text-sm">
          Data final prevista
          <DateInputWithPicker
            inputTestId="project-end-date-input"
            buttonTestId="project-end-date-picker-button"
            value={values.endDate || ''}
            onChange={(value) => onChange('endDate', value)}
            theme={theme}
          />
        </label>

        <label className="text-sm">
          Fase
          <input value={values.phase} onChange={(e) => onChange('phase', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>
        <label className="text-sm">
          Proximo passo
          <input value={values.nextStep} onChange={(e) => onChange('nextStep', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>

        <label className="text-sm md:col-span-2">
          Stakeholders (separados por virgula)
          <input value={values.stakeholders} onChange={(e) => onChange('stakeholders', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button data-testid="project-form-cancel" type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Cancelar</button>
        <button
          data-testid="project-form-submit"
          type="submit"
          disabled={noClient || submitting}
          className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Salvando...' : 'Salvar projeto'}
        </button>
      </div>
    </form>
  );
};
