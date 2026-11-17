// Rutinas de la demo. Los nombres son los del seed de ejercicios globales (seeds/exercises.sql)
// o los dos propios de la entrenadora (OWN_EXERCISES). baseKg/stepKg: carga inicial y suba por semana.
const ex = (name, sets, reps, rest, baseKg = 0, stepKg = 0) => ({ name, sets, reps, rest, baseKg, stepKg });

export const OWN_EXERCISES = [
  { name: 'Sentadilla goblet', muscle_group: 'legs', equipment: 'dumbbell', video_url: 'https://www.youtube.com/watch?v=MeIiIdhvXT4', description: 'Mancuerna pegada al pecho, bajá con la espalda recta hasta que los codos rocen las rodillas.' },
  { name: 'Remo con banda', muscle_group: 'back', equipment: 'band', video_url: null, description: 'Banda anclada a la altura del pecho; llevá los codos atrás juntando las escápulas.' },
];

export const PLANS = {
  torso: { name: 'Torso · hipertrofia', goal: 'hypertrophy', level: 'intermediate', exercises: [
    ex('Press banca plano', 4, 8, 120, 60, 2.5), ex('Remo con barra', 4, 10, 90, 50, 2.5),
    ex('Press militar', 3, 10, 90, 35, 1.25), ex('Jalón al pecho', 3, 12, 75, 45, 2.5),
    ex('Curl de bíceps', 3, 12, 60, 12, 0.5), ex('Extensión de tríceps polea', 3, 12, 60, 20, 1),
  ] },
  piernas: { name: 'Piernas · hipertrofia', goal: 'hypertrophy', level: 'intermediate', exercises: [
    ex('Sentadilla libre', 4, 8, 150, 70, 2.5), ex('Peso muerto rumano', 3, 10, 120, 60, 2.5),
    ex('Prensa de piernas', 3, 12, 90, 120, 5), ex('Curl femoral tumbado', 3, 12, 60, 30, 1.25),
    ex('Elevación de gemelos', 4, 15, 45, 40, 2.5),
  ] },
  bajar: { name: 'Full body · quema', goal: 'weight_loss', level: 'beginner', exercises: [
    ex('Sentadilla goblet', 3, 12, 60, 10, 1), ex('Remo con mancuerna', 3, 12, 60, 10, 0.5),
    ex('Press de pecho en máquina', 3, 12, 60, 20, 1), ex('Swing con kettlebell', 3, 15, 45, 12, 0.5),
    ex('Burpees', 3, 10, 60), ex('Crunch abdominal', 3, 15, 45),
  ] },
  fuerza: { name: 'Fuerza · básicos', goal: 'strength', level: 'advanced', exercises: [
    ex('Sentadilla libre', 5, 5, 180, 120, 2.5), ex('Press banca plano', 5, 5, 180, 90, 1.25),
    ex('Peso muerto', 3, 5, 180, 140, 2.5), ex('Press militar', 4, 6, 120, 55, 1.25),
    ex('Dominadas', 4, 6, 120),
  ] },
  plaza: { name: 'Plaza · full body', goal: 'tonify', level: 'beginner', exercises: [
    ex('Flexiones de brazos', 3, 10, 60), ex('Remo con banda', 3, 12, 60),
    ex('Zancadas con mancuernas', 3, 10, 60, 6, 0.5), ex('Fondos en banco', 3, 10, 60),
    ex('Puente de glúteos', 3, 15, 45), ex('Bicicleta abdominal', 3, 20, 45),
  ] },
  volumen: { name: 'Upper / lower', goal: 'hypertrophy', level: 'intermediate', exercises: [
    ex('Press inclinado mancuernas', 4, 10, 90, 22, 1), ex('Remo en polea baja', 4, 10, 90, 45, 2.5),
    ex('Elevaciones laterales', 3, 15, 60, 8, 0.25), ex('Curl martillo', 3, 12, 60, 14, 0.5),
  ] },
  glute: { name: 'Glúteos y piernas', goal: 'strength', level: 'intermediate', exercises: [
    ex('Hip thrust', 4, 10, 120, 60, 5), ex('Prensa de piernas', 4, 10, 90, 100, 5),
    ex('Sentadilla búlgara', 3, 10, 90, 10, 1), ex('Patada de glúteo en polea', 3, 12, 60, 15, 1),
    ex('Caminata lateral con banda', 3, 15, 45),
  ] },
};

/** Plantillas de la entrenadora: [nombre, plan, días, generada con IA]. */
export const TEMPLATES = [
  ['Hipertrofia torso / piernas', 'torso', ['monday', 'wednesday'], false],
  ['Fuerza inicial 3 días', 'fuerza', ['monday', 'wednesday', 'friday'], false],
  ['Plaza · full body sin máquinas (IA)', 'plaza', ['tuesday', 'thursday', 'saturday'], true],
];
