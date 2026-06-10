import React, { useEffect, useState } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { AgentScope, Artifact, ArtifactFormat, ArtifactStatus, ArtifactType, CoreAgentId } from '../types';
import { useThemeStore } from '../store/useThemeStore';
import { useFeedback } from './FeedbackProvider';

export interface ArtifactEditorValues {
  name: string;
  type: ArtifactType;
  scope: AgentScope;
  format: ArtifactFormat;
  status: ArtifactStatus;
  agentId?: CoreAgentId;
  link: string;
  content: string;
  note: string;
}

interface ArtifactEditorDrawerProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValues: ArtifactEditorValues;
  onClose: () => void;
  onSubmit: (values: ArtifactEditorValues) => void;
}

const TYPE_OPTIONS: ArtifactType[] = [
  'CONTEXT',
  'STORYBOARD',
  'PM_PLAN',
  'BPMN',
  'STATUS_MD',
  'STATUS_HTML',
  'PRESENTATION_HTML',
  'EXECUTIVE_REPORT',
  'RISK_ANALYSIS',
  'UI_SPEC',
  'TECH_ARCH',
  'METRICS',
  'COMMUNICATION',
];

const SCOPE_OPTIONS: AgentScope[] = ['CONTEXT', 'SAI', 'PM', 'BPMN', 'STATUS', 'OTHER'];
const FORMAT_OPTIONS: ArtifactFormat[] = ['markdown', 'html', 'bpmn', 'text', 'link', 'image', 'google-doc'];
const STATUS_OPTIONS: ArtifactStatus[] = ['DRAFT', 'ACTIVE', 'FINAL', 'ARCHIVED'];
const AGENT_OPTIONS: Array<{ label: string; value: CoreAgentId }> = [
  { value: 'storyboardIntelligenceArchitect', label: 'Storyboard Intelligence Architect' },
  { value: 'pmAiPartner', label: 'PM AI Partner' },
  { value: 'bpmnMasterArchitect', label: 'BPMN Master Architect' },
  { value: 'statusReportExecutiveArchitect', label: 'Status Report Executive Architect' },
];

export const buildArtifactEditorDefaults = (
  artifact?: Artifact,
  fallbackScope: AgentScope = 'PM'
): ArtifactEditorValues => {
  if (!artifact) {
    return {
      name: `Artefato_${new Date().toISOString().slice(0, 10)}`,
      type: 'PM_PLAN',
      scope: fallbackScope,
      format: 'markdown',
      status: 'DRAFT',
      agentId: fallbackScope === 'PM' ? 'pmAiPartner' : undefined,
      link: '',
      content: '# Novo artefato',
      note: 'Criacao via drawer',
    };
  }

  return {
    name: artifact.name,
    type: artifact.type,
    scope: artifact.scope,
    format: artifact.format,
    status: artifact.status,
    agentId: artifact.agentId,
    link: artifact.link || '',
    content: artifact.versions.find((item) => item.version === artifact.currentVersion)?.content || '',
    note: `Edicao v${artifact.currentVersion}`,
  };
};

export const ArtifactEditorDrawer: React.FC<ArtifactEditorDrawerProps> = ({
  open,
  title,
  submitLabel,
  initialValues,
  onClose,
  onSubmit,
}) => {
  const theme = useThemeStore((state) => state.theme);
  const feedback = useFeedback();
  const [values, setValues] = useState<ArtifactEditorValues>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [initialValues, open]);

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  const pasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setValues((current) => ({ ...current, content: text }));
    } catch {
      feedback.error('Nao foi possivel ler a area de transferencia.');
    }
  };

  return (
    <div data-testid="artifact-editor-drawer" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l p-4 md:p-6 ${
          theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-100'
        }`}
      >
        <form onSubmit={submit} className="space-y-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500">Artefato</p>
              <h2 className="mt-1 text-xl font-black">{title}</h2>
              <p className={`mt-1 text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                O icone de link externo abre a URL salva no campo "Link externo" deste artefato.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg border p-2 ${theme === 'light' ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-slate-700 text-slate-200 hover:bg-slate-800'}`}
            >
              <X size={16} />
            </button>
          </header>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              Nome
              <input
                data-testid="artifact-drawer-name"
                required
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              />
            </label>

            <label className="text-sm">
              Tipo
              <select
                data-testid="artifact-drawer-type"
                value={values.type}
                onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as ArtifactType }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Escopo
              <select
                data-testid="artifact-drawer-scope"
                value={values.scope}
                onChange={(event) => setValues((current) => ({ ...current, scope: event.target.value as AgentScope }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              >
                {SCOPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Formato
              <select
                data-testid="artifact-drawer-format"
                value={values.format}
                onChange={(event) => setValues((current) => ({ ...current, format: event.target.value as ArtifactFormat }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              >
                {FORMAT_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Status
              <select
                data-testid="artifact-drawer-status"
                value={values.status}
                onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ArtifactStatus }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Agente (opcional)
              <select
                data-testid="artifact-drawer-agent"
                value={values.agentId || ''}
                onChange={(event) => setValues((current) => ({ ...current, agentId: (event.target.value || undefined) as CoreAgentId | undefined }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              >
                <option value="">Sem agente</option>
                {AGENT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm md:col-span-2">
              Link externo (opcional)
              <input
                data-testid="artifact-drawer-link"
                placeholder="https://..."
                value={values.link}
                onChange={(event) => setValues((current) => ({ ...current, link: event.target.value }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              />
            </label>

            <label className="text-sm md:col-span-2">
              Conteudo
              <textarea
                data-testid="artifact-drawer-content"
                required
                value={values.content}
                onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))}
                className={`mt-1 h-56 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              />
            </label>

            <label className="text-sm md:col-span-2">
              Observacao da versao
              <input
                data-testid="artifact-drawer-note"
                value={values.note}
                onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
                className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}
              />
            </label>
          </section>

          <footer className="flex flex-wrap justify-end gap-2">
            <button
              data-testid="artifact-drawer-paste"
              type="button"
              onClick={pasteClipboard}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                theme === 'light' ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-100 hover:bg-slate-800'
              }`}
            >
              <ClipboardPaste size={14} />
              Colar conteudo
            </button>
            <button
              data-testid="artifact-drawer-cancel"
              type="button"
              onClick={onClose}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                theme === 'light' ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-100 hover:bg-slate-800'
              }`}
            >
              Cancelar
            </button>
            <button data-testid="artifact-drawer-submit" type="submit" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500">
              {submitLabel}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
};
