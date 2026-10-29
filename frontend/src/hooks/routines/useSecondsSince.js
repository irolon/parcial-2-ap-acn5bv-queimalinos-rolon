import { useEffect, useState } from 'react';

/** Segundos transcurridos desde `date` (se actualiza cada segundo); `null` si no hay fecha. */
export function useSecondsSince(date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!date) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [date]);
  return date ? Math.max(0, Math.floor((now - date.getTime()) / 1000)) : null;
}
