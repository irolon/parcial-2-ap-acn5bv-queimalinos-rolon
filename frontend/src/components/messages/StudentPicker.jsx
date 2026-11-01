import Avatar from '@/components/shared/ui/Avatar';

const ROW = 'flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink2';
const CHECK = 'size-4 accent-[var(--color-accent)]';

/** Selector de alumnos con casilla "Todos". `students` = [{ id, name }]; `selected` = array de ids. */
export default function StudentPicker({ students, selected, onChange }) {
  const all = students.length > 0 && selected.length === students.length;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <fieldset className="rounded-md border border-ink3">
      <legend className="px-1 font-mono text-[9px] uppercase tracking-[1px] text-ink6">Alumnos</legend>
      <label className={`${ROW} border-b border-ink2 font-display text-sm font-semibold text-bone0`}>
        <input
          type="checkbox"
          checked={all}
          onChange={() => onChange(all ? [] : students.map((s) => s.id))}
          className={CHECK}
        />
        Todos
      </label>
      <ul className="max-h-48 overflow-y-auto">
        {students.map((s) => (
          <li key={s.id}>
            <label className={`${ROW} font-body text-sm text-bone0`}>
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} className={CHECK} />
              <Avatar name={s.name} size={24} decorative />
              <span className="truncate">{s.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
