import {
  STUDENT_HEADERS,
  TRAINER_HEADERS,
  escapeCell,
  decimalAR,
  sessionRows,
  toCsv,
} from '../../../../src/models/export/sessions-csv.js';

const SET = {
  set_number: 1,
  actual_reps: 10,
  actual_kg: 72.5,
  completed: true,
  rest_seconds: 90,
  executed_at: '2026-11-09T02:40:00Z',
  exercise: { name: 'Press banca' },
  original: null,
};
const SESSION = {
  started_at: '2026-11-09T02:30:00Z',
  finished_at: '2026-11-09T03:15:20Z',
  rpe: 8,
  notes: 'Buena',
  trainer_comment: null,
  routine: { name: 'Día A' },
  session_sets: [SET],
};

describe('sessions-csv · encabezados', () => {
  it('el alumno tiene las 14 columnas y el PT suma Alumno, Email y Activo adelante', () => {
    expect(STUDENT_HEADERS).toEqual([
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
    ]);
    expect(TRAINER_HEADERS).toEqual(['Alumno', 'Email', 'Activo', ...STUDENT_HEADERS]);
  });
});

describe('sessions-csv · escapeCell y decimalAR', () => {
  it('null y undefined → vacío; números como texto', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
    expect(escapeCell(12)).toBe('12');
  });

  it('con ; " o saltos de línea va entre comillas con las comillas duplicadas', () => {
    expect(escapeCell('Press; banca')).toBe('"Press; banca"');
    expect(escapeCell('dijo "bien"')).toBe('"dijo ""bien"""');
    expect(escapeCell('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(escapeCell('a\rb')).toBe('"a\rb"');
  });

  it.each(['=SUMA(A1)', '+54 11', '-hola', '@cmd', '\tx'])(
    '%j empieza como fórmula → lleva apóstrofo adelante',
    (text) => expect(escapeCell(text).startsWith(`'${text[0]}`)).toBe(true)
  );

  it('decimales con coma', () => {
    expect(decimalAR(72.5)).toBe('72,5');
    expect(decimalAR('72.50')).toBe('72,5');
    expect(decimalAR(80)).toBe('80');
    expect(decimalAR(null)).toBe('');
  });
});

describe('sessions-csv · sessionRows', () => {
  it('una fila por serie con fecha y hora de Argentina, duración y kg con coma', () => {
    expect(sessionRows(SESSION)).toEqual([
      [
        '08/11/2026',
        '23:30',
        '45',
        'Día A',
        'Press banca',
        '',
        '1',
        '10',
        '72,5',
        'Sí',
        '90',
        '8',
        'Buena',
        '',
      ],
    ]);
  });

  it('ordena las series por executed_at y set_number', () => {
    const later = {
      ...SET,
      set_number: 1,
      executed_at: '2026-11-09T02:50:00Z',
      exercise: { name: 'Remo' },
    };
    const second = { ...SET, set_number: 2 };
    const rows = sessionRows({ ...SESSION, session_sets: [later, second, SET] });
    expect(rows.map((r) => [r[4], r[6]])).toEqual([
      ['Press banca', '1'],
      ['Press banca', '2'],
      ['Remo', '1'],
    ]);
  });

  it('sesión sin series → una fila con las 7 columnas de serie vacías', () => {
    const [row, ...rest] = sessionRows({ ...SESSION, session_sets: [] });
    expect(rest).toEqual([]);
    expect(row.slice(4, 11)).toEqual(['', '', '', '', '', '', '']);
    expect(row[3]).toBe('Día A');
    expect(row[11]).toBe('8');
  });

  it('sin finished_at (sesión en curso) → duración vacía y el resto igual', () => {
    const [row] = sessionRows({ ...SESSION, finished_at: null });
    expect(row[2]).toBe('');
    expect(row[4]).toBe('Press banca');
  });

  it('serie no completada, sin rutina ni rpe', () => {
    const [row] = sessionRows({
      ...SESSION,
      routine: null,
      rpe: null,
      session_sets: [{ ...SET, completed: false, actual_kg: null, rest_seconds: null }],
    });
    expect([row[3], row[8], row[9], row[10], row[11]]).toEqual(['', '', 'No', '', '']);
  });

  it('con sustitución, "Ejercicio planificado" lleva el nombre del original', () => {
    const [row] = sessionRows({
      ...SESSION,
      session_sets: [
        { ...SET, exercise: { name: 'Mancuernas' }, original: { name: 'Press banca' } },
      ],
    });
    expect([row[4], row[5]]).toEqual(['Mancuernas', 'Press banca']);
  });

  it('con alumno antepone nombre, email y Activo (No si está de baja)', () => {
    const [row] = sessionRows(SESSION, { name: 'Martín', email: 'm@x.com', active: false });
    expect(row.slice(0, 4)).toEqual(['Martín', 'm@x.com', 'No', '08/11/2026']);
    expect(row).toHaveLength(TRAINER_HEADERS.length);
  });
});

describe('sessions-csv · toCsv', () => {
  const csv = toCsv(STUDENT_HEADERS, [['=SUMA(A1)', 'Press; banca', 'nota\ncon salto']]);

  it('empieza con BOM, separa con ; y termina cada línea en CRLF', () => {
    expect(csv.startsWith('﻿Fecha;Hora;Duración (min);')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('escapa cada celda', () => {
    expect(csv.split('\r\n')[1]).toBe(`'=SUMA(A1);"Press; banca";"nota\ncon salto"`);
  });

  it('sin filas → solo el encabezado', () => {
    expect(toCsv(['A', 'B'], [])).toBe('﻿A;B\r\n');
  });
});
