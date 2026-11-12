-- ============================================================================
-- GX2 · Perfil editable. Re-ejecutable.
-- Correr en el SQL Editor de Supabase. También está en database/schema/
-- (01-auth.sql, 02-students.sql y 06b-messages.sql).
-- ============================================================================

-- Teléfono del alumno (lo edita él o su PT). Opcional.
alter table students
  add column if not exists phone varchar(30);

-- Backfill: el de su invitación usada más reciente (las invitaciones guardan solo dígitos).
update students s
set phone = i.student_phone
from (
  select distinct on (student_email) student_email, student_phone
  from invitations
  where used_at is not null
    and student_phone is not null
    and length(student_phone) between 6 and 30
  order by student_email, used_at desc
) i
where i.student_email = s.email
  and s.phone is null;

-- Título profesional del PT ("Lic. en Educación Física"). Opcional, no va en el registro.
alter table trainers
  add column if not exists professional_title varchar(80);

-- Bucket privado de fotos de perfil: el backend sube y firma las URLs con la service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';
