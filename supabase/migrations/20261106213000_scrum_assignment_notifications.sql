-- Notify newly assigned users even when the workflow stage does not change.
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
 elsif new.responsible is distinct from old.responsible then
   evt:='assigned';
 end if;
 if nullif(btrim(coalesce(new.transition_comment,'')),'') is not null and
    (TG_OP='INSERT' or new.workflow_stage is distinct from old.workflow_stage) then
   insert into public.scrum_story_comments(story_id,organization_id,project_id,author_user_id,author_email,content)
   values(new.id,new.organization_id,new.project_id,coalesce((select id from auth.users where lower(email)=lower(new.last_actor_email) limit 1), '00000000-0000-0000-0000-000000000000'::uuid),new.last_actor_email,new.transition_comment);
 end if;
 if evt is not null then
  message_text:=case when evt='created' then 'Nova US atribuída: ' when evt='status' then 'US alterada para '||upper(new.workflow_stage)||': ' when evt='assigned' then 'US atribuída: ' else 'Sprint alterada para US: ' end||new.title;
  for recipient in select distinct lower(btrim(x)) from unnest(array[new.responsible,new.created_by_email]) x
    where nullif(btrim(x),'') is not null and lower(btrim(x)) is distinct from lower(btrim(coalesce(new.last_actor_email,'')))
  loop
   insert into public.scrum_notifications(organization_id,project_id,story_id,recipient_email,actor_email,event_type,message)
   values(new.organization_id,new.project_id,new.id,recipient,new.last_actor_email,evt,message_text);
  end loop;
 end if;
 return new;
end; $$;
