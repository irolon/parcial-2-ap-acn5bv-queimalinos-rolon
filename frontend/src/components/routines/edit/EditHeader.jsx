import { usePageHeader } from '@/hooks/shared/usePageHeader';

/** Encabezado de la topbar del editor en modo edición. */
export default function EditHeader({ name }) {
  usePageHeader({ title: name ? `Editar rutina — ${name}` : 'Editar rutina', subtitle: 'RUTINAS › EDITAR' });
  return null;
}
