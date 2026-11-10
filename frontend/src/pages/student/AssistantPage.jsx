import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import ChatDayList from '@/components/chat/history/ChatDayList';
import ChatDayView from '@/components/chat/history/ChatDayView';
import Button from '@/components/shared/ui/Button';
import Select from '@/components/shared/ui/Select';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useAskAssistant } from '@/hooks/chat/useAskAssistant';
import { useChatToday } from '@/hooks/chat/useChat';
import { useChatHistory } from '@/hooks/chat/useChatHistory';
import { useToday } from '@/hooks/shared/useToday';
import { useActiveWorkout } from '@/hooks/workout/useActiveWorkout';
import { chatDayOf } from '@/utils/chat/chatDay';
import { dayLabel, dayTitle } from '@/utils/chat/chatHistory';

/** La sesión en curso en esta web (sin terminar), o null: de ella sale el contexto de la consulta de hoy. */
function useOpenWorkout() {
  const studentId = useAuthStore((state) => state.user?.id);
  const { workout } = useActiveWorkout(studentId);
  return workout && !workout.finishedAt ? workout : null;
}

const optionLabel = (day, today) => {
  const title = dayTitle(day.messages);
  return title ? `${dayLabel(day.date, today)} · ${title}` : dayLabel(day.date, today);
};

/**
 * Asistente IA del alumno (GX5, A4 de la Guía Web): a la izquierda las consultas guardadas por día (hoy primero) y a la
 * derecha la conversación del día elegido, con el contexto de cada consulta. Hoy lleva la caja (con la sesión en curso
 * en esta web, la consulta viaja con su sesión y su ejercicio); los días anteriores son de solo lectura y se cargan de a
 * 7 con "Ver días anteriores". Debajo de `lg` la lista pasa a un `Select` "Día" sobre la conversación.
 */
export default function AssistantPage() {
  const now = useToday();
  const today = chatDayOf(now);
  const day = useChatToday(now);
  const history = useChatHistory(now);
  const workout = useOpenWorkout();
  const exercise = workout?.exercises[workout.cursor] ?? null;
  const box = useAskAssistant({ now, day, sessionId: workout?.id, exercise });
  const [picked, setPicked] = useState(null);
  const fieldRef = useRef(null);

  const days = [
    { date: today, messages: day.data?.messages ?? [] },
    ...history.days.filter((item) => item.date !== today),
  ];
  const selected = days.find((item) => item.date === picked) ?? days[0];
  const isToday = selected.date === today;
  const startNew = () => {
    setPicked(null);
    requestAnimationFrame(() => fieldRef.current?.focus());
  };
  const options = days
    .filter((item) => item.date === today || item.messages.length > 0)
    .map((item) => ({ value: item.date, label: optionLabel(item, today) }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="flex flex-col gap-3 lg:w-[260px] lg:shrink-0">
        <Button full onClick={startNew}>
          <Plus size={16} aria-hidden="true" />
          Nueva consulta
        </Button>
        <ChatDayList
          className="hidden lg:flex"
          days={days}
          selected={selected.date}
          today={today}
          onSelect={setPicked}
        />
        <Select
          className="lg:hidden"
          label="Día"
          value={selected.date}
          options={options}
          onChange={(event) => setPicked(event.target.value)}
        />
        {history.hasNextPage && (
          <Button variant="ghost" size="sm" loading={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>
            Ver días anteriores
          </Button>
        )}
      </aside>
      <section
        aria-label="Conversación"
        className="flex h-[calc(100dvh-180px)] min-h-[420px] min-w-0 flex-1 flex-col rounded-2xl border border-ink3 bg-ink1"
      >
        <ChatDayView
          key={selected.date}
          messages={selected.messages}
          loading={isToday && day.isPending && box.online}
          box={isToday ? box : null}
          workout={workout}
          fieldRef={fieldRef}
        />
      </section>
    </div>
  );
}
