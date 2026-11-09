import { useState } from 'react';

const TONES = {
  accent: 'bg-accent text-accentInk',
  hot: 'bg-hot/20 text-hot',
  neutral: 'bg-ink3 text-bone0',
};

export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

/**
 * Foto (`src`, URL firmada que vence en 1 h) o iniciales. Si la foto no carga vuelve a las
 * iniciales; se guarda qué `src` falló, así un `src` nuevo (foto recién subida) se vuelve a intentar.
 */
export default function Avatar({
  name = '',
  src,
  size = 40,
  tone,
  online = false,
  decorative = false,
  className = '',
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const showPhoto = Boolean(src) && src !== failedSrc;
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full font-display font-bold ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? 'true' : undefined}
      role={decorative ? undefined : 'img'}
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          className="h-full w-full rounded-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
      {online && (
        <span
          className="absolute -bottom-px -right-px rounded-full border-2 border-ink0 bg-good"
          style={{ width: size * 0.26, height: size * 0.26 }}
          data-testid="avatar-online"
        />
      )}
    </div>
  );
}
