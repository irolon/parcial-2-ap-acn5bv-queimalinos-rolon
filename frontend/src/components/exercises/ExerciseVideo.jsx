import { ExternalLink } from 'lucide-react';
import ExerciseThumb from './ExerciseThumb';
import { isSafeVideoUrl, youTubeEmbedUrl } from '@/utils/exercises/videoUrl';

function NewTabLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 self-start font-body text-sm text-accentText hover:underline"
    >
      <ExternalLink size={14} aria-hidden="true" />
      {children}
    </a>
  );
}

/**
 * Video del ejercicio: reproductor de YouTube sin cookies si el link es de YouTube (con un link de
 * respaldo: hay videos con el embebido deshabilitado); si no, la miniatura y "Ver video" en otra pestaña.
 */
export default function ExerciseVideo({ url, name }) {
  const embed = isSafeVideoUrl(url) ? youTubeEmbedUrl(url) : null;
  if (!embed) {
    return (
      <>
        <ExerciseThumb url={url} />
        {isSafeVideoUrl(url) && <NewTabLink href={url}>Ver video</NewTabLink>}
      </>
    );
  }
  return (
    <>
      <iframe
        src={embed}
        title={`Video de ${name}`}
        loading="lazy"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full rounded-lg border-0 bg-ink2"
      />
      <NewTabLink href={url}>Abrir en YouTube</NewTabLink>
    </>
  );
}
