import { texts } from '../../../../src/models/notifications/texts.js';

describe('texts', () => {
  it('inactivity', () => {
    expect(texts.inactivity({ studentName: 'Ana', daysSince: 10, missed: 4 })).toEqual({
      title: 'Ana no entrena hace 10 días',
      body: 'Se salteó 4 días de su rutina. Escribile para retomar.',
    });
  });

  it('routineModified con una sustitución', () => {
    expect(
      texts.routineModified({
        studentName: 'Ana',
        date: '2026-10-05',
        substitutions: [{ from: 'Sentadilla', to: 'Prensa' }],
      })
    ).toEqual({
      title: 'Ana modificó su rutina',
      body: 'En la sesión del 05/10 sustituyó Sentadilla por Prensa',
    });
  });

  it('routineModified con varias sustituciones', () => {
    const { body } = texts.routineModified({
      studentName: 'Ana',
      date: '2026-10-05',
      substitutions: [
        { from: 'A', to: 'B' },
        { from: 'C', to: 'D' },
      ],
    });
    expect(body).toBe('En la sesión del 05/10 sustituyó 2 ejercicios');
  });

  it('prForStudent uno y varios', () => {
    expect(texts.prForStudent({ exerciseNames: ['Press banca'], date: '2026-10-30' })).toEqual({
      title: '¡Nuevo récord en Press banca!',
      body: 'Sesión del 30/10',
    });
    expect(texts.prForStudent({ exerciseNames: ['A', 'B', 'C'], date: '2026-10-30' }).title).toBe(
      '¡3 récords nuevos!'
    );
  });

  it('prForTrainer uno y varios', () => {
    expect(texts.prForTrainer({ studentName: 'Ana', exerciseNames: ['Peso muerto'] }).title).toBe(
      'Ana hizo un récord en Peso muerto'
    );
    expect(texts.prForTrainer({ studentName: 'Ana', exerciseNames: ['A', 'B'] }).title).toBe(
      'Ana hizo 2 récords'
    );
  });

  it('logros', () => {
    expect(texts.achievementForStudent({ name: 'Racha 7', description: 'Siete días' })).toEqual({
      title: '¡Logro desbloqueado: Racha 7!',
      body: 'Siete días',
    });
    expect(texts.achievementsSummary(['A', 'B'])).toEqual({
      title: 'Desbloqueaste 2 logros',
      body: 'A, B',
    });
    expect(texts.achievementForTrainer({ studentName: 'Ana', name: 'Racha 7' }).title).toBe(
      'Ana desbloqueó Racha 7'
    );
  });

  it('comment recorta a 120 caracteres en total, con elipsis', () => {
    const long = 'x'.repeat(130);
    const { title, body } = texts.comment({ date: '2026-10-05', comment: long });
    expect(title).toBe('Tu entrenador comentó tu sesión del 05/10');
    expect(body).toBe(`${'x'.repeat(119)}…`);
    expect(texts.comment({ date: '2026-10-05', comment: 'ok' }).body).toBe('ok');
  });

  it('el título se recorta a 150 caracteres', () => {
    const { title } = texts.achievementForStudent({ name: 'n'.repeat(200), description: 'd' });
    expect(title).toHaveLength(150);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('texts sin detalle', () => {
  it('los avisos al PT de récord y logro no llevan body', () => {
    expect(texts.prForTrainer({ studentName: 'Ana', exerciseNames: ['A'] }).body).toBeNull();
    expect(texts.achievementForTrainer({ studentName: 'Ana', name: 'X' }).body).toBeNull();
  });
});

describe('texts · message', () => {
  it('título = quien escribe; cuerpo = el texto', () => {
    expect(texts.message({ senderName: 'Ana', body: 'hola', hasImage: false })).toEqual({
      title: 'Ana',
      body: 'hola',
    });
  });

  it('solo foto → "📷 Foto"; foto y texto → "📷 Foto · <texto>"', () => {
    expect(texts.message({ senderName: 'Ana', body: null, hasImage: true }).body).toBe('📷 Foto');
    expect(texts.message({ senderName: 'Ana', body: 'mirá', hasImage: true }).body).toBe('📷 Foto · mirá');
  });

  const msg = (body) => texts.message({ senderName: 'Ana', body, hasImage: false }).body;
  const codePoints = (s) => Array.from(s).length;

  it('recorta el texto a 120 caracteres en total, con "…"', () => {
    expect(msg('x'.repeat(300))).toBe(`${'x'.repeat(119)}…`);
    expect(msg('y'.repeat(120))).toBe('y'.repeat(120));
  });

  it('cuenta por puntos de código: 119 letras + 😀 son 120 y no se corta', () => {
    const text = `${'a'.repeat(119)}😀`;
    expect(msg(text)).toBe(text);
  });

  it('121 puntos de código: se corta sin partir el emoji y no pasa de 120', () => {
    const cut = msg(`${'a'.repeat(118)}😀bc`);
    expect(cut).toBe(`${'a'.repeat(118)}😀…`);
    expect(codePoints(cut)).toBe(120);
    expect(cut.isWellFormed()).toBe(true);
  });

  it('emoji justo en el límite del corte: queda entero, sin surrogate suelto (�)', () => {
    const cut = msg('😀'.repeat(121));
    expect(cut).toBe(`${'😀'.repeat(119)}…`);
    expect(cut.isWellFormed()).toBe(true);
  });

  it('el título también cuenta por puntos de código', () => {
    const { title } = texts.message({ senderName: '😀'.repeat(200), body: 'hola', hasImage: false });
    expect(codePoints(title)).toBe(150);
    expect(title.isWellFormed()).toBe(true);
  });
});
