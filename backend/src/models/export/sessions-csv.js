/**
 * Modelo del CSV de sesiones (GX1: exportar datos). Puro: columnas, formato y
 * escape, sin Supabase ni Express. Pensado para abrir con doble clic en Excel
 * en español: BOM (si no, los acentos salen rotos), separador ';' (la coma es
 * el decimal) y fin de línea CRLF.
 */

import { utcToArgentina } from '../../shared/utils/dates/argentina.js';
import { durationMin } from '../sessions/session-history.model.js';

export const STUDENT_HEADERS = [
  'Fecha',
  'Hora',
  'Duración (min)',
  'Rutina',
  'Ejercicio',
  'Ejercicio planificado',
  'Serie',
  'Reps',
  'Kg',
  'Completada',
  'Descanso (s)',
  'RPE',
  'Notas',
  'Comentario del PT',
];

/** El PT exporta todos sus alumnos (también los dados de baja): suma quién es cada fila. */
export const TRAINER_HEADERS = ['Alumno', 'Email', 'Activo', ...STUDENT_HEADERS];

const BOM = '﻿';
const EOL = '\r\n';
const SEPARATOR = ';';

/*
 * Inyección de fórmulas: Excel ejecuta una celda que empieza con = + - @ o
 * tab. Con un apóstrofo adelante la muestra como texto. Las notas y los
 * nombres los escribe el usuario, así que se escapa todo el texto.
 */
const FORMULA_START = /^[=+\-@\t]/;
const NEEDS_QUOTES = /[;"\r\n]/;

/** Una celda lista para el CSV. */
export function escapeCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  if (NEEDS_QUOTES.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Número con coma decimal ('72,5'). Supabase puede mandar los numeric como string. */
export function decimalAR(n) {
  if (n === null || n === undefined || n === '') return '';
  return String(Number(n)).replace('.', ',');
}

const pad2 = (n) => String(n).padStart(2, '0');
const text = (v) => (v === null || v === undefined ? '' : String(v));
const yesNo = (v) => (v ? 'Sí' : 'No');

/** Fecha y hora del inicio de la sesión, en Argentina. */
function startCells(startedAt) {
  const { date, hour, minute } = utcToArgentina(startedAt);
  const [year, month, day] = date.split('-');
  return [`${day}/${month}/${year}`, `${pad2(hour)}:${pad2(minute)}`];
}

/** Las 7 columnas de una serie (todas vacías si la sesión no tiene series). */
function setCells(set) {
  if (!set) return ['', '', '', '', '', '', ''];
  return [
    text(set.exercise?.name),
    // Solo si sustituyó: la relación con el original viene null si no hubo cambio.
    text(set.original?.name),
    text(set.set_number),
    text(set.actual_reps),
    decimalAR(set.actual_kg),
    yesNo(set.completed),
    text(set.rest_seconds),
  ];
}

const bySetOrder = (a, b) =>
  text(a.executed_at).localeCompare(text(b.executed_at)) || a.set_number - b.set_number;

/**
 * Filas de una sesión: una por serie (orden executed_at, set_number); sin
 * series, una sola con las columnas de serie vacías. Con `student` (export
 * del PT), antepone nombre, email y si está activo.
 */
export function sessionRows(session, student) {
  const [date, time] = startCells(session.started_at);
  const minutes = durationMin(session.started_at, session.finished_at);
  const head = [date, time, text(minutes), text(session.routine?.name)];
  const tail = [text(session.rpe), text(session.notes), text(session.trainer_comment)];
  const who = student ? [text(student.name), text(student.email), yesNo(student.active)] : [];

  const sets = [...(session.session_sets ?? [])].sort(bySetOrder);
  const perSet = sets.length > 0 ? sets : [null];
  return perSet.map((set) => [...who, ...head, ...setCells(set), ...tail]);
}

/** CSV completo: BOM, encabezado y filas, cada línea terminada en CRLF. */
export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR));
  return BOM + lines.map((line) => line + EOL).join('');
}
