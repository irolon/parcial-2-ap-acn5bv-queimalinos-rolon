// TODO: completar los placeholders [entre corchetes] cuando estén definidos los precios.
export const plans = [
  {
    id: 'free',
    name: 'Gratis',
    tagline: 'Para arrancar con tus primeros alumnos.',
    price: '$0',
    features: [
      ['Hasta ', { placeholder: '[2–3]' }, ' alumnos activos'],
      ['Panel, biblioteca y editor de rutinas'],
      ['App Android para tus alumnos'],
      ['Chat y seguimiento del progreso'],
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Para cuando tu cartera crece.',
    badge: 'Para crecer',
    price: { placeholder: '[Precio en pesos]' },
    period: '/ mes',
    features: [
      ['Todo lo del plan Gratis'],
      ['Más alumnos activos ', { placeholder: '[límite a definir]' }],
      [{ placeholder: '[Otros beneficios del plan Pro]' }],
    ],
    highlighted: true,
  },
]

export const faqs = [
  { q: '¿Mis alumnos tienen que pagar algo?', a: 'No. El plan lo elige el entrenador. Tus alumnos se bajan la app gratis y entran con tu invitación.' },
  { q: '¿Cómo se suma un alumno?', a: 'Le mostrás el QR o le mandás el link por WhatsApp. Se baja la app, toca la invitación y queda vinculado a vos. Los alumnos no se registran solos: siempre entran por su entrenador.' },
  { q: '¿Y si entrenamos en una plaza sin señal?', a: 'La app del alumno funciona sin conexión: registra la sesión completa y la sincroniza sola cuando vuelve la señal.' },
  { q: '¿La IA arma las rutinas por mí?', a: 'Te propone un borrador con los ejercicios de tu biblioteca y el perfil del alumno. Vos lo revisás, lo editás y decidís qué se envía.' },
  { q: '¿Hay app para iPhone?', a: 'Por ahora la app es para Android. Entrenadores y alumnos también pueden usar FitTrainer desde la web, en cualquier dispositivo.' },
  { q: '¿Sirve para administrar un gimnasio?', a: 'No. FitTrainer está pensado para el personal trainer independiente y su relación con cada alumno, no para la gestión de un gimnasio.' },
]
