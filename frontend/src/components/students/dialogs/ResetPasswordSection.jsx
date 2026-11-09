import { useId, useState } from 'react';
import Button from '@/components/shared/ui/Button';
import { useResetStudentPassword } from '@/hooks/account/useResetStudentPassword';
import { useSubmitLock } from '@/hooks/shared/useSubmitLock';
import { fieldErrorsFrom } from '@/utils/fieldErrors';

const toMessage = (error) => fieldErrorsFrom(error, { fields: [], fallback: 'No pudimos blanquear la clave' }).form;

/**
 * "Acceso a la app" en Editar alumno: el PT blanquea la clave y ve la temporal una sola vez (la pasa por WhatsApp).
 * Pasos: botón → confirmación → la clave con Copiar. La clave vive solo en este estado: al cerrar el diálogo se pierde.
 */
export default function ResetPasswordSection({ student }) {
  const titleId = useId();
  const [step, setStep] = useState('idle');
  const [temporary, setTemporary] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const reset = useResetStudentPassword(student.id);
  const lock = useSubmitLock();
  const sending = reset.isPending;

  const confirm = () =>
    lock(async () => {
      setError(null);
      try {
        const { temporary_password: password } = await reset.mutateAsync();
        setTemporary(password);
        setStep('done');
      } catch (err) {
        setError(toMessage(err));
      }
    });

  async function copy() {
    try {
      await navigator.clipboard.writeText(temporary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby={titleId} className="mt-5 border-t border-ink2 pt-4">
      <h3 id={titleId} className="font-display text-[13px] font-semibold text-bone0">
        Acceso a la app
      </h3>
      {step === 'idle' && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep('confirm')}>
          Blanquear clave
        </Button>
      )}
      {step === 'confirm' && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="font-body text-sm text-ink6">Se cierra su sesión en todos sus dispositivos</p>
          {error && (
            <p role="alert" className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={sending} onClick={() => setStep('idle')}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={sending} onClick={confirm}>
              Blanquear
            </Button>
          </div>
        </div>
      )}
      {step === 'done' && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="break-all font-mono text-2xl font-semibold tracking-[2px] text-bone0">{temporary}</span>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
          <p className="font-mono text-[11px] text-ink6">
            Se muestra una sola vez. Al entrar, tendrá que elegir una nueva.
          </p>
        </div>
      )}
    </section>
  );
}
