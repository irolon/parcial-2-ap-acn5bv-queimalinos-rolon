# Listado de plantillas sin traer la structure entera (deseable) · diseño

Tarjeta: "Listado de plantillas sin traer la structure entera". Surge de la review de la PR #26 (punto 9, acordado con Igna dejarlo para después).

## Por qué

`GET /routine-templates` hoy pide `structure` completa de cada plantilla (hasta 50 ejercicios con series, reps, notas…) solo para calcular `days` y `exercise_count`, y el resto se tira. Con muchas plantillas (por ejemplo, las que guarda la IA del S4) se transfiere mucho para nada.

## Qué se decidió (decisiones de Claude, Pablo puede revisarlas en la PR)

1. **Una vista, `routine_templates_summary`**, en vez de una columna calculada o una RPC: no toca la tabla, no hay que mantener nada al escribir, y el repositorio sigue usando el mismo encadenado de PostgREST (`eq`, `order`), así que los filtros no cambian.
2. **`security_invoker = true`, sin políticas y sin grants extra**, igual que `student_last_session`: la vista hereda el RLS de `routine_templates` (activo, sin políticas → la anon key no ve nada). El backend usa la service_role. Se suma a `check-anon-access.js` y a `schema-checks.sql` (falta la vista / falta `security_invoker`).
3. **La vista replica exactamente lo que hacía el modelo en JS:**
   - `days` = `structure->'days'` si es un arreglo jsonb (mismo orden, sin tocar), si no `[]`.
   - `exercise_count` = cantidad de ítems de `structure->'exercises'` que son objeto o arreglo (en JS `typeof [] === 'object'`, así que también contaban), `0` si no es un arreglo. Se castea a `int` para que llegue como número.
4. **La propiedad sigue en el repositorio** (`trainer_id = …`), igual que antes. No hay paginación hoy; no se agrega.
5. **La respuesta queda igual**: mismas claves, mismo orden (`id, name, goal, level, frequency_per_week, generated_by_ai, created_at, days, exercise_count`) y mismos tipos. `toTemplateSummary` ahora proyecta una fila de la vista (descarta `trainer_id`). Un test fija la forma exacta.
6. **Qué NO cambia**: `previous_templates` del asistente IA (`findRecentTemplates`) necesita los nombres de los ejercicios, así que sigue leyendo `structure` (son 3 filas). El detalle, `instantiate`, el alta, la edición y la plantilla inicial de la invitación también la necesitan. La web y el celular usan `GET /routine-templates` (selector de plantilla al invitar, `InitialTemplateField`, la pantalla de plantillas): se benefician sin cambios.

## Contrato

Sin cambios en `GET /routine-templates` (solo una nota de dónde sale `days`/`exercise_count`).

## Cambios de datos

- Migración `backend/src/database/migrations/2026-11/09-15/2026-11-14-listado-plantillas.sql` (`create or replace view`, re-ejecutable, termina con `notify pgrst, 'reload schema';`).
- `schema/03-routines.sql` suma la vista; `checks/schema-checks.sql` falla si falta o no es `security_invoker`.
- **Orden de deploy: migración antes que el backend** (si no, `GET /routine-templates` da 500 porque la vista no existe).

## Criterio de aceptación

- El repositorio consulta `routine_templates_summary` con `id, trainer_id, name, goal, level, frequency_per_week, generated_by_ai, created_at, days, exercise_count` (sin `structure`), filtra por trainer y por los filtros opcionales, ordena por `created_at desc`.
- El service devuelve exactamente la misma forma que antes.
- Lint y suite de backend en verde.
