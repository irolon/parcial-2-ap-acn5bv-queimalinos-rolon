---
title: Prototipos y guías de diseño
aliases: [Prototipos y guías de diseño, Mockups y wireframes]
actualizado: 2026-10-18
tags: [diseno]
---

# Prototipos y guías de diseño

Prototipos navegables (web y mobile), Guía Web, Guía Mobile y Manual de Marca de FitTrainer. Son la **única fuente de diseño** del proyecto. El proyecto viejo de Google Stitch quedó obsoleto y no se usa más.

## Archivos

Los archivos están en el repo, en `docs/design/` (ver su `README.md`), y en Drive: https://drive.google.com/drive/folders/1wmOpqW5-BReFH-MJ0LRg3AC6BKjyrUUV

- `prototipo-web.html` y `prototipo-mobile.html`: se abren con doble clic en el navegador y sirven para la defensa.
- `guia-web.pdf`, `guia-mobile.pdf` y `manual-de-marca.pdf`.
- `prototype-src/`: código fuente de los prototipos. `tokens.jsx` tiene los valores exactos de color, tipografía y radios.

## Pantallas

### Web: 11 pantallas (5 alumno · 6 entrenador)

| Pantalla | Descripción |
|---|---|
| Alumno · Hoy / Rutina del día | Rutina de hoy con el plan de ejercicios, racha semanal, nota del entrenador y próximo turno |
| Alumno · Sesión activa | Registro de peso y reps por serie durante el entrenamiento |
| Alumno · Mi progreso | Gráficos de cargas y medidas |
| Alumno · Asistente IA | Chat para dudas de técnica y sustituciones de ejercicios (**A4, pendiente:** no está en la web ni en el menú hasta que exista su tarjeta de IA) |
| Alumno · Mi perfil | Datos personales |
| Entrenador · Dashboard | Alumnos activos, sesiones, adherencia, alertas de inactividad y actividad reciente |
| Entrenador · Panel de alumnos | Lista de alumnos |
| Entrenador · Perfil del alumno | Ficha con métricas y rutina activa |
| Entrenador · Crear rutina | Tabla editable de ejercicios con biblioteca lateral |
| Entrenador · Generar QR | Invitación de un alumno nuevo por QR |
| Entrenador · Agenda | Agenda semanal de turnos |

### Mobile: 11 pantallas (6 alumno · 5 entrenador)

| Pantalla | Descripción |
|---|---|
| Alumno · Onboarding por QR | Alta del alumno escaneando el QR del entrenador |
| Alumno · Rutina del día | Pestaña Hoy: rutina, racha y nota del entrenador |
| Alumno · Sesión activa | Registro de series con cifras grandes |
| Alumno · Timer de descanso | Cuenta regresiva entre series |
| Alumno · Progreso | Evolución de cargas y medidas |
| Alumno · Asistente IA | Chat con el asistente durante el entrenamiento |
| Entrenador · Dashboard | Pestaña Inicio: alumnos activos, sesiones de hoy, adherencia y alumnos en riesgo |
| Entrenador · Alumnos | Lista de alumnos |
| Entrenador · Perfil del alumno | Ficha de cada alumno |
| Entrenador · Mensajes | Mensajería con alumnos |
| Entrenador · Generar QR | Invitación por QR desde el celular |

## Estado del alumno en la web

Implementado en la tarjeta 50: A1 Hoy (sin la nota del entrenador ni el próximo turno), A2 Sesión activa (simplificada), A3 Mi progreso (con racha y logros) y A5 Mi perfil (con medidas). **A4 Asistente IA queda pendiente** en la web y en la mobile. Qué hace el alumno en cada plataforma: [[producto/casos-de-uso|Casos de uso]].

## Lo que el diseño dice distinto de lo decidido

Ante una diferencia, mandan las decisiones del proyecto (ver `docs/design/README.md`):

- **Mobile:** Kotlin + Jetpack Compose, en una sola app que ramifica por rol ([[arquitectura/adrs|ADR-003]]). La guía mobile habla de React Native y de dos apps.
- **API:** nombres en inglés, como el backend. Los mockups usan español.
- **Editor de rutinas:** es una tabla editable, no drag & drop.
