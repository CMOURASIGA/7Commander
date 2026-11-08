-- US audit and in-app notifications, isolated by organization.
alter table public.scrum_user_stories add column if not exists created_by_email text;
alter table public.scrum_user_stories add column if not exists last_actor_email text;
alter table public.scrum_user_stories add column if not exists transition_comment text;
create table if not exists public.scrum_story_events (
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.scrum_user_stories(id) on delete cascade,
 organization_id uuid not null,
 project_id uuid not null,
 event_type text not null,
 from_stage text,
 to_stage text,
 from_sprint uuid,
 to_sprint uuid,
 actor_email text,
 created_at timestamptz not null default now()
);
create index if not exists scrum_story_events_story_idx on public.scrum_story_events(story_id, created_at);
create table if not exists public.scrum_notifications (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 project_id uuid not null,
 story_id uuid not null references public.scrum_user_stories(id) on delete cascade,
 recipient_email text not null,
 actor_email text,
 event_type text not null,
 message text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists scrum_notifications_recipient_idx on public.scrum_notifications(organization_id,lower(recipient_email),read_at,created_at desc);
alter table public.scrum_story_events enable row level security;
alter table public.scrum_notifications enable row level security;
revoke all on public.scrum_story_events from anon,authenticated;
revoke all on public.scrum_notifications from anon,authenticated;
-- Only the server (after authorization) can edit stories; DB guarantees transition audit/comment/notification atomically.
create or replace function public.scrum_story_audit() returns trigger
language plpgsql security definer set search_path=public as $$
declare recipient text; evt text; message_text text;
begin
 if TG_OP='INSERT' then
   insert into public.scrum_story_events(story_id,organization_id,project_id,event_type,to_stage,to_sprint,actor_email)
   values(new.id,new.organization_id,new.project_id,'created',new.workflow_stage,new.sprint_id,new.last_actor_email);
   evt:='created';
 elsif new.workflow_stage is distinct from old.workflow_stage or new.sprint_id is distinct from old.sprint_id then
   if new.workflow_stage='review' and new.workflow_stage is distinct from old.workflow_stage
     and nullif(btrim(coalesce(new.transition_comment,'')),'') is null then
       raise exception 'Motivo obrigatório para solicitar REVIEW';
   end if;
   evt:=case when new.workflow_stage is distinct from old.workflow_stage then 'status' else 'sprint' end;
   insert into public.scrum_story_events(story_id,organization_id,project_id,event_type,from_stage,to_stage,from_sprint,to_sprint,actor_email)
   values(new.id,new.organization_id,new.project_id,evt,old.workflow_stage,new.workflow_stage,old.sprint_id,new.sprint_id,new.last_actor_email);
 end if;
 if nullif(btrim(coalesce(new.transition_comment,'')),'') is not null and
    (TG_OP='INSERT' or new.workflow_stage is distinct from old.workflow_stage) then
   insert into public.scrum_story_comments(story_id,organization_id,project_id,author_user_id,author_email,content)
   values(new.id,new.organization_id,new.project_id,coalesce((select id from auth.users where lower(email)=lower(new.last_actor_email) limit 1), '00000000-0000-0000-0000-000000000000'::uuid),new.last_actor_email,new.transition_comment);
 end if;
 if evt is not null then
  message_text:=case when evt='created' then 'Nova US atribuída: ' when evt='status' then 'US alterada para '||upper(new.workflow_stage)||': ' else 'Sprint alterada para US: ' end||new.title;
  for recipient in select distinct lower(btrim(x)) from unnest(array[new.responsible,new.created_by_email]) x
    where nullif(btrim(x),'') is not null and lower(btrim(x)) is distinct from lower(btrim(coalesce(new.last_actor_email,'')))
  loop
   insert into public.scrum_notifications(organization_id,project_id,story_id,recipient_email,actor_email,event_type,message)
   values(new.organization_id,new.project_id,new.id,recipient,new.last_actor_email,evt,message_text);
  end loop;
 end if;
 return new;
end; $$;
drop trigger if exists scrum_story_audit_trigger on public.scrum_user_stories;
create trigger scrum_story_audit_trigger after insert or update on public.scrum_user_stories
for each row execute function public.scrum_story_audit();
-- Make history immutable once a story enters any workflow stage beyond NEW.
-- A story that was once linked to a Sprint is not a new, unworked story.
