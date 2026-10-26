-- Follow-up to 053. DO NOT EXECUTE before reviewing database backup and checking 053.
-- Restore task rows that were created by the legacy fallback while a modern board already existed.
-- Idempotent backfill: only rows with missing board/column links are touched.
-- Explicitly excludes tasks from projects without a modern board.
with resolved as (
  select t.id as task_id, b.id as board_id, c.id as column_id,
         row_number() over (partition by b.id,c.id order by t.created_at,t.id) - 1 as offset_position
  from public.tasks t
  join public.task_boards b on b.project_id = t.project_id
  join public.task_columns c on c.board_id = b.id
    and c.column_key = case
      when t.status in ('concluida','concluída','done') then 'done'
      when t.status in ('em_andamento','andamento','doing') then 'doing'
      else 'todo'
    end
  where t.board_id is null and t.column_id is null
)
update public.tasks as t
set board_id = r.board_id,
    column_id = r.column_id,
    position = (select coalesce(max(t2.position), -1) + 1 from public.tasks t2 where t2.board_id=r.board_id and t2.column_id=r.column_id) + r.offset_position,
    updated_at = now()
from resolved r
where t.id = r.task_id and t.board_id is null and t.column_id is null;
