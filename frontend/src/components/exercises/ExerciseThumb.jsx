import { useState } from 'react';
import { Video } from 'lucide-react';
import { thumbnailUrl } from './videoUrl';

const STRIPES =
  'repeating-linear-gradient(135deg, var(--color-ink2) 0 8px, var(--color-ink3) 8px 16px)';

/** Miniatura de YouTube; sin video de YouTube o si falla la imagen, un placeholder rayado. */
export default function ExerciseThumb({ url }) {
  const src = url ? thumbnailUrl(url) : null;
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="aspect-video w-full rounded-lg object-cover"
      />
    );
  }
  return (
    <div
      data-testid="thumb-placeholder"
      className="flex aspect-video w-full items-center justify-center rounded-lg text-ink5"
      style={{ background: STRIPES }}
    >
      <Video size={22} aria-hidden="true" />
    </div>
  );
}
