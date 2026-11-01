/**
 * Textos de las notificaciones (español rioplatense). Funciones puras que
 * devuelven { title, body } (body null si no hay detalle); el título se recorta al límite de la columna.
 */

import { appointmentLabel } from '../../shared/utils/dates/labels.js';

export const TITLE_MAX = 150;
export const COMMENT_PREVIEW_MAX = 120;

const ELLIPSIS = '…';

/** Recorta a `max` caracteres agregando "…" si hubo corte (el total no pasa de `max`). */
const clip = (text, max) =>
  text.length > max ? `${text.slice(0, max - 1)}${ELLIPSIS}` : text;

/** Primeros `max` caracteres y "…" si el texto era más largo. */
const preview = (text, max) => (text.length > max ? `${text.slice(0, max)}${ELLIPSIS}` : text);

/** 'YYYY-MM-DD' → 'dd/mm'. */
const ddmm = (date) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

const build = (title, body) => ({ title: clip(title, TITLE_MAX), body });

export const texts = {
  inactivity: ({ studentName, daysSince, missed }) =>
    build(
      `${studentName} no entrena hace ${daysSince} días`,
      `Se salteó ${missed} días de su rutina. Escribile para retomar.`
    ),

  routineModified: ({ studentName, date, substitutions }) => {
    const [first] = substitutions;
    const what =
      substitutions.length === 1
        ? `sustituyó ${first.from} por ${first.to}`
        : `sustituyó ${substitutions.length} ejercicios`;
    return build(`${studentName} modificó su rutina`, `En la sesión del ${ddmm(date)} ${what}`);
  },

  prForStudent: ({ exerciseNames, date }) =>
    build(
      exerciseNames.length === 1
        ? `¡Nuevo récord en ${exerciseNames[0]}!`
        : `¡${exerciseNames.length} récords nuevos!`,
      `Sesión del ${ddmm(date)}`
    ),

  prForTrainer: ({ studentName, exerciseNames }) =>
    build(
      exerciseNames.length === 1
        ? `${studentName} hizo un récord en ${exerciseNames[0]}`
        : `${studentName} hizo ${exerciseNames.length} récords`,
      null
    ),

  achievementForStudent: ({ name, description }) =>
    build(`¡Logro desbloqueado: ${name}!`, description),

  achievementsSummary: (names) =>
    build(`Desbloqueaste ${names.length} logros`, names.join(', ')),

  achievementForTrainer: ({ studentName, name }) => build(`${studentName} desbloqueó ${name}`, null),

  comment: ({ date, comment }) =>
    build(`Tu entrenador comentó tu sesión del ${ddmm(date)}`, preview(comment, COMMENT_PREVIEW_MAX)),

  // Turnos: `scheduledAt` es el instante del turno; el texto lleva día y hora de Argentina.
  appointmentConfirmed: ({ scheduledAt }) =>
    build(`Tu turno del ${appointmentLabel(scheduledAt)} quedó confirmado`, null),

  appointmentCancelled: ({ scheduledAt }) =>
    build(`Tu turno del ${appointmentLabel(scheduledAt)} fue cancelado`, null),

  appointmentCreatedByTrainer: ({ scheduledAt }) =>
    build(`Tu entrenador te agendó un turno el ${appointmentLabel(scheduledAt)}`, null),

  appointmentRequested: ({ studentName, scheduledAt }) =>
    build(`${studentName} pidió un turno para el ${appointmentLabel(scheduledAt)}`, null),

  appointmentCancelledByStudent: ({ studentName, scheduledAt }) =>
    build(`${studentName} canceló su turno del ${appointmentLabel(scheduledAt)}`, null),
};
