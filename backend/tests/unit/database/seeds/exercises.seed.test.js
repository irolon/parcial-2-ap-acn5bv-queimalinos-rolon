import { fileURLToPath } from 'node:url';
import { MUSCLE_GROUPS, EQUIPMENT } from '../../../../src/models/exercises/exercise.model.js';
import { parseExerciseSeed } from '../../../helpers/exercises/seed-parser.js';

const SEED_PATH = fileURLToPath(
  new URL('../../../../src/database/seeds/exercises.sql', import.meta.url),
);

const EXPECTED_PER_GROUP = {
  chest: 6,
  back: 6,
  shoulders: 5,
  legs: 8,
  glutes: 4,
  biceps: 4,
  triceps: 4,
  core: 5,
  calves: 3,
  full_body: 3,
  cardio: 2,
};

const EXISTING_NAMES = [
  'Press banca plano',
  'Press inclinado mancuernas',
  'Aperturas en polea',
  'Dominadas',
  'Remo con barra',
  'Jalón al pecho',
  'Press militar',
  'Elevaciones laterales',
  'Sentadilla libre',
  'Prensa de piernas',
  'Peso muerto',
  'Hip thrust',
  'Curl de bíceps',
  'Extensión de tríceps polea',
  'Plancha abdominal',
  'Elevación de gemelos',
  'Burpees',
  'Cinta de correr',
];

const YOUTUBE_URL = /^https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}$/;

describe('seed de ejercicios globales', () => {
  const rows = parseExerciseSeed(SEED_PATH);

  it('tiene exactamente 50 ejercicios, todos globales', () => {
    expect(rows).toHaveLength(50);
    expect(rows.every((row) => row.isGlobal === true)).toBe(true);
  });

  it('usa solo grupos musculares y equipamientos definidos en el modelo', () => {
    expect(rows.filter((r) => !MUSCLE_GROUPS.includes(r.muscleGroup))).toEqual([]);
    expect(rows.filter((r) => !EQUIPMENT.includes(r.equipment))).toEqual([]);
  });

  it('respeta el reparto por grupo muscular', () => {
    const counts = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0]));
    rows.forEach((r) => {
      counts[r.muscleGroup] = (counts[r.muscleGroup] ?? 0) + 1;
    });
    expect(counts).toEqual(EXPECTED_PER_GROUP);
  });

  it('en cada grupo con 4 o más ejercicios hay al menos 2 equipamientos distintos', () => {
    MUSCLE_GROUPS.forEach((group) => {
      const inGroup = rows.filter((r) => r.muscleGroup === group);
      if (inGroup.length >= 4) {
        expect(new Set(inGroup.map((r) => r.equipment)).size).toBeGreaterThanOrEqual(2);
      }
    });
  });

  it('no repite nombres', () => {
    const names = rows.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('cada ejercicio tiene un video_url de YouTube y una descripción', () => {
    expect(rows.filter((r) => !YOUTUBE_URL.test(r.videoUrl)).map((r) => r.name)).toEqual([]);
    expect(rows.filter((r) => r.description.trim() === '').map((r) => r.name)).toEqual([]);
  });

  it('conserva los 18 nombres que ya existían', () => {
    const names = rows.map((r) => r.name);
    expect(EXISTING_NAMES.filter((name) => !names.includes(name))).toEqual([]);
  });
});
