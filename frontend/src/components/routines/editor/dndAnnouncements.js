const position = (event, from) => {
  const { index, items } = event[from].data.current.sortable;
  return `${index + 1} de ${items.length}`;
};

/** Textos de dnd-kit en español (anuncios y instrucciones para lectores de pantalla). `namesByKey` mapea `key` → nombre. */
export function dndAnnouncements(namesByKey) {
  const name = (id) => namesByKey[id] ?? 'El ejercicio';
  return {
    announcements: {
      onDragStart: (e) => `Levantaste ${name(e.active.id)}. Está en la posición ${position(e, 'active')}.`,
      onDragOver: (e) => (e.over && e.over.id !== e.active.id ? `Moviste ${name(e.active.id)} a la posición ${position(e, 'over')}.` : undefined),
      onDragEnd: (e) => (e.over
        ? `Soltaste ${name(e.active.id)} en la posición ${position(e, 'over')}.`
        : `Soltaste ${name(e.active.id)} en su lugar.`),
      onDragCancel: (e) => `Cancelaste. ${name(e.active.id)} volvió a la posición ${position(e, 'active')}.`,
    },
    screenReaderInstructions: {
      draggable:
        'Para mover un ejercicio, enfocá el asa y presioná Espacio. Usá las flechas arriba y abajo para cambiar su posición, Espacio para soltarlo o Esc para cancelar.',
    },
  };
}
