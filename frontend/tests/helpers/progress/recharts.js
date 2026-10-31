import { cloneElement } from 'react';

/** Mock de `recharts`: jsdom no mide el layout, así que el gráfico recibe un tamaño fijo. */
export async function mockRecharts(importOriginal) {
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
}
