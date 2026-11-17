// Interacción de la demo: mensajes, consultas al asistente, comentarios del PT y turnos.
// `daysAgo` / `inDays` son relativos al día en que se corre el seed.

/** Mensajes del chat PT ↔ alumno: [alumno, quién, días atrás, hora, texto, leído]. */
export const MESSAGES = [
  ['martin', 'trainer', 6, 10, 'Martín, esta semana subimos 2,5 kg en banca. Si la última serie no sale, bajá a 8 reps.', true],
  ['martin', 'student', 6, 12, 'Dale. ¿El hombro lo sigo calentando con banda antes?', true],
  ['martin', 'trainer', 5, 9, 'Sí, 2 series de rotaciones externas antes del press. Avisame si molesta.', true],
  ['martin', 'student', 1, 21, 'Hoy salió la banca con 77,5 kg. El hombro, cero molestia 💪', false],
  ['sofia', 'trainer', 4, 18, 'Sofi, ¡bajaste casi 5 kg desde que arrancamos! Sumamos burpees la semana que viene.', true],
  ['sofia', 'student', 4, 20, '¡Gracias! Me cuesta el cardio pero vengo bien.', true],
  ['diego', 'trainer', 5, 11, 'Diego, ¿todo bien? Hace dos semanas que no entrenás. Avisame si necesitás cambiar horarios.', true],
];

/** Comentarios del PT en la última sesión de cada alumno (la más reciente primero). */
export const TRAINER_COMMENTS = {
  martin: ['Muy buena sesión. La banca viene subiendo bien: la semana que viene probamos 80 kg.', 'Bien el control en el remo. Cuidá no arquear la espalda.'],
  sofia: ['Excelente constancia, Sofi. Seguimos así.'],
  lucas: ['Peso muerto muy sólido. Próxima: 5 × 5 con 162,5 kg.'],
};

/** Consultas al asistente IA del alumno, sobre su última sesión: [alumno, ejercicio, pregunta, respuesta]. */
export const AI_CHATS = [
  ['martin', 'Press militar', 'Siento el hombro derecho un poco cargado en el press militar, ¿con qué lo puedo reemplazar hoy?',
    'Si molesta, no fuerces: probá press de hombros con mancuernas con agarre neutro y menos rango, o elevaciones laterales livianas. Si el dolor sigue, frená y avisale a Laura.'],
  ['martin', 'Remo con barra', '¿Cómo hago para no cargar la zona lumbar en el remo con barra?',
    'Bisagra de cadera con la espalda neutra, abdomen firme y la barra cerca del cuerpo. Si se redondea la espalda, bajá el peso o pasá a remo con mancuerna apoyado en el banco.'],
  ['sofia', 'Swing con kettlebell', '¿Cuánto tiempo descanso entre series de swing?',
    'Con tu rutina, entre 45 y 60 segundos alcanza. Si la técnica empieza a fallar, tomate unos segundos más.'],
];

/** Turnos: [alumno, días desde hoy (negativo = pasado), hora, estado, nota]. Se corren a días hábiles. */
export const APPOINTMENTS = [
  ['martin', 1, 18, 'confirmed', 'Evaluación de hombro'],
  ['sofia', 0, 19, 'pending', 'Medición mensual'],
  ['lucas', 2, 9, 'pending', 'Revisar técnica de peso muerto'],
  ['valentina', 3, 10, 'confirmed', null],
  ['camila', 1, 20, 'pending', 'Rodilla: ajustar ejercicios'],
  ['diego', -2, 17, 'cancelled', null],
];

/** Desafío propio de la entrenadora y a quién se asignó (empezó hace 12 días). */
export const CHALLENGE = {
  name: '12 sesiones en 30 días',
  description: 'Sumá 12 entrenamientos en un mes para sostener el hábito.',
  goal_type: 'sessions_count', goal_value: 12, duration_days: 30, startedDaysAgo: 12,
  students: ['martin', 'sofia', 'lucas', 'camila'],
};
