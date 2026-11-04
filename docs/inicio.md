---
title: FitTrainer — Proyecto Final de Carrera
aliases: [FitTrainer — Proyecto Final de Carrera, Inicio]
notion: https://app.notion.com/p/33c5ffbef7b581eb9207c27f4f7aa7b8
notion_editado: 2026-10-16
migrado: 2026-10-17
tags: [inicio]
---

# FitTrainer — Proyecto Final de Carrera

> [!info] Fuente de verdad
> Desde el 17/10/2026 la documentación del proyecto vive acá (`docs/`, versionada en git) y las tareas en el tablero de Trello *FitTrainer — Desarrollo · Igna + Pablo*. Notion queda como archivo de solo lectura.

Aplicación para personal trainers y sus alumnos · Web + Android · Proyecto final de Analista de Sistemas

---

## Resumen del proyecto

FitTrainer es una plataforma con dos clientes — una aplicación web y una aplicación móvil Android — que digitaliza la relación entre el personal trainer y sus alumnos. Ambos roles (entrenador y alumno) pueden acceder desde cualquiera de los dos clientes: la web está optimizada para el flujo del entrenador y la mobile para el del alumno. El entrenador tiene todo en los dos; el alumno tiene en la web lo central (rutina del día, una sesión simplificada que se sube al terminar, historial, progreso con logros y medidas), y el celular suma la sesión offline completa y reemplazar ejercicios (el resto del alumno en el celular, como medidas, progreso y logros, está pendiente: push y pedir turno todavía no están). El asistente IA del alumno está pendiente en las dos plataformas. La plataforma permite armar y asignar rutinas, hacer seguimiento del progreso, registrar volúmenes de entrenamiento en el momento, e integra un asistente IA dual: uno que asiste al entrenador en el armado de plantillas de rutinas y otro que acompaña al alumno durante la sesión. Suma componentes de gamificación (logros, rachas y desafíos) para mejorar la adherencia.

| Campo | Detalle |
|---|---|
| Nombre del proyecto | FitTrainer |
| Tipo | Aplicación web + mobile (Android), ambas para ambos roles |
| Roles del sistema | Entrenador (PT) y Alumno — disponibles en ambos clientes |
| Mercado objetivo | LATAM, foco inicial en Argentina |
| Arquitectura | Monolito modular — backend único compartido por ambos clientes |
| Stack | React · Kotlin (Jetpack Compose) · Node.js/Express · Supabase/PostgreSQL |
| Patrón | Controller → Service → Repository → Model |
| IA / automatización | n8n (asistente del entrenador para plantillas + asistente del alumno en sesión) |
| Onboarding del alumno | Vinculación por WhatsApp o código QR con carga mínima de datos. Acceso desde cualquiera de las dos plataformas. |
| Autor | Ignacio Rolon / Pablo Queimaliños |
| Carrera | Analista de Sistemas |

---

## Diferenciadores clave

- Producto en español, pensado para LATAM y precios en pesos.
- Doble asistente IA: para el entrenador (generación de plantillas con personalización por alumno) y para el alumno (sustituciones, técnica, calentamiento).
- Onboarding simplificado vía WhatsApp o QR — fricción mínima para sumar alumnos.
- Los dos roles en los dos clientes: el alumno puede ver su rutina, su historial, su progreso y sus logros desde la web, y hasta registrar un entrenamiento simplificado; el entrenador puede usar la mobile en el gym o en la calle. Lo que hoy tiene solo el celular del alumno (sesión offline completa y reemplazar ejercicio) y lo que sigue pendiente en él (medidas, progreso y logros, push y pedir turno) está en [[producto/casos-de-uso|Casos de uso]].
- Foco en el flujo crítico: vinculación + armado de rutina + entrenamiento + seguimiento + logros.
- Gamificación integrada al MVP (logros, rachas, desafíos) para sostener la adherencia.
- Modo offline reforzado para gimnasios con mala conectividad.

---

## Índice de documentación

### Producto
- [[producto/propuesta|Propuesta de Proyecto — Trabajo Final 2]]
- [[producto/equipo|Descripción del equipo]]
- [[producto/requerimientos-no-funcionales|Requerimientos no funcionales]]
- [[producto/casos-de-uso|Casos de uso]]
- [[producto/personas|Usuarios objetivo (Personas)]]
- [[producto/investigacion-de-mercado|Investigación de mercado]]
- [[producto/beneficios-esperados|Beneficios esperados]]
- [[producto/foda|Análisis FODA]]

### Arquitectura
- [[arquitectura/adrs|Architecture Decision Records (ADRs)]]
- [[arquitectura/modelo-de-datos|Modelo de datos (DER)]]
- [[arquitectura/contratos-api|Contratos de API]]
- [[arquitectura/diagrama-casos-de-uso|Diagrama de casos de uso (UML)]]
- [[arquitectura/diagramas-de-secuencia|Diagramas de secuencia]]

### Proceso
- [[proceso/plan-de-desarrollo|Plan de desarrollo]]
- [[proceso/plan-de-pruebas|Plan de Pruebas]]
- [[proceso/setup-tecnico|README Técnico — Guía de Setup y Desarrollo]]

### Diseño
- [[diseno/mockups|Prototipos y guías de diseño]]

### Specs y planes por tarjeta
- [[tarjetas|Tarjetas]]: diseño (`superpowers/specs/`) y plan de implementación (`superpowers/plans/`) de cada tarjeta de Trello.

---

> **Estado:** En etapa de planificación y documentación
