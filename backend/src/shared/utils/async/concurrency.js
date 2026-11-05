/**
 * Corre `fn` sobre cada ítem con, a lo sumo, `limit` llamadas en vuelo a la vez.
 * Apenas termina una, arranca la siguiente (una lenta ocupa un solo lugar, no frena una tanda).
 * Si `fn` lanza, el error se propaga como en Promise.all: atrapalo adentro de `fn` si no querés cortar.
 */
export async function forEachLimit(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
