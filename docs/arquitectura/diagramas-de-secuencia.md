---
title: Diagramas de secuencia
aliases: [Diagramas de secuencia]
notion: https://app.notion.com/p/33c5ffbef7b581adad2dcd91b0f98044
notion_editado: 2026-04-08
migrado: 2026-10-17
tags: [arquitectura]
---

# Diagramas de secuencia

Muestran cómo fluyen los mensajes entre actores y capas del sistema para cada caso de uso clave. Los actores son: Alumno (mobile), Backend (Node.js/Express), Supabase (PostgreSQL) y servicios externos (n8n, LLM).

**Convenciones:**

- Flechas sólidas → llamada / request
- Flechas punteadas → respuesta / return
- Recuadros punteados → flujos alternativos o de error
- Recuadros con `loop` → pasos que se repiten

---

## CU-01 + CU-02 — Flujo del QR (generación y registro)

**Actores:** PT (web) · Backend · Supabase · Alumno (mobile)

```javascript
PT (web)          Backend           Supabase        Alumno (mobile)
   |                 |                  |                  |
   |--POST /invitations---------------->|                  |
   |                 |--INSERT invitations---------------->|
   |                 |<--------------------------invitation_id
   |                 | [genera QR]       |                  |
   |<-QR image + token-----------------|                  |
   |                 |                  |                  |
   |                 |                  |<--escanea QR-----|
   |                 |<--GET /invitations/:token-----------|
   |                 |--SELECT WHERE token=?-------------->|
   |                 |<--------------------------invitation row
   |                 | [valida expiry + used_at]           |
   |                 |--nombre, objetivo------------------>|
   |                 |<--POST /students (+ password)-------|
   |                 |--INSERT students--------------->|   |
   |                 |--UPDATE used_at = now()-------->|   |
   |                 |<--------------------------ok        |
   |                 |--JWT + student data---------------->|
   |                 |                  |         [pantalla principal]
```

**Flujo alternativo — token expirado o ya usado:**

- Backend retorna 400 → app muestra mensaje de error al alumno

---

## CU-04 — Ejecutar sesión de entrenamiento

**Actores:** Alumno (mobile) · Backend · Supabase · Cache local

```javascript
Alumno (mobile)     Backend           Supabase        Cache local
   |                 |                  |                  |
   |--GET /routines/today-------------->|                  |
   |                 |--SELECT rutina del día------------>|
   |                 |<--------------------------routine + exercises
   |                 |--cachea rutina (offline)---------->|
   |<-routine + suggested weights-------|                  |
   |                 |                  |                  |
   |--POST /sessions--------------->|   |                  |
   |                 |--INSERT sessions--------------->|  |
   |<-session_id--------------------|                  |  |
   |                 |                  |                  |
   | [loop — por cada serie]           |                  |
   |--POST /session-sets------------>|  |                  |
   |                 |--INSERT session_sets---------->|   |
   |<-ok → inicia timer descanso----|                  |   |
   | [fin loop]      |                  |                  |
   |                 |                  |                  |
   |--PATCH /sessions/:id----------->|  |                  |
   |                 |--UPDATE finished_at, rpe------>|   |
   |<-sesión guardada----------------|                  |  |
```

**Flujo de error — sin conexión:**

- Los `session_sets` se guardan en cache local y se sincronizan automáticamente al recuperar conexión

---

## CU-05 — Chat IA con n8n (reemplazar ejercicio)

**Actores:** Alumno (mobile) · Backend · Supabase · n8n · LLM (Claude/OpenAI)

```javascript
Alumno (mobile)   Backend         Supabase      n8n          LLM
   |                |               |             |             |
   |--POST /chat--->|               |             |             |
   |                | [arma contexto]             |             |
   |                |--SELECT ejercicio + músculo->|            |
   |                |<--------------ejercicio, equipment        |
   |                |--POST webhook (msg + contexto)-->|        |
   |                |               |          [arma prompt]    |
   |                |               |             |--prompt+ctx->|
   |                |               |             |<-alternativas|
   |                |<--respuesta formateada-------|            |
   |                |--INSERT chat_messages x2--->|            |
   |<-respuesta del asistente--------|             |             |
   | [muestra en chat]               |             |             |
```

**Contexto enviado a n8n:**

- Mensaje del alumno
- Ejercicio actual y músculo objetivo
- Equipamiento disponible en el gym (configurado por el PT)
- Historial de sesión actual

**Flujo de error E1 — timeout:**

- n8n no responde en 10s → backend retorna 503 → app muestra "asistente no disponible" y permite continuar con la sesión normalmente

---

> **Nota:** Los diagramas de secuencia complementan los casos de uso — muestran el *cómo* técnico (qué endpoint se llama, qué tabla se toca) mientras que los CU muestran el *qué* funcional (objetivo, precondiciones, flujo desde la perspectiva del usuario).
