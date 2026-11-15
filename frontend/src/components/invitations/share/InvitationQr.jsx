import { forwardRef, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { tokenColor } from '@/utils/cssTokens';
import { LOGO_SIZE, brandLogoDataUrl } from './brandLogo';

// 196 px de módulos + 2 módulos de margen por lado, para que el PNG descargado se lea solo.
const QR_SIZE = 212;

/**
 * QR del link de alta, generado en el cliente, con el logo al centro.
 * Corrección de errores alta ("H") para que el logo no lo vuelva ilegible.
 */
const InvitationQr = forwardRef(function InvitationQr({ value, label }, ref) {
  const colors = useMemo(() => ({ fg: tokenColor('ink0'), bg: tokenColor('bone0') }), []);
  const imageSettings = useMemo(
    () => ({ src: brandLogoDataUrl(), width: LOGO_SIZE, height: LOGO_SIZE, excavate: true }),
    [],
  );

  return (
    <div className="relative mx-auto w-[240px] rounded-[16px] bg-bone0 p-[14px]">
      <QRCodeCanvas
        ref={ref}
        value={value}
        size={QR_SIZE}
        marginSize={2}
        level="H"
        fgColor={colors.fg}
        bgColor={colors.bg}
        imageSettings={imageSettings}
        aria-label={label}
        className="block"
      />
    </div>
  );
});

export default InvitationQr;
