import { checkPasswordRules } from '@/utils/account/passwordRules';

/** Reglas de la clave nueva en vivo: ✓ las que cumple, · las que faltan. */
export default function PasswordRulesList({ password }) {
  return (
    <ul aria-label="Requisitos" aria-live="polite" className="flex flex-wrap gap-x-4 gap-y-1">
      {checkPasswordRules(password).map((rule) => (
        <li
          key={rule.id}
          data-ok={String(rule.ok)}
          className={`font-mono text-[11px] ${rule.ok ? 'text-accentText' : 'text-ink6'}`}
        >
          <span aria-hidden="true">{rule.ok ? '✓' : '·'}</span> {rule.label}
          <span className="sr-only">{rule.ok ? ' (cumplido)' : ' (falta)'}</span>
        </li>
      ))}
    </ul>
  );
}
