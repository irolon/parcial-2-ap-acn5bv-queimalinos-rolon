/** `día` / `días`: el sustantivo en singular solo si la cantidad es exactamente 1 (para las unidades sueltas). */
export const pluralNoun = (n, one, many) => (n === 1 ? one : many);

/** `1 día`, `30 días`: la cantidad con su sustantivo en singular solo si es exactamente 1. */
export const plural = (n, one, many) => `${n} ${pluralNoun(n, one, many)}`;
