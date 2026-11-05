import { describe, expect, it } from 'vitest';
import {
  KG_INPUT, REPS_INPUT, cleanKgText, cleanRepsText, stepKg, stepReps, validateLoad,
} from '@/utils/workout/loadFields';

describe('stepKg', () => {
  it('sube y baja de a 2,5 kg, con coma decimal', () => {
    expect(stepKg('62,5', 2.5)).toBe('65');
    expect(stepKg('62,5', -2.5)).toBe('60');
    expect(stepKg('62,25', 2.5)).toBe('64,75');
    expect(stepKg('62.5', 2.5)).toBe('65');
  });

  it('desde el peso corporal (vacío) sube a 2,5 y vuelve al peso corporal al llegar a 0', () => {
    expect(stepKg('', 2.5)).toBe('2,5');
    expect(stepKg('2,5', -2.5)).toBe('');
    expect(stepKg('1', -2.5)).toBe('');
    expect(stepKg('', -2.5)).toBe('');
  });

  it('no pasa de 1000 kg', () => {
    expect(stepKg('999', 2.5)).toBe('1000');
    expect(stepKg('1000', 2.5)).toBe('1000');
    expect(stepKg('1250', -2.5)).toBe('997,5');
  });

  it('un texto ilegible cuenta como peso corporal', () => {
    expect(stepKg(',', 2.5)).toBe('2,5');
    expect(stepKg('abc', 2.5)).toBe('2,5');
  });

  it('no arrastra errores de coma flotante', () => {
    expect(stepKg('0,1', 2.5)).toBe('2,6');
    expect(stepKg('0,3', 2.5)).toBe('2,8');
  });
});

describe('stepReps', () => {
  it('suma y resta de a una, entre 0 y 1000', () => {
    expect(stepReps('10', 1)).toBe('11');
    expect(stepReps('10', -1)).toBe('9');
    expect(stepReps('0', -1)).toBe('0');
    expect(stepReps('1000', 1)).toBe('1000');
  });

  it('un campo vacío empieza de 0', () => {
    expect(stepReps('', 1)).toBe('1');
    expect(stepReps('', -1)).toBe('0');
  });
});

describe('cleanKgText (al salir del campo)', () => {
  it('deja el peso como lo guarda la sesión', () => {
    expect(cleanKgText('62,')).toBe('62');
    expect(cleanKgText('62.50')).toBe('62,5');
    expect(cleanKgText(',5')).toBe('0,5');
  });

  it('vacío o 0 es peso corporal', () => {
    expect(cleanKgText('')).toBe('');
    expect(cleanKgText('0')).toBe('');
    expect(cleanKgText('  ')).toBe('');
  });

  it('un texto ilegible, o de más de 1000 kg, se deja como está para poder avisar', () => {
    expect(cleanKgText(',')).toBe(',');
    expect(cleanKgText('1250')).toBe('1250');
  });
});

describe('cleanRepsText (al salir del campo)', () => {
  it('quita ceros de más y recorta a 1000', () => {
    expect(cleanRepsText('0010')).toBe('10');
    expect(cleanRepsText('5000')).toBe('1000');
    expect(cleanRepsText('0')).toBe('0');
  });

  it('vacío sigue vacío', () => {
    expect(cleanRepsText('')).toBe('');
  });
});

describe('lo que se deja escribir', () => {
  it('peso: hasta 4 dígitos y 2 decimales, con coma o punto', () => {
    ['', '6', '62', '62,', '62,5', '62.25', ',5', '1000'].forEach((text) => expect(KG_INPUT.test(text)).toBe(true));
    ['62,255', 'abc', '62,5 kg', '6,2,5', '12345', '-5'].forEach((text) => expect(KG_INPUT.test(text)).toBe(false));
  });

  it('reps: solo dígitos, hasta 4', () => {
    ['', '0', '10', '1000'].forEach((text) => expect(REPS_INPUT.test(text)).toBe(true));
    ['8,5', '1.5', 'x', '12345', '-1'].forEach((text) => expect(REPS_INPUT.test(text)).toBe(false));
  });
});

describe('validateLoad', () => {
  it('sin errores cuando el peso (o peso corporal) y las reps se pueden registrar', () => {
    expect(validateLoad('62,5', '10')).toEqual({});
    expect(validateLoad('', '0')).toEqual({});
  });

  it('avisa de las reps vacías', () => {
    expect(validateLoad('60', '')).toEqual({ reps: 'Escribí las repeticiones como un número entero.' });
  });

  it('avisa del peso de más de 1000 kg en vez de recortarlo', () => {
    expect(validateLoad('1250', '10')).toEqual({ kg: 'El peso no puede pasar de 1000 kg.' });
    expect(validateLoad('1000', '10')).toEqual({});
  });

  it('avisa del peso ilegible', () => {
    expect(validateLoad(',', '10')).toEqual({ kg: 'Escribí el peso como número, por ejemplo 62,5.' });
  });

  it('avisa de los dos a la vez', () => {
    expect(Object.keys(validateLoad('.', ''))).toEqual(['kg', 'reps']);
  });
});
