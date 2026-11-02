---
tags: [spec]
tarjeta: E3
---
# Spec — E3 · Ficha del alumno (mobile)

- **Tarjeta:** [E3 del tablero del entrenador](https://trello.com/c/iaD1Csj4).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-ficha`, apilada sobre `feature/android-entrenador-invitar` (E2).
- **Diseño:** prototipo `EM_PerfilAlumno`.
- **Contrato:** `GET /students/:id` y `PATCH /students/:id`. El backend no se toca.

## 1. Objetivo

Tocar un alumno en la lista abre su ficha: quién es, cómo está, qué rutina tiene y su última medición. Desde la ficha el entrenador corrige los datos y da de baja o reactiva al alumno. También es el punto de entrada a historial (E4), progreso (E5) y medidas (E6).

**Criterio de aceptación:** el entrenador abre la ficha de un alumno, ve sus datos, métricas y rutina activa, edita las lesiones y lo da de baja / reactiva; en modo avión la ficha ya vista se sigue viendo.

## 2. Decisiones (debate del 01/11)

- **Los botones "Mensaje" y "Asignar rutina" del prototipo no aparecen** hasta E11 y E8.
- **Las secciones de E4, E5 y E6** (historial, progreso y medidas) se suman a la ficha en sus tarjetas. E3 deja el lugar armado: una columna con secciones, y cada tarjeta agrega la suya.
- **Offline:** la ficha se cachea en Room al abrirla y se ve sin conexión. Editar, dar de baja y reactivar piden red: sin conexión, esas acciones aparecen deshabilitadas con "Necesitás conexión".

## 3. Pantalla (`trainer/students/{studentId}`)

### 3.1 Cabecera

- Flecha atrás y título "Perfil del alumno".
- Avatar con iniciales, nombre y la línea "24 AÑOS · HIPERTROFIA · 4 D/SEM":
  - la edad sale de `birth_date`;
  - los días, de `active_routine.days`;
  - si falta un dato, se omite.
- Píldora de estado con las mismas reglas de E1: AL DÍA, EN RIESGO, NUEVO o DADO DE BAJA.

### 3.2 Cuerpo

- **Rutina activa:** nombre y días ("Lun · Jue"), o "Sin rutina asignada".
- **Última medición:** peso, altura, IMC (el `bmi` del backend) y grasa, con su fecha. Sin medidas: "Sin medidas cargadas".
- **Datos:** objetivo, nivel, fecha de nacimiento, email, equipamiento (chips) y lesiones, cada uno con "—" si falta.
- **Acciones:**
  - "Editar datos";
  - "Dar de baja" en coral, o "Reactivar" si ya está de baja.

### 3.3 Editar datos (hoja inferior o pantalla `.../edit`)

- **Campos:** nombre, objetivo, nivel, fecha de nacimiento (selector de fecha, no futura, se puede borrar), equipamiento (chips: agregar y quitar) y lesiones.
- "Guardar" manda `PATCH` solo con lo que cambió. Si no cambió nada, el botón queda deshabilitado.
- **Validación:** las mismas reglas del contrato. Un 400 muestra el mensaje del campo.

### 3.4 Baja y reactivación

- **Baja:** confirmación con el texto "Va a dejar de poder entrar a la app. Lo que ya tiene abierto sigue andando hasta 1 hora." y los botones "Dar de baja" y "Cancelar". Manda `PATCH { active: false }`.
- **Reactivar:** manda `PATCH { active: true }`, sin confirmación.
- En los dos casos se actualiza la ficha y la fila de la lista (E1) sin esperar a un refresh.

## 4. Datos

- `StudentsApi.get(id)` y `StudentsApi.update(id, body)`.
- **Room:**
  - tabla `trainer_student_details` (`id, trainerId`, los datos de la ficha, `gymEquipment` como JSON con un `TypeConverter`, la última métrica aplanada, `activeRoutineName`, `activeRoutineDays`, `fetchedAt`);
  - migración a la versión siguiente.
- **`TrainerStudentDetailRepository`:**
  - `observe(trainerId, id)`;
  - `refresh(trainerId, id)`;
  - `update(trainerId, id, patch)`: si sale bien, guarda la ficha que devuelve el servidor y actualiza la fila de `trainer_students`;
  - es parte del `UserDataCleaner`.
- **Navegación:** la fila de E1 pasa a ser tocable y abre `trainer/students/{id}`. La pestaña Alumnos sigue marcada mientras se ve la ficha.

## 5. Pruebas

- **Unit:**
  - edad: cumpleaños hoy, mañana y 29 de febrero;
  - línea de cabecera con datos faltantes;
  - armado del PATCH: solo lo que cambió, `null` para borrar;
  - validación de la edición;
  - repositorio: refresh, update que toca la ficha y la fila de la lista, error que conserva el caché;
  - ViewModel: sin conexión, confirmación de baja, reactivar.
- **Migración (androidTest).**
- **E2E:** abrir la ficha del alumno al día, editar sus lesiones, darlo de baja (ver que pasa a "Dados de baja" en la lista), reactivarlo, y en modo avión ver la ficha.

## 6. Fuera de alcance

Foto de perfil, mensaje (E11), asignar rutina (E8).
