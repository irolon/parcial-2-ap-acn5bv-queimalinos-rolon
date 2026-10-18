import {
  Calendar,
  ChartLine,
  Dumbbell,
  House,
  List,
  MessageSquare,
  Sparkles,
  User,
} from 'lucide-react';

// Ítems del sidebar en el orden y con los íconos del prototipo. `path` es relativo a `base`.
export const TRAINER_NAV = {
  base: '/pt',
  items: [
    { path: 'dashboard', label: 'Dashboard', icon: House, subtitle: 'RESUMEN DE TU ACTIVIDAD' },
    { path: 'alumnos', label: 'Alumnos', icon: User, subtitle: 'TUS ALUMNOS' },
    { path: 'rutinas', label: 'Rutinas', icon: List, subtitle: 'PLANES DE ENTRENAMIENTO' },
    { path: 'biblioteca', label: 'Biblioteca', icon: Dumbbell, subtitle: 'EJERCICIOS' },
    { path: 'agenda', label: 'Agenda', icon: Calendar, subtitle: 'SESIONES PROGRAMADAS' },
    { path: 'mensajes', label: 'Mensajes', icon: MessageSquare, subtitle: 'CONVERSACIONES' },
  ],
};

export const STUDENT_NAV = {
  base: '/alumno',
  items: [
    { path: 'hoy', label: 'Hoy', icon: House, subtitle: 'TU ENTRENAMIENTO DE HOY' },
    { path: 'progreso', label: 'Mi progreso', icon: ChartLine, subtitle: 'MEDIDAS Y MARCAS' },
    { path: 'rutinas', label: 'Mis rutinas', icon: List, subtitle: 'TUS PLANES' },
    { path: 'historial', label: 'Historial', icon: Calendar, subtitle: 'SESIONES COMPLETADAS' },
    { path: 'asistente', label: 'Asistente IA', icon: Sparkles, subtitle: 'CONSULTAS Y SUGERENCIAS' },
    { path: 'perfil', label: 'Mi perfil', icon: User, subtitle: 'TUS DATOS' },
  ],
};

const NAV_BY_ROLE = { trainer: TRAINER_NAV, student: STUDENT_NAV };

/** Home de cada rol (`null` si el rol no es conocido). */
export function homeFor(role) {
  const nav = NAV_BY_ROLE[role];
  return nav ? `${nav.base}/${nav.items[0].path}` : null;
}
