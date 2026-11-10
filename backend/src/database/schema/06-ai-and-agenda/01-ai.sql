-- ============================================================================
-- FitTrainer — Schema 06 (1/2) · chat_messages y ai_routine_generations (con
-- la RPC save_ai_generation_templates). Va después de 05-gamification.sql.
-- Re-ejecutable.
-- ============================================================================

-- ── chat_messages (asistente IA del alumno) ──────────────────────────────────
-- Desvío del DER: session_id es nullable con set null, para que el chat no
-- dependa de una sesión activa ni se pierda al borrarla.
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete set null,
  student_id uuid not null references students (id) on delete cascade,
  role       varchar(20) not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_student on chat_messages (student_id, created_at);
create index if not exists idx_chat_messages_session on chat_messages (session_id);

-- ── ai_routine_generations (asistente IA del entrenador) ─────────────────────
create table if not exists ai_routine_generations (
  id                  uuid primary key default gen_random_uuid(),
  trainer_id          uuid not null references trainers (id) on delete cascade,
  student_id          uuid references students (id) on delete set null,
  input_params        jsonb not null,
  generated_routine   jsonb not null,
  was_used            boolean not null default false,
  routine_template_id uuid references routine_templates (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_ai_generations_trainer on ai_routine_generations (trainer_id);

-- Tarjeta 15: todas las plantillas de la generación (una por bloque); routine_template_id
-- es la primera. Sin FK (arreglo). La RPC crea las plantillas y marca la generación en
-- una transacción, con la generación bloqueada (FT002 ya guardada, FT003 no existe o ajena).
alter table ai_routine_generations add column if not exists routine_template_ids uuid[] not null default '{}';

create or replace function save_ai_generation_templates(p_generation_id uuid, p_trainer_id uuid, p_templates jsonb)
returns setof routine_templates language plpgsql security invoker set search_path = public as $$
declare
  v_used boolean;
  v_ids  uuid[] := '{}';
  v_id   uuid;
  t      jsonb;
begin
  select was_used into v_used from ai_routine_generations
   where id = p_generation_id and trainer_id = p_trainer_id for update;
  if not found then raise exception 'La propuesta no existe' using errcode = 'FT003'; end if;
  if v_used then raise exception 'La propuesta ya se guardó como plantilla' using errcode = 'FT002'; end if;
  if jsonb_typeof(p_templates) is distinct from 'array' or jsonb_array_length(p_templates) = 0 then
    raise exception 'p_templates tiene que ser un arreglo no vacío' using errcode = '22023';
  end if;
  for t in select value from jsonb_array_elements(p_templates) loop
    insert into routine_templates (trainer_id, name, goal, level, frequency_per_week, generated_by_ai, structure)
    values (p_trainer_id, t->>'name', t->>'goal', t->>'level', (t->>'frequency_per_week')::int, true, t->'structure')
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  update ai_routine_generations
     set was_used = true, routine_template_id = v_ids[1], routine_template_ids = v_ids
   where id = p_generation_id;
  return query select rt.* from routine_templates rt where rt.id = any (v_ids) order by array_position(v_ids, rt.id);
end $$;
revoke all on function save_ai_generation_templates(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function save_ai_generation_templates(uuid, uuid, jsonb) to service_role;
