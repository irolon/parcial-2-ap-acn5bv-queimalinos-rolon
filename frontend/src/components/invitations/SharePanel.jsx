import { useRef } from 'react';
import { QrCode } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Button from '@/components/shared/ui/Button';
import { downloadCanvasPng } from '@/utils/download';
import { whenLogoReady } from './brandLogo';
import InvitationQr from './InvitationQr';
import ShareActions from './ShareActions';
import StudentSteps from './StudentSteps';
import { firstName, hoursLeft, qrFileName } from './shareFormat';

const GLOW = {
  background:
    'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-accent) 13%, transparent), transparent 60%)',
};

function GeneratedQr({ invitation, studentName, onReset }) {
  const canvasRef = useRef(null);
  const hours = hoursLeft(invitation.expires_at);

  return (
    <>
      <InvitationQr
        ref={canvasRef}
        value={invitation.join_url}
        label={`Código QR de la invitación de ${studentName}`}
      />
      <p className="relative mt-4 text-center font-display text-base font-semibold text-bone0">
        {firstName(studentName)}, abrí con la cámara
      </p>
      <p className="relative mt-1 text-center font-mono text-[10px] tracking-[0.5px] text-ink6">
        {hours ? `VÁLIDO ${hours}H` : 'VENCIDA'}
      </p>
      <ShareActions
        joinUrl={invitation.join_url}
        whatsappUrl={invitation.whatsapp_share_url}
        onDownload={async () => {
          await whenLogoReady();
          downloadCanvasPng(canvasRef.current, qrFileName(studentName));
        }}
      />
      <Button variant="dark" full onClick={onReset} className="relative mt-2">
        Generar otro
      </Button>
    </>
  );
}

/** Columna derecha: estado vacío hasta generar; después, el QR y cómo compartirlo. */
export default function SharePanel({ invitation, studentName, onReset }) {
  return (
    <section aria-labelledby="share-title">
      <h2 id="share-title" className="mb-2.5 font-mono text-[10px] tracking-[1px] text-ink6">
        PASO 2 · COMPARTIR QR
      </h2>
      <div
        data-testid="share-panel"
        className="relative overflow-hidden rounded-[20px] border border-ink3 bg-ink1 p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-10 -top-[60px]"
          style={GLOW}
        />
        {invitation ? (
          <GeneratedQr invitation={invitation} studentName={studentName} onReset={onReset} />
        ) : (
          <div className="relative">
            <EmptyState icon={QrCode} title="Completá los datos y generá el QR" />
          </div>
        )}
      </div>
      <StudentSteps />
    </section>
  );
}
