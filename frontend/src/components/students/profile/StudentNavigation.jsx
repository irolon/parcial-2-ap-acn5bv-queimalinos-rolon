import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { neighbors } from '@/utils/students/studentFilters';

const LINK = 'rounded-lg border border-white/[0.14] px-3 py-1.5 font-display text-[13px] font-semibold';
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

const hrefFor = (student, search) => `/pt/alumnos/${student.id}${search ? `?${search}` : ''}`;

function NavLink({ student, search, children }) {
  if (!student) {
    return (
      <span aria-disabled="true" className={`${LINK} cursor-not-allowed text-ink5`}>
        {children}
      </span>
    );
  }
  return (
    <Link to={hrefFor(student, search)} className={`${LINK} text-bone0 hover:bg-white/[0.06]`}>
      {children}
    </Link>
  );
}

/** "‹ Anterior · 3 de 12 · Siguiente ›" sobre la lista ya filtrada y ordenada; ←/→ también navegan. */
export default function StudentNavigation({ students, id, search }) {
  const navigate = useNavigate();
  const { prev, next, index, total } = neighbors(students, id);
  const prevHref = prev && hrefFor(prev, search);
  const nextHref = next && hrefFor(next, search);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(FIELD) || document.querySelector('[role="dialog"]')) return;
      const href = event.key === 'ArrowLeft' ? prevHref : event.key === 'ArrowRight' ? nextHref : null;
      if (href) navigate(href);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, prevHref, nextHref]);

  if (index < 0) return null;
  return (
    <nav aria-label="Navegación entre alumnos" className="flex items-center justify-between gap-3">
      <NavLink student={prev} search={search}>
        ‹ Anterior
      </NavLink>
      <span className="font-mono text-xs text-ink6">
        {index + 1} de {total}
      </span>
      <NavLink student={next} search={search}>
        Siguiente ›
      </NavLink>
    </nav>
  );
}
