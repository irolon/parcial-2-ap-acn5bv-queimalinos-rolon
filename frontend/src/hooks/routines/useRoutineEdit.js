import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as routinesApi from '@/api/routines/routines.api';
import { ROUTINES_KEY } from '@/hooks/routines/useRoutines';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';
import { fromRoutine, snapshotOf, withSavedIds } from '@/utils/routines/edit/fromRoutine';
import { planEdits } from '@/utils/routines/edit/planEdits';
import { saveEdits } from '@/utils/routines/edit/saveEdits';

export const routineDetailKey = (id) => [...ROUTINES_KEY, 'detail', id];

const IDLE = { saving: false, error: null, notice: null, conflict: null };

/**
 * Edición de una rutina asignada: carga `GET /routines/:id`, guarda la versión cargada (`baseline`) y lo que hay en
 * pantalla (`state`), y guarda la diferencia con `saveEdits`. Antes de guardar vuelve a pedir la rutina: si cambió
 * desde que se abrió, no guarda y deja `status.conflict` con la versión nueva (recargar o guardar igual).
 * Sin borrador en `localStorage`: el del alta no se toca.
 */
export function useRoutineEdit(routineId) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: routineDetailKey(routineId), queryFn: () => routinesApi.getRoutine(routineId) });
  const [baseline, setBaseline] = useState(null);
  const [state, setState] = useState(null);
  const [status, setStatus] = useState(IDLE);

  if (query.data && baseline === null) {
    setBaseline(query.data);
    setState(fromRoutine(query.data));
  }

  const dirty = useMemo(() => Boolean(baseline && state && !planEdits(baseline, state).empty), [baseline, state]);

  const load = (detail, patch = {}) => {
    setBaseline(detail);
    setState(fromRoutine(detail));
    setStatus({ ...IDLE, ...patch });
    queryClient.setQueryData(routineDetailKey(routineId), detail);
  };

  const refreshLists = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ROUTINES_KEY, exact: true }),
    queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
  ]);

  /**
   * Tras un error: lo ya guardado queda anotado en las filas. Si se llegó a escribir (`wrote`), la versión del servidor
   * pasa a ser la base; si falló la comprobación inicial, la base no se toca para que el reintento vuelva a comparar
   * contra lo que se abrió (y avise si otro dispositivo cambió la rutina).
   */
  const recover = async (error, wrote) => {
    if (error.savedIds) setState((current) => withSavedIds(current, error.savedIds));
    const fresh = wrote ? await routinesApi.getRoutine(routineId).catch(() => null) : null;
    if (fresh) setBaseline(fresh);
    setStatus({ ...IDLE, error });
    if (error.savedIds) refreshLists(); // pudo haberse guardado una parte
  };

  const save = async ({ force = false } = {}) => {
    setStatus({ ...IDLE, saving: true });
    let savedIds = null;
    let wrote = false;
    try {
      const fresh = await routinesApi.getRoutine(routineId);
      if (!force && snapshotOf(fresh) !== snapshotOf(baseline)) {
        setStatus({ ...IDLE, conflict: fresh });
        return;
      }
      wrote = true;
      const { plan, ids } = await saveEdits(routineId, fresh, state, routinesApi);
      savedIds = ids;
      if (plan.empty) {
        setBaseline(fresh);
        setStatus({ ...IDLE, notice: 'No había cambios para guardar' });
        return;
      }
      load(await routinesApi.getRoutine(routineId), { notice: 'Cambios guardados' });
      await refreshLists();
    } catch (error) {
      // Si falló la recarga después de guardar todo, las filas igual se quedan con sus ids nuevos.
      if (!error.savedIds && savedIds) error.savedIds = savedIds;
      await recover(error, wrote);
    }
  };

  return {
    query,
    baseline,
    state,
    setState,
    dirty,
    status,
    save,
    discard: () => load(baseline),
    reloadFromConflict: () => load(status.conflict),
    closeConflict: () => setStatus(IDLE),
    clearMessages: () => setStatus((current) => (current.error || current.notice ? { ...current, error: null, notice: null } : current)),
  };
}
