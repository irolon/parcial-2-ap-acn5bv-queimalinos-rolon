import { useState } from 'react';
import { Megaphone, Search } from 'lucide-react';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import { filterByStudentName } from '@/utils/messages/searchName';
import ConversationRow from './ConversationRow';

/** Panel izquierdo del PT: "Envío masivo", buscador por nombre y una fila por alumno activo. */
export default function ConversationList({ query, activeId, onSelect, onBroadcast }) {
  const [search, setSearch] = useState('');
  return (
    <aside aria-label="Conversaciones" className="flex h-full min-h-0 w-full flex-col rounded-xl border border-ink3 bg-ink1">
      <div className="flex shrink-0 flex-col gap-2 border-b border-ink2 p-3">
        <Button variant="ghost" size="sm" full onClick={onBroadcast} disabled={!query.data?.length}>
          <Megaphone size={14} aria-hidden="true" />
          Envío masivo
        </Button>
        <div className="relative">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink5" />
          <input
            type="search"
            aria-label="Buscar alumno"
            placeholder="Buscar alumno"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-full rounded-md border border-ink3 bg-ink0 pl-8 pr-3 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <QueryState
          query={query}
          errorMessage="No pudimos cargar las conversaciones."
          empty={{ title: 'Todavía no tenés alumnos activos', text: 'Cuando sumes alumnos vas a poder escribirles desde acá.' }}
        >
          {(conversations) => {
            const shown = filterByStudentName(conversations, search);
            if (shown.length === 0) {
              return <p className="px-4 py-6 text-center font-body text-sm text-ink6">No hay alumnos con ese nombre.</p>;
            }
            return shown.map((c) => (
              <ConversationRow key={c.student.id} conversation={c} active={c.student.id === activeId} onSelect={onSelect} />
            ));
          }}
        </QueryState>
      </div>
    </aside>
  );
}
