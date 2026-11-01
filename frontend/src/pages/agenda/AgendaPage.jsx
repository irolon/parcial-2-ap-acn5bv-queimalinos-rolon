import { useState } from 'react';
import AgendaToolbar from '@/components/agenda/AgendaToolbar';
import AppointmentDialog from '@/components/agenda/AppointmentDialog';
import AvailabilityDialog from '@/components/agenda/dialogs/AvailabilityDialog';
import NewAppointmentDialog from '@/components/agenda/dialogs/NewAppointmentDialog';
import Legend from '@/components/agenda/Legend';
import WeekGrid from '@/components/agenda/WeekGrid';
import WeekList from '@/components/agenda/WeekList';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import { useAppointments, useAvailability } from '@/hooks/agenda/useAgenda';
import { useIsDesktop } from '@/hooks/shared/useIsDesktop';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { shiftWeek, slotIso, weekOf, weekTitle } from '@/utils/agenda';

// `weekOf` toma un instante: el mediodía de Argentina del lunes evita que la zona lo corra de día.
const weekFrom = (from) => weekOf(slotIso(from, 12));

/**
 * Calendario semanal del entrenador.
 * `dialog` ('availability' | 'new' | null) abre los diálogos de disponibilidad y de nuevo turno.
 */
export default function AgendaPage() {
  const [from, setFrom] = useState(() => weekOf(new Date()).from);
  const [showCancelled, setShowCancelled] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null);
  const isDesktop = useIsDesktop();
  const week = weekFrom(from);
  usePageHeader({ title: 'Agenda', subtitle: weekTitle(week.from, week.to) });
  const appointments = useAppointments(week.from, week.to);
  const availability = useAvailability();
  const loading = appointments.isPending || availability.isPending;
  const failed = appointments.isError || availability.isError;
  const retry = () => {
    appointments.refetch();
    availability.refetch();
  };
  const View = isDesktop ? WeekGrid : WeekList;

  return (
    <div className="flex flex-col gap-4">
      <AgendaToolbar
        onPrev={() => setFrom(shiftWeek(from, -1))}
        onToday={() => setFrom(weekOf(new Date()).from)}
        onNext={() => setFrom(shiftWeek(from, 1))}
        showCancelled={showCancelled}
        onToggleCancelled={setShowCancelled}
        onOpenAvailability={() => setDialog('availability')}
        onOpenNew={() => setDialog('new')}
      />
      {loading && <LoadingState />}
      {!loading && failed && <ErrorState onRetry={retry} />}
      {!loading && !failed && (
        <View
          week={week}
          availability={availability.data}
          appointments={appointments.data}
          showCancelled={showCancelled}
          onSelect={setSelected}
        />
      )}
      <Legend />
      <AppointmentDialog appointment={selected} onClose={() => setSelected(null)} />
      <AvailabilityDialog open={dialog === 'availability'} onClose={() => setDialog(null)} />
      <NewAppointmentDialog open={dialog === 'new'} onClose={() => setDialog(null)} />
    </div>
  );
}
