import {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateFromRoutine,
  validateListQuery,
  validateIdParam,
  validateInstantiate,
} from '../../../../src/validations/routine-templates/routine-templates.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const EX = { exercise_id: UUID, sets: 3, reps: 10 };
const structure = (patch = {}) => ({ version: 1, days: ['monday'], exercises: [EX], ...patch });
const body = (patch = {}) => ({ name: 'Full body', goal: 'strength', structure: structure(), ...patch });

const fields = (fn, input) => {
  try {
    fn(input);
  } catch (err) {
    return err.details.map((d) => d.field);
  }
  return [];
};

describe('routine-templates.validation', () => {
  describe('validateCreateTemplate', () => {
    it('devuelve la estructura saneada, con order por defecto = posición', () => {
      const out = validateCreateTemplate(body({ level: 'beginner' }));
      expect(out).toMatchObject({ name: 'Full body', goal: 'strength', level: 'beginner' });
      expect(out.structure).toEqual({
        version: 1,
        days: ['monday'],
        exercises: [
          { exercise_id: UUID, sets: 3, reps: 10, rest_seconds: null, suggested_kg: null, tempo: null, notes: null, order: 0 },
        ],
      });
    });

    it('renumera el orden sin repetidos al mezclar explícito e implícito', () => {
      const exercises = [{ ...EX, order: 1 }, { ...EX }];
      const out = validateCreateTemplate(body({ structure: structure({ exercises }) }));
      expect(out.structure.exercises.map((e) => e.order)).toEqual([0, 1]);
    });

    it('descarta propiedades desconocidas e ignora frequency_per_week', () => {
      const out = validateCreateTemplate(
        body({ frequency_per_week: 5, hack: 1, structure: structure({ extra: true }) })
      );
      expect(out.frequency_per_week).toBeUndefined();
      expect(out.hack).toBeUndefined();
      expect(Object.keys(out.structure).sort()).toEqual(['days', 'exercises', 'version']);
    });

    it('rechaza días repetidos', () => {
      const days = ['monday', 'monday'];
      expect(fields(validateCreateTemplate, body({ structure: structure({ days }) }))).toContain('structure.days');
    });

    it('rechaza days vacío', () => {
      expect(fields(validateCreateTemplate, body({ structure: structure({ days: [] }) }))).toContain('structure.days');
    });

    it('rechaza más de 50 ejercicios', () => {
      const exercises = Array.from({ length: 51 }, () => EX);
      expect(fields(validateCreateTemplate, body({ structure: structure({ exercises }) }))).toContain('structure.exercises');
    });

    it('rechaza exercises que no es un arreglo', () => {
      expect(fields(validateCreateTemplate, body({ structure: structure({ exercises: {} }) }))).toContain('structure.exercises');
    });

    it('rechaza days string y structure null o arreglo', () => {
      expect(fields(validateCreateTemplate, body({ structure: structure({ days: 'monday' }) }))).toContain('structure.days');
      expect(fields(validateCreateTemplate, body({ structure: null }))).toContain('structure');
      expect(fields(validateCreateTemplate, body({ structure: [] }))).toContain('structure');
    });

    it('rechaza version distinta de 1', () => {
      expect(fields(validateCreateTemplate, body({ structure: structure({ version: 2 }) }))).toContain('structure.version');
    });

    it('rechaza goal ausente y level inválido', () => {
      expect(fields(validateCreateTemplate, body({ goal: undefined }))).toContain('goal');
      expect(fields(validateCreateTemplate, body({ level: 'pro' }))).toContain('level');
    });

    it('valida cada ejercicio con su prefijo', () => {
      const exercises = [{ ...EX, sets: 0 }];
      expect(fields(validateCreateTemplate, body({ structure: structure({ exercises }) }))).toContain(
        'structure.exercises[0].sets'
      );
    });
  });

  describe('validateUpdateTemplate', () => {
    it('exige al menos un campo', () => {
      expect(fields(validateUpdateTemplate, {})).toContain('body');
    });

    it('acepta campos sueltos y level null', () => {
      expect(validateUpdateTemplate({ name: ' Nuevo ', level: null })).toEqual({ name: 'Nuevo', level: null });
    });

    it('sanea structure si viene y descarta claves desconocidas', () => {
      const out = validateUpdateTemplate({ structure: structure({ extra: true }) });
      expect(out.structure.days).toEqual(['monday']);
      expect(Object.keys(out.structure).sort()).toEqual(['days', 'exercises', 'version']);
    });
  });

  describe('validateFromRoutine', () => {
    it('valida routine_id y campos opcionales', () => {
      expect(validateFromRoutine({ routine_id: UUID, name: ' X1 ', level: 'advanced' })).toEqual({
        routine_id: UUID,
        name: 'X1',
        level: 'advanced',
      });
      expect(fields(validateFromRoutine, { routine_id: 'x' })).toContain('routine_id');
      expect(fields(validateFromRoutine, { routine_id: UUID, level: 'pro' })).toContain('level');
    });
    it('goal es opcional pero tiene que ser un objetivo válido', () => {
      expect(validateFromRoutine({ routine_id: UUID, goal: 'strength' })).toEqual({
        routine_id: UUID,
        goal: 'strength',
      });
      expect(fields(validateFromRoutine, { routine_id: UUID, goal: 'x' })).toEqual(['goal']);
    });
  });

  describe('validateListQuery', () => {
    it('mapea filtros', () => {
      expect(validateListQuery({ goal: 'strength', level: 'beginner', generated_by_ai: 'true' })).toEqual({
        goal: 'strength',
        level: 'beginner',
        generatedByAi: true,
      });
      expect(validateListQuery({})).toEqual({});
    });

    it('rechaza valores inválidos', () => {
      expect(fields(validateListQuery, { goal: 'x', level: 'y', generated_by_ai: 'si' })).toEqual([
        'goal',
        'level',
        'generated_by_ai',
      ]);
    });
  });

  describe('validateInstantiate', () => {
    it('acepta solo student_id y opcionales name y days', () => {
      expect(validateInstantiate({ student_id: UUID })).toEqual({ student_id: UUID });
      expect(validateInstantiate({ student_id: UUID, name: ' Rutina ', days: ['monday', 'friday'] })).toEqual({
        student_id: UUID,
        name: 'Rutina',
        days: ['monday', 'friday'],
      });
    });

    it('rechaza student_id inválido, name corto y days inválidos', () => {
      expect(fields(validateInstantiate, { student_id: 'x', name: 'a' })).toEqual(['student_id', 'name']);
      expect(fields(validateInstantiate, { student_id: UUID, days: ['monday', 'monday'] })).toEqual(['days']);
      expect(fields(validateInstantiate, { student_id: UUID, days: [] })).toEqual(['days']);
      expect(fields(validateInstantiate, { student_id: UUID, days: ['funday'] })).toEqual(['days']);
    });
  });

  it('validateIdParam exige uuid', () => {
    expect(validateIdParam({ id: UUID })).toEqual({ id: UUID });
    expect(fields(validateIdParam, { id: '1' })).toContain('id');
  });
});
