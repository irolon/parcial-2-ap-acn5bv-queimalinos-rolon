import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RPE_LABELS, RPE_VALUES, rpeLabel } from '@/utils/sessions/rpe';

// Desde este archivo (frontend/tests/utils/sessions) al del celular, sin depender de desde dónde se corra vitest.
// Se usa `import.meta.dirname` y no `new URL('…', import.meta.url)`: Vite reescribe esa forma literal a una URL http
// del servidor de desarrollo y `fileURLToPath` falla ("The URL must be of scheme file").
const RPE_TEXTS_KT = resolve(
  import.meta.dirname,
  '../../../../mobile/app/src/main/java/com/fittrainer/ui/workout/RpeTexts.kt',
);

describe('RPE_LABELS', () => {
  it('son las diez etiquetas de la escala, de la más suave a la más dura', () => {
    expect(RPE_LABELS).toHaveLength(10);
    expect(RPE_LABELS[0]).toBe('Muy fácil, como entrar en calor');
    expect(RPE_LABELS[6]).toBe('Difícil, te quedaban 2-3 reps');
    expect(RPE_LABELS[9]).toBe('Al fallo, no salía ni una más');
  });

  // El celular es la fuente de las etiquetas: si cambian allá, este test avisa que la web quedó vieja.
  it.skipIf(!existsSync(RPE_TEXTS_KT))('copia literal las etiquetas de mobile (RpeTexts.kt)', () => {
    const source = readFileSync(RPE_TEXTS_KT, 'utf8');
    const list = source.slice(source.indexOf('listOf('), source.indexOf('\n)', source.indexOf('listOf(')));
    const labels = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(RPE_LABELS).toEqual(labels);
  });
});

describe('RPE_VALUES', () => {
  it('va de 1 a 10', () => {
    expect(RPE_VALUES).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('rpeLabel', () => {
  it('devuelve la etiqueta de cada RPE', () => {
    RPE_VALUES.forEach((rpe) => expect(rpeLabel(rpe)).toBe(RPE_LABELS[rpe - 1]));
    expect(rpeLabel(8)).toBe('Muy difícil, te quedaban 1-2 reps');
  });

  it('da null fuera de la escala o si no es un entero (un dato raro no tira la pantalla)', () => {
    [0, 11, -1, 7.5, '7', null, undefined, NaN].forEach((rpe) => expect(rpeLabel(rpe)).toBeNull());
  });
});
