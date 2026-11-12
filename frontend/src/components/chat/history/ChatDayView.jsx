import ChatComposer from '../ChatComposer';
import ChatLog from '../ChatLog';
import ChatNotice from '../ChatNotice';

// Los atajos del prototipo (AW_Chat); el panel de la sesión sigue con los suyos.
export const PAGE_SHORTCUTS = ['¿Cuánto debería subir?', 'Técnica correcta', 'Calentamiento', 'Estiramiento post'];

/** "Preguntando sobre: Press banca (Push)" con una sesión en curso en esta web; si no, la consulta es general. */
function aboutText(workout) {
  const exercise = workout?.exercises[workout.cursor];
  if (!exercise) return 'Consulta general: no tenés una sesión en curso';
  return `Preguntando sobre: ${exercise.name}${workout.routineName ? ` (${workout.routineName})` : ''}`;
}

/**
 * La conversación de un día en la página Asistente IA, con el contexto de cada consulta. Hoy (`box`, lo de
 * `useAskAssistant`) lleva abajo de qué se pregunta, los avisos y la caja con los atajos del prototipo; los días
 * anteriores son de solo lectura.
 */
export default function ChatDayView({ messages, loading, box, workout, fieldRef }) {
  return (
    <>
      <ChatLog messages={messages} pending={box?.pending ?? null} loading={loading} showContext />
      {box ? (
        <>
          {box.notice && <ChatNotice text={box.notice.text} onRetry={box.notice.onRetry} />}
          <ChatComposer
            value={box.text}
            onChange={box.setText}
            onSend={box.ask}
            disabled={box.disabled}
            remaining={box.remaining}
            shortcuts={PAGE_SHORTCUTS}
            fieldRef={fieldRef}
            about={aboutText(workout)}
          />
        </>
      ) : (
        <p className="shrink-0 border-t border-ink2 px-4 py-3 font-body text-[13px] text-ink6">
          Las consultas de días anteriores son de solo lectura.
        </p>
      )}
    </>
  );
}
