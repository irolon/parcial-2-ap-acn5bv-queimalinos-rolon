---
title: Requerimientos no funcionales
aliases: [Requerimientos no funcionales]
notion: https://app.notion.com/p/33c5ffbef7b581a9b3e4de529cb41097
notion_editado: 2026-06-20
migrado: 2026-10-17
tags: [producto]
---

# Requerimientos no funcionales

Restricciones técnicas, de calidad y operativas del sistema.

---

## Rendimiento

| ID | Requisito | Métrica / criterio de aceptación |
|---|---|---|
| RNF-01 | Tiempo de respuesta de la API (CRUD) | 95% de endpoints CRUD deben responder en < 500ms bajo carga normal (hasta 100 usuarios concurrentes) |
| RNF-02 | Carga de pantalla inicial | La pantalla de rutina del día debe cargar en < 2 segundos en conexión 4G |
| RNF-03 | Sincronización offline | Los datos registrados offline deben sincronizarse en < 5 segundos al recuperar conectividad, con cero pérdida de información |
| RNF-04 | Tiempo de respuesta del asistente IA del alumno | 95% de las respuestas en < 10 segundos. Si supera el timeout, la app sigue funcionando sin la IA. |
| RNF-05 | Tiempo de respuesta del asistente IA del entrenador | 95% de las generaciones en < 30 segundos. Aceptable hasta 60s para casos complejos. Si supera el timeout, mensaje claro al usuario y posibilidad de reintentar. |

---

## Seguridad

| ID | Requisito | Métrica / criterio de aceptación |
|---|---|---|
| RNF-06 | Autenticación JWT | Tokens con expiración de 1 hora + refresh token de 30 días. Revocación inmediata posible. |
| RNF-07 | Autorización por rol | El alumno no puede acceder a datos de otros alumnos. El PT solo puede ver sus propios alumnos. Row-Level Security en Supabase. |
| RNF-08 | Encriptación en tránsito | HTTPS obligatorio en todos los endpoints. TLS 1.2 mínimo. |
| RNF-09 | Invitaciones (WhatsApp/QR) | El token debe expirar en 48hs y ser de un solo uso. No puede reutilizarse para crear otra cuenta. |
| RNF-10 | API keys de LLM | Centralizadas en n8n self-hosted. Nunca expuestas al cliente web ni a la app Android. |
| RNF-11 | Rate limiting de IA | Plan gratuito: máximo 10 generaciones de rutina/mes y 50 mensajes de chat/mes por trainer. Plan pago: sin límite estricto. |

---

## Usabilidad

| ID | Requisito | Métrica / criterio de aceptación |
|---|---|---|
| RNF-12 | Onboarding sin fricciones | Un nuevo alumno debe poder completar el registro vía WhatsApp o QR en menos de 2 minutos sin ayuda externa. |
| RNF-13 | UX durante el entreno | Registrar una serie (peso + reps) no debe requerir más de 3 taps desde la pantalla principal. La app debe ser usable con una sola mano. |
| RNF-14 | Tablero del entrenador | El PT debe poder moverse entre alumnos en menos de 2 clics y ver sus métricas principales sin scroll. |
| RNF-15 | Soporte multiplataforma: ambos roles en ambos clientes | Compatible con Android 9 (API level 28) en adelante para el cliente mobile, responsive en pantallas de 5" a 7". El cliente web debe funcionar en navegadores modernos (Chrome, Firefox, Edge, Safari). Ambos clientes soportan a ambos roles (entrenador y alumno). El entrenador tiene la funcionalidad completa en los dos. El alumno tiene en la web la funcionalidad central: rutina del día, sesión activa simplificada (se guarda en el navegador y se sube al terminar), Mis rutinas, historial, progreso con racha y logros, y perfil con medidas. Quedan solo en la mobile la sesión offline completa, las notificaciones push, reemplazar un ejercicio y pedir turno; el asistente IA del alumno está pendiente en ambas plataformas (detalle en [[producto/casos-de-uso|Casos de uso]]). |
| RNF-16 | Idioma | Producto íntegramente en español rioplatense. Sin estructuras de inglés traducidas literalmente. |

---

## Disponibilidad y resiliencia

| ID | Requisito | Métrica / criterio de aceptación |
|---|---|---|
| RNF-17 | Uptime del backend | 99% de disponibilidad mensual. Mantenimiento programado fuera de horas pico (06:00–22:00 ART). |
| RNF-18 | Backups automáticos | Backup diario de la base de datos en Supabase. Retención de 30 días. Recovery < 4 horas. |
| RNF-19 | Modo offline crítico | La app del alumno debe permitir entrenar y registrar la sesión completa sin conexión. La rutina del día se cachea localmente al menos 24hs antes. El asistente IA del alumno se deshabilita gracefully con aviso al usuario. |
| RNF-20 | Fallback de la IA | Si n8n no está disponible, el flujo del usuario no se interrumpe. El PT puede seguir armando rutinas a mano. El alumno puede seguir entrenando sin el chat. |

---

## Escalabilidad

| ID | Requisito | Métrica / criterio de aceptación |
|---|---|---|
| RNF-21 | Arquitectura sin estado | El backend debe ser stateless para poder escalar horizontalmente con múltiples instancias si es necesario. |
| RNF-22 | Storage de media | Videos y fotos en Supabase Storage / CDN. No se almacenan en el servidor de la app. |
| RNF-23 | Costo de tokens del LLM | Monitoreo mensual del consumo. Selección de modelos económicos para el chat del alumno (consultas cortas) y modelos más capaces para el armado de rutinas. El LLM (KIMI API) se consume desde n8n, lo que permite cambiar de modelo sin tocar el backend. |

---

## Legal / Privacidad

| ID | Requisito | Métrica / criterio de aceptación |
|---|---|---|
| RNF-24 | Consentimiento de datos de salud | Al registrarse, el usuario acepta explícitamente la política de privacidad y el tratamiento de datos de salud (peso, medidas, historial). |
| RNF-25 | Derecho al olvido | El alumno puede solicitar la eliminación de su cuenta y todos sus datos. Eliminación real en 30 días. |
| RNF-26 | Datos compartidos con LLM | Los datos enviados a n8n y al LLM no incluyen información personalmente identificable (nombre, email). El contexto se anonimiza antes de salir del backend. |
