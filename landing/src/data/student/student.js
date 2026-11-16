export const muscleNames = {
  hombro: 'Hombros', pecho: 'Pecho', abs: 'Abdomen', brazo: 'Brazos',
  ante: 'Antebrazos', cuad: 'Cuádriceps', gem: 'Gemelos',
}

export const exercises = [
  { name: 'Sentadilla', primary: ['cuad'], secondary: ['abs', 'gem'] },
  { name: 'Press de banca', primary: ['pecho'], secondary: ['hombro', 'brazo'] },
  { name: 'Press militar', primary: ['hombro'], secondary: ['brazo', 'abs'] },
  { name: 'Curl de bíceps', primary: ['brazo'], secondary: ['ante'] },
  { name: 'Estocadas', primary: ['cuad'], secondary: ['gem', 'abs'] },
  { name: 'Plancha', primary: ['abs'], secondary: ['hombro', 'cuad'] },
]

export const todayRoutine = [
  ['Press de banca', '4 × 8'],
  ['Remo con barra', '4 × 10'],
  ['Press militar', '3 × 10'],
  ['Curl de bíceps', '3 × 12'],
  ['Plancha', '3 × 12'],
]

export const studentFeatures = [
  { icon: 'offline', title: 'Funciona sin conexión', text: 'Registra la sesión y la sincroniza cuando vuelve la señal.' },
  { icon: 'timer', title: 'Timer de descanso', text: 'Ajustable serie por serie.' },
  { icon: 'clock', title: 'Historial con RPE', text: 'Y feedback al terminar cada entrenamiento.' },
  { icon: 'bell', title: 'Notificaciones push', text: 'Mensajes, comentarios de su entrenador, turnos y logros, y elige cuáles recibir.' },
  { icon: 'message', title: 'Chat con su entrenador', text: 'Sin mezclarse con el resto de WhatsApp.' },
  { icon: 'calendar', title: 'Pedido de turnos', text: 'Elige horario según tu disponibilidad.' },
]
