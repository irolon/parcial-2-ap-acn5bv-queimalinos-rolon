import { useUnreadCount } from '@/hooks/messages/useUnreadCount';
import { badgeText } from '@/utils/messages/badgeText';

/** Contador de no leídos para el ítem "Mensajes" del menú. Sin no leídos no se muestra. */
export default function UnreadBadge() {
  const { data } = useUnreadCount();
  const text = badgeText(data ?? 0);
  if (!text) return null;
  return (
    <span
      className="ml-auto min-w-[18px] rounded-full bg-accent px-1.5 text-center font-mono text-[10px] font-semibold leading-[18px] text-accentInk md:max-lg:absolute md:max-lg:right-1 md:max-lg:top-0.5 md:max-lg:ml-0 md:max-lg:min-w-4 md:max-lg:px-1 md:max-lg:leading-4"
    >
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{data} sin leer</span>
    </span>
  );
}
