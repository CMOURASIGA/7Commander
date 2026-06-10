import React, { useState } from 'react';
import { ShareAccess } from '../types';
import { useThemeStore } from '../store/useThemeStore';
import { Trash2 } from 'lucide-react';

interface ShareProjectModalProps {
  open: boolean;
  onClose: () => void;
  onShare: (email: string, role: ShareAccess['role']) => void;
  onRemove: (accessId: string) => void;
  accesses: ShareAccess[];
}

export const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  open,
  onClose,
  onShare,
  onRemove,
  accesses,
}) => {
  const theme = useThemeStore((state) => state.theme);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareAccess['role']>('VIEWER');

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onShare(email, role);
    setEmail('');
    setRole('VIEWER');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-2xl rounded-3xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black">Compartilhar projeto</h3>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Fechar</button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_120px]">
          <input
            type="email"
            required
            placeholder="email@dominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as ShareAccess['role'])} className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
            <option value="VIEWER">VIEWER</option>
            <option value="EDITOR">EDITOR</option>
            <option value="OWNER">OWNER</option>
          </select>
          <button type="submit" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500">Compartilhar</button>
        </form>

        <div className="mt-4 max-h-72 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2 text-xs uppercase tracking-wider text-slate-500">Email</th>
                <th className="py-2 text-xs uppercase tracking-wider text-slate-500">Papel</th>
                <th className="py-2 text-xs uppercase tracking-wider text-slate-500">Concessao</th>
                <th className="py-2 text-xs uppercase tracking-wider text-slate-500 text-right">Acao</th>
              </tr>
            </thead>
            <tbody>
              {accesses.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-slate-500">Nenhum acesso compartilhado.</td>
                </tr>
              )}
              {accesses.map((access) => (
                <tr key={access.id} className="border-t border-slate-200/70 dark:border-slate-800">
                  <td className="py-3">{access.email}</td>
                  <td className="py-3">{access.role}</td>
                  <td className="py-3 text-xs">{new Date(access.grantedAt).toLocaleString('pt-BR')}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => onRemove(access.id)} className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:text-red-500 dark:border-slate-700">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
