# Datos extra al invitar un alumno (deseable)

**Fecha:** 14/11/2026 · **Rama:** `feature/invite-extra-data` · **Base:** `develop`

## Objetivo

El prototipo web de "Invitar alumno" (Guía Web E5, `docs/design/prototype-src/pt-screens.jsx`) pide frecuencia,
altura, peso y edad, y el contexto IA (equipamiento y lesiones). Hoy `POST /invitations` no acepta los cuatro
primeros y la web no muestra equipamiento ni lesiones aunque el backend ya los acepta. La plantilla inicial ya
quedó hecha en la GX8 y no se toca.

## Decisiones

1. **Edad → fecha de nacimiento.** `students` ya tiene `birth_date` y la ficha calcula la edad con ella
   (`ageFrom`). Guardar la edad como número envejece mal (dentro de un año dice lo mismo) e inventar una fecha
   a partir de la edad ensucia el dato. El formulario pide la **fecha de nacimiento** (la misma que edita
   "Editar alumno") y muestra al lado la edad que da ("24 años"), así se ve lo que pedía el prototipo.
2. **Frecuencia → columna nueva `students.weekly_frequency`** (entero 1–7, opcional): los días por semana que
   el alumno quiere o puede entrenar. No se llama `days_per_week` porque `GET /students` ya devuelve un
   `days_per_week` calculado de la rutina activa (lo que tiene asignado, no lo que pidió). Se ve en la ficha
   ("24 años · Intermedio · 4 días/semana") y el PT la puede editar en "Editar alumno" (`PATCH /students/:id`;
   el alumno no, como el resto de los datos de entrenamiento).
3. **Altura y peso → primera medida en `body_metrics`** al aceptar la invitación (`recorded_by = 'trainer'`,
   porque los cargó el PT). Así entran solos al IMC, a los gráficos y a la última medida de la ficha. Es
   **best-effort**: si falla, el alta sigue (se loguea), igual que la rutina inicial de la GX8. Sin aviso al
   PT: el dato se puede volver a cargar desde la ficha.
4. **Rangos:** altura 50–250 cm, peso 20–300 kg (números, no hace falta que sean enteros), frecuencia entero
   1–7, nacimiento `YYYY-MM-DD` real, no futuro y desde 1900. `null` o ausente = sin dato.
5. **Privacidad (RNF-26).** `GET /invitations/:token` (público) sigue devolviendo solo nombre, email, objetivo,
   PT y vencimiento: ni peso, ni altura, ni nacimiento, ni frecuencia, ni lesiones (test nuevo). Nada de esto
   se suma a lo que va a la IA: el asistente del PT y el chat del alumno arman su contexto con lista blanca
   (objetivo, nivel, equipamiento, lesiones) y no cambian.
6. **Equipamiento y lesiones en la web** reusan lo de "Contexto para la IA" de la ficha: `EquipmentPicker`
   (chips del catálogo + "Agregar otro") y un textarea de hasta 1000 caracteres. Van en un bloque
   "CONTEXTO PARA LA IA (OPCIONAL)" debajo de los datos físicos.
7. **El celular no cambia en esta PR** (es de Igna). Para tener lo mismo, la pantalla de invitar del celular
   tendría que mandar `weekly_frequency`, `height_cm`, `weight_kg`, `birth_date`, `gym_equipment` e `injuries`
   en el mismo `POST /invitations`; y la ficha podría mostrar `weekly_frequency`.

## Contrato

`POST /invitations` suma al body (todos opcionales, `null` = sin dato):

```json
{
  "weekly_frequency": "entero 1–7",
  "height_cm": "número 50–250",
  "weight_kg": "número 20–300",
  "birth_date": "YYYY-MM-DD (no futura, desde 1900)"
}
```

Errores nuevos: `400 VALIDATION_ERROR` con el campo correspondiente. La respuesta no cambia.

`POST /students` (alta): copia `weekly_frequency` y `birth_date` al alumno; con altura o peso crea su primera
medida. La respuesta (el alumno) suma `weekly_frequency`.

`GET /students/:id` y `PATCH /students/:id`: suman `weekly_frequency` (PATCH: entero 1–7 o `null`, solo el PT).

## Cambios de datos

Migración `backend/src/database/migrations/2026-11/09-15/2026-11-14-invitar-extras.sql`:

- `invitations`: `student_weekly_frequency smallint` (1–7), `student_height_cm numeric` (50–250),
  `student_weight_kg numeric` (20–300), `student_birth_date date`.
- `students`: `weekly_frequency smallint` (1–7).

**Orden de deploy:** primero la migración, después el backend (el backend nuevo lee las columnas nuevas al
invitar, al aceptar y en la ficha).

## Criterio de aceptación

El entrenador carga frecuencia, altura, peso, fecha de nacimiento, equipamiento y lesiones al invitar; al
aceptar la invitación el alumno los tiene en su ficha (edad y frecuencia en el encabezado, altura y peso como
última medida, equipamiento y lesiones en "Contexto para la IA"). El link público no muestra ninguno.
