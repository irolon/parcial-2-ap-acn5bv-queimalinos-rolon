// URLs de la web de la app (registro y login). La landing corre en :5174 y la web en :5173, así que por
// defecto apuntan a localhost:5173. Por ahora la landing solo ofrece iniciar sesión: APP_SIGNUP_URL queda
// lista para cuando se habilite el alta de entrenadores desde acá.
// Se cambian con VITE_APP_SIGNUP_URL / VITE_APP_LOGIN_URL (.env).
const WEB_APP_URL = 'http://localhost:5173'

export const APP_SIGNUP_URL = import.meta.env.VITE_APP_SIGNUP_URL || `${WEB_APP_URL}/registro`
export const APP_LOGIN_URL = import.meta.env.VITE_APP_LOGIN_URL || `${WEB_APP_URL}/login`

export const NAV_LINKS = [
  { to: '/entrenadores', label: 'Entrenadores' },
  { to: '/alumnos', label: 'Alumnos' },
  { to: '/ia', label: 'Asistentes IA' },
  { to: '/por-que', label: 'Por qué FitTrainer' },
  { to: '/planes', label: 'Planes' },
]
