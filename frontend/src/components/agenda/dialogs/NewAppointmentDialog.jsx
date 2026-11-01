import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import Textarea from '@/components/shared/ui/Textarea';
import { useAppointments, useCreateAppointment, useFreeSlots } from '@/hooks/agenda/useAgenda';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { arParts } from '@/utils/agenda';
import { MAX_NOTES, hourChoices, lastBookableDate, scheduledAt } from './newAppointmentForm';

const SLOT_TAKEN = 'Ese horario ya está ocupado';

function Form({ create, onClose }) {
  const today = arParts(new Date()).date;
  const maxDate = lastBookableDate();
  const [student, setStudent] = useState('');
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const students = useStudentsQuery({ active: true });
  const free = useFreeSlots(date, date);
  const day = useAppointments(date, date);
  const choices = hourChoices({ date, freeSlots: free.data ?? [], appointments: day.data ?? [] });
  const loadFailed = students.isError || free.isError || day.isError;
  const hoursLoading = free.isLoading || day.isLoading;
  const noStudents = students.isSuccess && students.data.length === 0;

  const retry = () => [students, free, day].filter((q) => q.isError).forEach((q) => q.refetch());

  function submit(event) {
    event.preventDefault();
    if (create.isPending) return;
    const found = {};
    if (!student) found.student = 'Elegí el alumno del turno';
    if (!date || date < today) found.date = 'Elegí una fecha desde hoy';
    else if (date > maxDate) found.date = 'Se puede agendar hasta dentro de un año';
    if (!hour || choices.find((c) => c.value === hour)?.disabled) found.hour = 'Elegí una hora libre';
    if (notes.length > MAX_NOTES) found.notes = `Hasta ${MAX_NOTES} caracteres`;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = { student_id: student, scheduled_at: scheduledAt(date, hour) };
    if (notes.trim()) body.notes = notes.trim();
    create.mutate(body, {
      onSuccess: onClose,
      onError: (error) => setErrors({ form: error.code === 'SLOT_TAKEN' ? SLOT_TAKEN : error.message }),
    });
  }

  const studentOptions = [
    { value: '', label: students.isLoading ? 'Cargando alumnos…' : 'Elegí un alumno' },
    ...(students.data ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];
  const hourOptions = [{ value: '', label: hoursLoading ? 'Cargando horarios…' : 'Elegí una hora' }, ...choices];
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {loadFailed && (
        <div role="alert" className="flex items-center justify-between gap-3 font-body text-sm text-hot">
          <span>No pudimos cargar los datos del turno.</span>
          <Button variant="ghost" size="sm" onClick={retry}>Reintentar</Button>
        </div>
      )}
      <Select
        label="Alumno"
        options={studentOptions}
        value={student}
        disabled={students.isLoading || noStudents}
        error={errors.student ?? (noStudents ? 'No tenés alumnos activos' : undefined)}
        onChange={(e) => setStudent(e.target.value)}
      />
      <Input label="Fecha" type="date" min={today} max={maxDate} value={date} error={errors.date} onChange={(e) => { setDate(e.target.value); setHour(''); }} />
      <Select label="Hora" options={hourOptions} value={hour} disabled={hoursLoading || free.isError || day.isError} error={errors.hour} onChange={(e) => setHour(e.target.value)} />
      <Textarea label="Nota (opcional)" value={notes} error={errors.notes} onChange={(e) => setNotes(e.target.value)} />
      {errors.form && <p role="alert" className="font-body text-sm text-hot">{errors.form}</p>}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancelar</Button>
        <Button type="submit" loading={create.isPending}>Agendar turno</Button>
      </div>
    </form>
  );
}

/** Agenda un turno a mano para un alumno activo. */
export default function NewAppointmentDialog({ open, onClose }) {
  const create = useCreateAppointment();
  return (
    <Dialog open={open} dismissible={!create.isPending} onOpenChange={(next) => !next && onClose()} title="Nuevo turno">
      <Form create={create} onClose={onClose} />
    </Dialog>
  );
}
