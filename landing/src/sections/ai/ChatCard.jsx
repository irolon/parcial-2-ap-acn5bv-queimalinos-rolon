import { Card } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'

/** Tarjeta de chat: los mensajes aparecen escalonados cuando la tarjeta entra en pantalla. */
export function ChatCard({ tone, title, subtitle, messages }) {
  return (
    <Card className="flex flex-col gap-[18px] p-7">
      <div className="flex items-center gap-3">
        <IconTile name="sparkle" tone={tone} />
        <div>
          <h2 className="text-xl">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 rounded-panel border border-surface-1 bg-bg-0 p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            style={{ animationDelay: `${0.6 + i * 0.65}s` }}
            className={`animate-pop ${
              m.actions
                ? 'flex flex-wrap gap-2'
                : `max-w-[88%] rounded-panel px-3.5 py-3 text-sm leading-normal ${
                    m.from === 'user'
                      ? 'self-end rounded-br-sm bg-brand text-white'
                      : 'self-start rounded-bl-sm bg-surface-1 text-bone-2'
                  }`
            }`}
          >
            {m.actions
              ? m.actions.map((a, j) => (
                  <span key={a} className={`rounded-pill border px-3 py-1.5 text-[13px] ${j === m.actions.length - 1 ? 'border-brand text-brand-soft' : 'border-surface-2 text-bone-3'}`}>
                    {a}
                  </span>
                ))
              : m.text}
          </div>
        ))}
      </div>
    </Card>
  )
}
