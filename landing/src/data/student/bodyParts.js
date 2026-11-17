// Partes del dibujo del cuerpo (el mismo que usa la app Android, ver body-map/) que pinta cada grupo
// muscular del mapa de la página Alumnos. Las claves son las de `muscleNames` en student.js.
export const GROUP_PARTS = {
  hombro: ['deltoids'],
  pecho: ['chest'],
  abs: ['abs', 'obliques'],
  brazo: ['biceps', 'triceps'],
  ante: ['forearm'],
  cuad: ['quadriceps'],
  gem: ['calves'],
}

/** Partes que no son músculo: se dibujan siempre en el tono neutro (igual que en la app). */
export const NEUTRAL_PARTS = ['head', 'hair', 'hands', 'feet', 'ankles', 'knees']

/** Grupo muscular al que pertenece una parte del dibujo, o null si ningún ejercicio la usa. */
export const groupOfPart = (slug) =>
  Object.keys(GROUP_PARTS).find((g) => GROUP_PARTS[g].includes(slug)) ?? null
