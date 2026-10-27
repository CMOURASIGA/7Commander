-- 7Commander Multiempresa CP-01 — fundação não destrutiva
-- NÃO executar sem backup, revisão e aprovação. NÃO habilita sozinho o isolamento multempresa.
-- Preserva a organização atual e seus registros.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id='43973606-0c05-4934-a057-9f2710899eba'::uuid) THEN
  RAISE EXCEPTION 'Consult Services não localizada: interrompido';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id='699e3b96-b213-4b0f-abb7-900f57bd3e69'::uuid AND lower(email)='contactconsultservices@gmail.com') THEN
  RAISE EXCEPTION 'Conta proprietária não corresponde ao registro conferido';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id='0b1c6f05-3e15-497a-8e81-3574284c5945'::uuid AND lower(email)='rodrigogianni@gmail.com') THEN
  RAISE EXCEPTION 'Conta Rodrigo não corresponde ao registro conferido';
 END IF;
END $$;

INSERT INTO public.organization_members (organization_id,user_id,role,status)
VALUES
 ('43973606-0c05-4934-a057-9f2710899eba','699e3b96-b213-4b0f-abb7-900f57bd3e69','owner','active'),
 ('43973606-0c05-4934-a057-9f2710899eba','0b1c6f05-3e15-497a-8e81-3574284c5945','member','active')
ON CONFLICT (organization_id,user_id) DO UPDATE
 SET status='active', role=excluded.role, updated_at=now();

-- A associação será usada pelas APIs numa etapa seguinte. Não habilitar seletor
-- multiempresa funcional sem corrigir todas as leituras/escritas legadas.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Backfill EXCLUSIVAMENTE de registros existentes vinculados à Consult Services
-- via owner histórico da organização. Evita atribuir qualquer dado desconhecido.
UPDATE public.projects SET organization_id='43973606-0c05-4934-a057-9f2710899eba'
WHERE organization_id IS NULL AND user_id='43973606-0c05-4934-a057-9f2710899eba'::uuid;
UPDATE public.clients SET organization_id='43973606-0c05-4934-a057-9f2710899eba'
WHERE organization_id IS NULL AND user_id='43973606-0c05-4934-a057-9f2710899eba'::uuid;

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);

-- Tabelas já existentes precisam de RLS apropriado antes de exposição.
-- Esta migration NÃO desativa políticas atuais nem concede privilégios.
COMMIT;

-- VERIFICAÇÃO (somente leitura)
SELECT m.organization_id,u.email,m.role,m.status
FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id
WHERE m.organization_id='43973606-0c05-4934-a057-9f2710899eba'
 AND lower(u.email) IN ('contactconsultservices@gmail.com','rodrigogianni@gmail.com')
ORDER BY u.email;
SELECT 'projects' AS entity, count(*) AS total, count(*) FILTER(WHERE organization_id IS NULL) AS without_organization FROM public.projects
UNION ALL SELECT 'clients',count(*),count(*) FILTER(WHERE organization_id IS NULL) FROM public.clients;
