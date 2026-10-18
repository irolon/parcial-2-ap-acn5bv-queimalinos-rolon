---
title: Análisis FODA
aliases: [Análisis FODA]
notion: https://app.notion.com/p/33c5ffbef7b581b697cbc8268cf7382a
notion_editado: 2026-05-01
migrado: 2026-10-17
tags: [producto]
---

# Análisis FODA

Marco estratégico para evaluar la viabilidad del producto antes del lanzamiento.

---

## Fortalezas (Strengths)

- **Producto en español pensado para LATAM**, con foco inicial en Argentina (precios en pesos, terminología local, equipamiento común de gimnasios locales).
- **Doble asistente IA**: uno para el entrenador (generación de plantillas de rutinas personalizables) y otro para el alumno en sesión (sustituciones, técnica, calentamiento, prevención de lesiones).
- **Onboarding simplificado** vía WhatsApp o QR con carga mínima de datos — fricción mínima para sumar alumnos al sistema.
- **Paridad total entre clientes**: ambos roles (entrenador y alumno) pueden usar tanto la web como la mobile con todas las funcionalidades. El usuario elige el dispositivo según su contexto, no según su rol.
- **Visión dual real PT + alumno** — flujo natural del negocio, ambos roles tienen experiencias diseñadas para su tarea concreta.
- **Gamificación integrada al MVP** (logros, rachas, desafíos) para sostener la adherencia del alumno.
- **Stack moderno** (React, Node.js, Supabase) que permite iteración rápida.
- **Un solo backend** para web y mobile — menos mantenimiento, mayor consistencia, menos costos.
- **Foco quirúrgico en el flujo crítico**: vinculación + armado de rutina + entrenamiento + seguimiento + logros.

---

## Oportunidades (Opportunities)

- **Demanda creciente** de PTs post-pandemia y auge del fitness en Argentina y la región.
- **Apps competidoras en inglés y caras en USD** — barrera fuerte para el mercado LATAM (TrueCoach, PT Distinction, Trainerize, Hexfit).
- **Modelo freemium para PTs** (hasta 2–3 alumnos gratis, luego pago en pesos).
- **Escalabilidad con líneas de negocio adicionales**: webinars y cursos cortos para entrenadores, acuerdos con gimnasios, alianzas con marcas de suplementos deportivos e indumentaria.
- **Modelo B2B con gimnasios** que quieran ofrecer la app a sus PTs como valor agregado del alquiler del espacio.
- **Expansión a kinesiología y rehabilitación** con leve adaptación.
- **Modalidad consumidor final a futuro** (alumno sin PT, registro libre, búsqueda de entrenador dentro de la app).

---

## Debilidades (Weaknesses)

- **El cliente real es el entrenador**: si el PT no adopta la herramienta, el alumno tampoco. La cadena de adopción depende del trainer.
- **Proyecto pequeño** con capacidad de soporte limitada al inicio.
- **Sin historial de uso real previo de mercado** — falta feedback masivo de usuarios para validar la UX.
- **Modo offline limitado** — mala conectividad en algunos gyms; afecta especialmente al asistente IA del alumno (requiere conexión).
- **Gestión de videos** (almacenamiento y CDN) puede ser costosa en escala.
- **El alumno está obligado a descargarse la app** — puede generar resistencia inicial.

---

## Amenazas (Threats)

- **Apps consolidadas con más recursos**: Mindbody, TrueCoach, Trainerize, Everfit.
- **Inercia cultural**: muchos PTs y alumnos siguen usando WhatsApp + Excel — el cambio de hábito es el verdadero desafío.
- **Inestabilidad económica argentina**: dificulta cobrar suscripciones recurrentes en pesos y planificar costos de infraestructura.
- **Políticas de Google Play / App Store** pueden afectar la distribución, las comisiones y los términos de pago.
- **Cambios regulatorios en Argentina** (impuestos, retenciones, normativas sobre apps de salud) que puedan impactar el modelo de negocio.

---

## Hipótesis de usuarios previos (marco de validación)

Para simular feedback previo a la entrega, se propone entrevistar a 3 arquetipos:

| Arquetipo | Perfil | Qué validar |
|---|---|---|
| PT independiente | 10–20 alumnos, trabaja en gym y a distancia | Flujo de asignación de rutinas, asistente IA del entrenador y panel de progreso |
| Alumno casual | 2–3 días/semana, objetivo tonificación | Onboarding simplificado, registro de pesos en sesión y asistente IA del alumno |
| Alumno avanzado | Powerlifter, 5 días/semana | Progresión de cargas, historial detallado, gamificación y modo offline |

> Con estas 3 entrevistas de 30 min cada una se pueden detectar los puntos de fricción más críticos antes de la defensa.
