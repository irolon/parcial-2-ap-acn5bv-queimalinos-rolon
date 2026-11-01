import { argentinaDate } from '@/utils/dates';
import { DAY_OPTIONS } from '@/utils/students/routineDays';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** La fecha de hoy en Argentina para el saludo de Hoy: 'Domingo 1 de noviembre'. */
export function greetingDate(now = new Date()) {
  const { weekday, day, month } = argentinaDate(now);
  return `${DAY_OPTIONS[weekday - 1].label} ${day} de ${MONTHS[month - 1]}`;
}
