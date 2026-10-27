-- 7Commander: enterprise ownership expansion (schema-only, non-destructive).
-- Apply in a separate Supabase development database after checking backfill counts.
-- Existing production data and policies are deliberately not altered by this file alone.
BEGIN;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.task_boards ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.knowledge_base ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
UPDATE public.conversations c SET organization_id=p.organization_id FROM public.projects p WHERE c.project_id=p.id AND c.organization_id IS NULL;
UPDATE public.messages m SET organization_id=c.organization_id FROM public.conversations c WHERE m.conversation_id=c.id AND m.organization_id IS NULL;
UPDATE public.decisions d SET organization_id=p.organization_id FROM public.projects p WHERE d.project_id=p.id AND d.organization_id IS NULL;
UPDATE public.risks r SET organization_id=p.organization_id FROM public.projects p WHERE r.project_id=p.id AND r.organization_id IS NULL;
UPDATE public.task_boards b SET organization_id=p.organization_id FROM public.projects p WHERE b.project_id=p.id AND b.organization_id IS NULL;
UPDATE public.tasks t SET organization_id=p.organization_id FROM public.projects p WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.knowledge_base k SET organization_id=p.organization_id FROM public.projects p WHERE k.project_id=p.id AND k.organization_id IS NULL;
UPDATE public.agent_runs a SET organization_id=c.organization_id FROM public.conversations c WHERE a.conversation_id=c.id AND a.organization_id IS NULL;
-- Memories without a project or another explicit organization reference cannot be safely assigned.
-- Keep such rows NULL until their ownership is verified; never assign the default organization blindly.
CREATE INDEX IF NOT EXISTS conversations_org_id_idx ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS messages_org_id_idx ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS decisions_org_id_idx ON public.decisions(organization_id);
CREATE INDEX IF NOT EXISTS risks_org_id_idx ON public.risks(organization_id);
CREATE INDEX IF NOT EXISTS memories_org_id_idx ON public.memories(organization_id);
CREATE INDEX IF NOT EXISTS agent_runs_org_id_idx ON public.agent_runs(organization_id);
COMMIT;
