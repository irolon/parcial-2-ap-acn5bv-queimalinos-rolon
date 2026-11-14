import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Send } from 'lucide-react';
import Button from '@/components/shared/ui/Button';

const FEEDBACK_MS = 2000;
const COPY_FAILED = 'No se pudo copiar, copialo a mano';

/** Link real con "Copiar link", y los botones WhatsApp y Descargar. */
export default function ShareActions({ joinUrl, whatsappUrl, onDownload }) {
  const [feedback, setFeedback] = useState(null); // null | 'ok' | 'error'
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copyLink() {
    let result = 'ok';
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      result = 'error';
    }
    setFeedback(result);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }

  // Pestaña nueva sin acceso a esta ventana (equivale a rel="noopener noreferrer").
  function openWhatsapp() {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="relative mt-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-md border border-ink3 bg-ink0 py-1.5 pl-3 pr-1.5">
        <span
          data-testid="join-url"
          title={joinUrl}
          className="min-w-0 flex-1 truncate font-mono text-[11px] text-bone0"
        >
          {joinUrl}
        </span>
        <Button variant="ghost" size="sm" onClick={copyLink}>
          {feedback === 'ok' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          <span aria-live="polite">
            {feedback === 'ok' ? '¡Copiado!' : feedback === 'error' ? COPY_FAILED : 'Copiar link'}
          </span>
        </Button>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={openWhatsapp} disabled={!whatsappUrl}>
          <Send size={16} aria-hidden="true" />
          WhatsApp
        </Button>
        <Button variant="ghost" onClick={onDownload}>
          <Download size={16} aria-hidden="true" />
          Descargar
        </Button>
      </div>
    </div>
  );
}
