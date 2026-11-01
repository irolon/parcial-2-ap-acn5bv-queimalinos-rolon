import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import Textarea from '@/components/shared/ui/Textarea';
import { useAppointments, useCreateAppointment, useFreeSlots } from '@/hooks/agenda/useAgenda';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { arParts } from '@/utils/agenda';
import { MAX_NOTES, hourChoices, scheduledAt } from './newAppointment';

const SLOT_TAKEN = 'Ese horario ya está ocupado';

function HourSelect({ choices, value, error, onChange }) {
  return (
    <div>
      <label htmlFor="appt-hour" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6">Hora</label>
      <select
        id="appt-hour"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        className="h-[46px] w-full rounded-md border border-ink3 bg-ink1 px-3.5 font-body text-sm text-bone0 outline-none focus:border-accentText"
      >
        <option value="">Elegí una hora</option>
        {choices.map((c) => (
          <option key={c.value} value={c.value} disabled={c.disabled}>{c.label}</option>
        ))}
      </select>
      {error && <p role="alert" className="mt-1.5 font-mono text-[11px] text-hot">{error}</p>}
    </div>
  );
}

function Form({ onClose }) {
  const today = arParts(new Date()).date;
  const [student, setStudent] = useState('');
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const students = useStudentsQuery({ active: true });
  const free = useFreeSlots(date, date);
  const day = useAppointments(date, date);
  const create = useCreateAppointment();
  const choices = hourChoices({ date, freeSlots: free.data ?? [], appointments: day.data ?? [] });

  function submit(event) {
    event.preventDefault();
    const found = {};
    if (!student) found.student = 'Elegí el alumno del turno';
    if (!date || date < today) found.date = 'Elegí una fecha desde hoy';
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

  const options = [{ value: '', label: 'Elegí un alumno' }, ...(students.data ?? []).map((s) => ({ value: s.id, label: s.name }))];
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="appt-student" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6">Alumno</label>
        <select
          id="appt-student"
          value={student}
          onChange={(e) => setStudent(e.target.value)}
          className="h-[46px] w-full rounded-md border border-ink3 bg-ink1 px-3.5 font-body text-sm text-bone0 outline-none focus:border-accentText"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {errors.student && <p role="alert" className="mt-1.5 font-mono text-[11px] text-hot">{errors.student}</p>}
      </div>
      <Input label="Fecha" type="date" min={today} value={date} error={errors.date} onChange={(e) => { setDate(e.target.value); setHour(''); }} />
      <HourSelect choices={choices} value={hour} error={errors.hour} onChange={setHour} />
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
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="Nuevo turno">
      <Form onClose={onClose} />
    </Dialog>
  );
}
