import { plans } from '@/data/plans/plans'
import { APP_SIGNUP_URL } from '@/data/shared/site'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

const Placeholder = ({ children }) => <span className="font-mono text-[0.92em] text-warning">{children}</span>
const renderPart = (part, i) => (typeof part === 'string' ? <span key={i}>{part}</span> : <Placeholder key={i}>{part.placeholder}</Placeholder>)

export function PlanCards() {
  return (
    <div className="grid max-w-[960px] animate-rise gap-5 [animation-delay:.24s] md:grid-cols-2">
      {plans.map((p) => (
        <div
          key={p.id}
          className={`flex flex-col gap-5 rounded-card border p-7 md:p-9 ${p.highlighted ? 'border-brand bg-[#10152a]' : 'border-surface-1 bg-bg-1'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl">{p.name}</h2>
              <p className="mt-1.5 text-muted">{p.tagline}</p>
            </div>
            {p.badge && <span className="rounded-pill bg-brand px-3.5 py-1.5 text-[13px] font-medium text-white">{p.badge}</span>}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            {typeof p.price === 'string' ? (
              <span className="font-mono text-5xl leading-none font-medium text-bone">{p.price}</span>
            ) : (
              <span className="font-mono text-[34px] leading-none font-medium text-warning">{p.price.placeholder}</span>
            )}
            {p.period && <span className="text-muted">{p.period}</span>}
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {p.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Icon name="check" className="mt-1 size-4 text-success" />
                <span>{f.map(renderPart)}</span>
              </li>
            ))}
          </ul>
          <Button href={APP_SIGNUP_URL} variant={p.highlighted ? 'primary' : 'ghost'} className="mt-auto">
            {p.cta}
          </Button>
        </div>
      ))}
    </div>
  )
}
