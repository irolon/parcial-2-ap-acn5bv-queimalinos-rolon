import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { profileHref } from '@/routes/routeTable';
import { neighbors } from '@/utils/students/studentFilters';

const LINK = 'rounded-lg border border-white/[0.14] px-3 py-1.5 font-display text-[13px] font-semibold';
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function NavLink({ student, search, children }) {
  if (!student) {
    return (
      <button type="button" disabled className={`${LINK} cursor-not-allowed text-ink5`}>
        {children}
      </button>
    );
  }
  return (
    <Link to={profileHref(student.id, search)} className={`${LINK} text-bone0 hover:bg-white/[0.06]`}>
      {children}
    </Link>
  );
}

/**
 * Vecinos de `id`; si deja de estar en la lista (se lo dio de baja desde la ficha y la lista se refrescó),
 * los últimos que se calcularon para ese mismo `id`. Al cambiar de alumno se descartan.
 */
function useStickyNeighbors(students, id) {
  const current = neighbors(students, id);
  const [kept, setKept] = useState(null);
  const key = current.index >= 0 && [id, current.index, current.total, current.prev?.id, current.next?.id].join('|');
  if (key && kept?.key !== key) setKept({ key, id, nav: current });
  if (current.index < 0 && kept?.id === id) return kept.nav;
  return current;
}

/** "‹ Anterior · 3 de 12 · Siguiente ›" sobre la lista ya filtrada y ordenada; ←/→ también navegan. */
export default function StudentNavigation({ students, id, search }) {
  const navigate = useNavigate();
  const { prev, next, index, total } = useStickyNeighbors(students, id);
  const prevHref = prev && profileHref(prev.id, search);
  const nextHref = next && profileHref(next.id, search);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(FIELD) || document.querySelector('[role="dialog"]')) return;
      const href = event.key === 'ArrowLeft' ? prevHref : event.key === 'ArrowRight' ? nextHref : null;
      if (href) navigate(href);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, prevHref, nextHref]);

  return (
    <nav aria-label="Navegación entre alumnos" className="flex items-center justify-between gap-3">
      <NavLink student={prev} search={search}>
        ‹ Anterior
      </NavLink>
      <span className="font-mono text-xs text-ink6">{index >= 0 && `${index + 1} de ${total}`}</span>
      <NavLink student={next} search={search}>
        Siguiente ›
      </NavLink>
    </nav>
  );
}
