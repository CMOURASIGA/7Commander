
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Risk } from '../types';

interface ProjectsState {
  projects: Project[];
  risks: Risk[];
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addRisk: (risk: Risk) => void;
  updateRisk: (id: string, updates: Partial<Risk>) => void;
}

const initialProjects: Project[] = [
  {
    id: 'p1',
    name: 'Modernização ERP 2.0',
    objective: 'Migração de sistemas legados para nuvem.',
    methodology: 'Agile',
    status: 'Ativo',
    startDate: '15/01/2024',
    budget: 'R$ 500.000'
  },
  {
    id: 'p2',
    name: 'Lançamento App Mobile',
    objective: 'Novo canal de vendas para clientes B2C.',
    methodology: 'Hybrid',
    status: 'Em Risco',
    startDate: '20/11/2023',
    budget: 'R$ 150.000'
  }
];

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set) => ({
      projects: initialProjects,
      risks: [],
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project] 
      })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),
      addRisk: (risk) => set((state) => ({ 
        risks: [...state.risks, risk] 
      })),
      updateRisk: (id, updates) =>
        set((state) => ({
          risks: state.risks.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
    }),
    { name: 'pm-command-center-projects' }
  )
);
