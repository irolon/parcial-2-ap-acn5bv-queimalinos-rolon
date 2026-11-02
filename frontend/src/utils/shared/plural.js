/** `1 día`, `30 días`: la cantidad con su sustantivo en singular solo si es exactamente 1. */
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
