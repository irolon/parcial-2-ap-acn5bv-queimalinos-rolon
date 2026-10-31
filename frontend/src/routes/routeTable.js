import {
  Calendar,
  ChartLine,
  Dumbbell,
  House,
  List,
  MessageSquare,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';

export const ROLES = { TRAINER: 'trainer', STUDENT: 'student' };

// Ítems del sidebar en el orden y con los íconos del prototipo. `path` es relativo a `base`.
export const TRAINER_NAV = {
  base: '/pt',
  items: [
    { path: 'dashboard', label: 'Dashboard', icon: House, subtitle: 'RESUMEN DE TU ACTIVIDAD' },
    { path: 'alumnos', label: 'Alumnos', icon: User, subtitle: 'TUS ALUMNOS' },
    { path: 'rutinas', label: 'Rutinas', icon: List, subtitle: 'PLANES DE ENTRENAMIENTO' },
    { path: 'biblioteca', label: 'Biblioteca', icon: Dumbbell, subtitle: 'EJERCICIOS' },
    { path: 'desafios', label: 'Desafíos', icon: Trophy, subtitle: 'RETOS PARA TUS ALUMNOS' },
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

/** Panel de alumnos (el ítem `alumnos` del menú del entrenador). */
export const STUDENTS_PATH = `${TRAINER_NAV.base}/alumnos`;

// Páginas del entrenador fuera del menú (la topbar toma título y subtítulo de acá).
export const NEW_STUDENT = {
  path: `${STUDENTS_PATH}/nuevo`,
  title: 'Invitar alumno',
  subtitle: 'ALUMNOS › NUEVO · GENERÁ QR Y COMPARTILO POR WHATSAPP',
};

/** Listado de rutinas (el ítem `rutinas` del menú del entrenador). */
export const ROUTINES_PATH = `${TRAINER_NAV.base}/rutinas`;

// Editor de rutinas: la página fija su propio título con `usePageHeader`.
export const NEW_ROUTINE = { path: `${ROUTINES_PATH}/nueva` };

/** Link al editor; con `studentId` llega con el alumno preseleccionado. */
export const newRoutineHref = (studentId) => (studentId ? `${NEW_ROUTINE.path}?alumno=${studentId}` : NEW_ROUTINE.path);

// Ficha del alumno: la página fija su propio título con `usePageHeader`.
export const STUDENT_PROFILE = { path: `${STUDENTS_PATH}/:id` };

/** Link a la ficha; `search` (sin `?`) conserva los filtros del panel. */
export const profileHref = (id, search = '') => `${STUDENTS_PATH}/${id}${search ? `?${search}` : ''}`;

const NAV_BY_ROLE = { [ROLES.TRAINER]: TRAINER_NAV, [ROLES.STUDENT]: STUDENT_NAV };

/** Home de cada rol (`null` si el rol no es conocido). */
export function homeFor(role) {
  const nav = NAV_BY_ROLE[role];
  return nav ? `${nav.base}/${nav.items[0].path}` : null;
}
