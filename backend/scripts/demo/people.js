// Personas de la demo. Todas usan la contraseña de DEMO_PASSWORD y el dominio DEMO_DOMAIN.
export const DEMO_DOMAIN = 'demo.fittrainer.dev';
export const DEMO_EMAIL_LIKE = `%@${DEMO_DOMAIN}`;
const email = (user) => `${user}@${DEMO_DOMAIN}`;

const FULL_GYM = ['Barra', 'Mancuernas', 'Banco plano', 'Polea', 'Máquinas', 'Rack'];

export const TRAINER = {
  name: 'Laura Gómez',
  email: email('laura'),
  specialty: 'Hipertrofia y fuerza',
  professional_title: 'Profesora de Educación Física',
};

/** Disponibilidad: lunes a viernes (1–5) de 8 a 12 y de 17 a 21. */
export const AVAILABILITY = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, start_time: '08:00', end_time: '12:00' },
  { weekday, start_time: '17:00', end_time: '21:00' },
]);

/**
 * Alumnos. `routines`: [plan, días]. `weeks`: semanas de historial. `stoppedDaysAgo`: dejó de venir.
 * `metrics`: [peso inicial, peso actual, altura]. `seed`: semilla del historial.
 */
export const STUDENTS = [
  { key: 'martin', name: 'Martín Ríos', email: email('martin'), goal: 'hypertrophy', level: 'intermediate',
    birth_date: '1997-04-12', phone: '+5491155550101', weekly_frequency: 4, gym_equipment: FULL_GYM,
    injuries: 'Molestia leve en el hombro derecho', seed: 11, weeks: 8, skipRate: 0.08,
    routines: [['torso', ['monday', 'wednesday']], ['piernas', ['tuesday', 'friday']]], metrics: [78, 81.5, 178] },
  { key: 'sofia', name: 'Sofía Herrera', email: email('sofia'), goal: 'weight_loss', level: 'beginner',
    birth_date: '1993-09-03', phone: '+5491155550102', weekly_frequency: 3, gym_equipment: FULL_GYM,
    injuries: null, seed: 22, weeks: 6, skipRate: 0.15,
    routines: [['bajar', ['monday', 'wednesday', 'friday']]], metrics: [72, 67.4, 165] },
  { key: 'lucas', name: 'Lucas Fernández', email: email('lucas'), goal: 'strength', level: 'advanced',
    birth_date: '1991-01-27', phone: null, weekly_frequency: 4, gym_equipment: FULL_GYM,
    injuries: null, seed: 33, weeks: 8, skipRate: 0.1,
    routines: [['fuerza', ['monday', 'tuesday', 'thursday', 'friday']]], metrics: [88, 90, 182] },
  { key: 'valentina', name: 'Valentina Torres', email: email('valentina'), goal: 'tonify', level: 'beginner',
    birth_date: '2001-06-18', phone: '+5491155550104', weekly_frequency: 3, gym_equipment: ['Mancuernas', 'Banda elástica'],
    injuries: null, seed: 44, weeks: 4, skipRate: 0.2,
    routines: [['plaza', ['tuesday', 'thursday', 'saturday']]], metrics: [60, 58.8, 162] },
  { key: 'diego', name: 'Diego Morales', email: email('diego'), goal: 'hypertrophy', level: 'intermediate',
    birth_date: '1995-11-30', phone: '+5491155550105', weekly_frequency: 4, gym_equipment: FULL_GYM,
    injuries: null, seed: 55, weeks: 7, skipRate: 0.15, stoppedDaysAgo: 16,
    routines: [['volumen', ['monday', 'tuesday', 'thursday', 'friday']]], metrics: [74, 75.2, 175] },
  { key: 'camila', name: 'Camila Suárez', email: email('camila'), goal: 'strength', level: 'intermediate',
    birth_date: '1998-02-09', phone: '+5491155550106', weekly_frequency: 3, gym_equipment: FULL_GYM,
    injuries: 'Tendinitis rotuliana izquierda (controlada)', seed: 66, weeks: 6, skipRate: 0.12,
    substitutes: { from: 'Prensa de piernas', to: 'Sentadilla goblet' },
    routines: [['glute', ['monday', 'wednesday', 'friday']]], metrics: [63, 64.1, 168] },
  { key: 'joaquin', name: 'Joaquín Pérez', email: email('joaquin'), goal: 'tonify', level: 'beginner',
    birth_date: '2003-08-21', phone: '+5491155550107', weekly_frequency: 3, gym_equipment: FULL_GYM,
    injuries: null, seed: 77, weeks: 0, createdDaysAgo: 0,
    routines: [['bajar', ['tuesday', 'thursday', 'saturday']]], metrics: [70, 70, 172] },
];

/** Invitación pendiente (todavía no aceptada). */
export const PENDING_INVITATION = {
  student_name: 'Agustina López', student_email: email('agustina'), student_phone: '+5491155550108',
  student_goal: 'weight_loss', student_level: 'beginner', delivery_channel: 'both',
};
