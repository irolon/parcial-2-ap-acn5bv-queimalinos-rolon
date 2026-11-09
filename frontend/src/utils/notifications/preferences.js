/** Los cinco tipos de aviso que el alumno puede apagar, en el orden de la pantalla (y del body del PUT). */
export const PREFERENCE_ITEMS = [
  { type: 'message', title: 'Mensajes', detail: 'Cuando tu entrenador/a te escribe' },
  { type: 'comment', title: 'Comentarios', detail: 'Cuando comenta una de tus sesiones' },
  { type: 'appointment', title: 'Turnos', detail: 'Cuando confirma, cancela o te agenda un turno' },
  { type: 'pr', title: 'Récords', detail: 'Cuando superás una marca personal' },
  { type: 'achievement', title: 'Logros', detail: 'Cuando desbloqueás un logro' },
];

/** Solo los cinco booleanos (sin `updated_at` ni nada de más). */
export function pickPreferences(prefs) {
  return Object.fromEntries(PREFERENCE_ITEMS.map(({ type }) => [type, prefs[type]]));
}

/** Subtítulo de la fila: "Todas activadas", "N de 5 activadas" o "Todas apagadas". */
export function summary(prefs) {
  const total = PREFERENCE_ITEMS.length;
  const on = PREFERENCE_ITEMS.filter(({ type }) => prefs[type] !== false).length;
  if (on === total) return 'Todas activadas';
  if (on === 0) return 'Todas apagadas';
  return `${on} de ${total} activadas`;
}
