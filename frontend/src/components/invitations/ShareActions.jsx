import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Send } from 'lucide-react';
import Button from '@/components/shared/ui/Button';

const COPIED_MS = 2000;

/** Link real con "Copiar link", y los botones WhatsApp y Descargar. */
export default function ShareActions({ joinUrl, whatsappUrl, onDownload }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
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
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          <span aria-live="polite">{copied ? '¡Copiado!' : 'Copiar link'}</span>
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
