# ADR 0001 — Autorización en la capa Service, RLS deny-all en la base

- **Estado:** aceptado
- **Fecha:** 2026-10-12

## Contexto

La doc de Arquitectura prometía dos capas de autorización: "RLS de Supabase +
middleware de Express". En la práctica, ningún cliente habla con Supabase:
la web y la app Android consumen la API REST del backend, y el backend accede
a la base con la `service_role` key, con la que Postgres ignora el RLS.

Políticas RLS por trainer, entonces, no se ejecutarían nunca y no se podrían
probar. Pero sin RLS hay un agujero real: Supabase publica las tablas de
`public` por su API REST (PostgREST) usando la anon key, que no es secreta.

## Decisión

1. RLS activado en todas las tablas de `public`, **sin políticas**. Los roles
   `anon` y `authenticated` no ven ninguna fila.
2. La separación entre trainers (un trainer solo ve sus alumnos; un alumno
   solo sus datos) se verifica en la capa Service, antes de cada lectura o
   escritura, con chequeos de ownership cubiertos por tests unitarios.

## Consecuencias

- La respuesta de defensa: "La base rechaza cualquier acceso que no sea del
  backend (RLS activo sin políticas), y el backend verifica la propiedad en
  cada service; los tests de ownership lo demuestran."
- Cada service nuevo tiene que hacer su chequeo de ownership y tener su test.
  No hay red de seguridad en la base para un service que se olvide.
- Si algún día un cliente consume Supabase directo (Realtime, Storage desde
  el browser), hay que escribir políticas para esas tablas y actualizar este
  ADR.
- Toda tabla nueva en `public` lleva `alter table … enable row level security`
  en la misma migración: por los grants por defecto de Supabase, una tabla sin
  RLS queda expuesta a la anon key apenas se crea. Después de cada migración se
  corre `schema-checks.sql` (tiene que devolver cero filas) y
  `npm run db:check-anon`.
- Verificación: `backend/src/database/checks/schema-checks.sql` (RLS activo, cero
  políticas) y `npm run db:check-anon` (nada expuesto con la anon key; falla
  con exit 1 ante una tabla expuesta o una respuesta no concluyente: key
  inválida, tabla inexistente, error 5xx o sin respuesta).
