import { describe, expect, it } from 'vitest';
import {
  addEquipment,
  buildContextBody,
  buildStudentBody,
  validateStudentBody,
} from '@/utils/students/studentForm';

const STUDENT = { name: 'Ana Paz', goal: 'strength', level: 'intermediate', birth_date: '1990-05-10' };

const form = (values) => new Map(Object.entries({ ...STUDENT, ...values }));

describe('buildStudentBody', () => {
  it('sin cambios devuelve un body vacío', () => {
    expect(buildStudentBody(form({}), STUDENT)).toEqual({});
  });

  it('manda solo lo que cambió y recorta el nombre', () => {
    expect(buildStudentBody(form({ name: '  Ana Gómez ', goal: 'tonify' }), STUDENT)).toEqual({
      name: 'Ana Gómez',
      goal: 'tonify',
    });
  });

  it('una fecha vaciada va como null y un nivel vacío no se manda', () => {
    expect(buildStudentBody(form({ birth_date: '', level: '' }), STUDENT)).toEqual({ birth_date: null });
  });
});

describe('validateStudentBody', () => {
  const now = new Date('2026-10-25T12:00:00');

  it('valida el largo del nombre y que la fecha no sea futura', () => {
    expect(validateStudentBody({ name: 'A', birth_date: '2027-01-01' }, now)).toEqual({
      name: 'El nombre debe tener entre 2 y 100 caracteres',
      birth_date: 'La fecha no puede ser futura',
    });
  });

  it('acepta un body válido', () => {
    expect(validateStudentBody({ name: 'Ana', birth_date: '2026-10-25' }, now)).toEqual({});
  });
});

describe('contexto de IA', () => {
  it('lo vacío va como null', () => {
    expect(buildContextBody([], '  ')).toEqual({ gym_equipment: null, injuries: null });
    expect(buildContextBody(['band'], ' Rodilla ')).toEqual({ gym_equipment: ['band'], injuries: 'Rodilla' });
  });

  it('addEquipment recorta, no duplica ni pasa de 30', () => {
    expect(addEquipment(['band'], '  Banco ')).toEqual(['band', 'Banco']);
    expect(addEquipment(['Banco'], 'banco')).toEqual(['Banco']);
    expect(addEquipment(['band'], 'Banda')).toEqual(['band']);
    expect(addEquipment(['band'], '   ')).toEqual(['band']);
    const full = Array.from({ length: 30 }, (_, i) => `x${i}`);
    expect(addEquipment(full, 'otro')).toBe(full);
  });
});
