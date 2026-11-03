import { describe, expect, it } from 'vitest';
import { filterByStudentName, normalizeText } from '@/utils/messages/searchName';
import { studentsLabel } from '@/utils/messages/studentsLabel';

const list = [{ student: { name: 'Ángeles Pérez' } }, { student: { name: 'Tomás Ruiz' } }];

describe('searchName', () => {
  it('normaliza acentos y mayúsculas', () => {
    expect(normalizeText('  ÁNGELES  ')).toBe('angeles');
  });

  it('filtra sin acentos ni mayúsculas y vacío devuelve todo', () => {
    expect(filterByStudentName(list, 'angeles')).toEqual([list[0]]);
    expect(filterByStudentName(list, 'TOMAS')).toEqual([list[1]]);
    expect(filterByStudentName(list, 'perez')).toEqual([list[0]]);
    expect(filterByStudentName(list, '  ')).toEqual(list);
    expect(filterByStudentName(list, 'zzz')).toEqual([]);
  });

  it('studentsLabel singular y plural', () => {
    expect(studentsLabel(1)).toBe('1 alumno');
    expect(studentsLabel(0)).toBe('0 alumnos');
    expect(studentsLabel(3)).toBe('3 alumnos');
  });
});
