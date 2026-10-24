import { ExternalLink } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Pill from '@/components/shared/ui/Pill';
import ExerciseThumb from '../ExerciseThumb';
import { equipmentLabel, muscleLabel } from '@/utils/exercises/exerciseOptions';
import { isSafeVideoUrl } from '@/utils/exercises/videoUrl';

const LABEL = 'font-mono text-[11px] uppercase tracking-[1px] text-ink6';

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={LABEL}>{label}</dt>
      <dd className="font-body text-sm text-bone0">{children}</dd>
    </div>
  );
}

/** Detalle de solo lectura; los ejercicios propios ofrecen Editar y Borrar. */
export default function ExerciseDetailDialog({ exercise, onClose, onEdit, onDelete }) {
  const { name, muscle_group: muscle, equipment, description, video_url: videoUrl } = exercise;
  const own = !exercise.is_global;

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={name}
      footer={
        own && (
          <>
            <Button variant="ghost" onClick={() => onEdit(exercise)}>
              Editar
            </Button>
            <Button variant="danger" onClick={() => onDelete(exercise)}>
              Borrar
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {own && (
          <div>
            <Pill tone="cool">PROPIO</Pill>
          </div>
        )}
        <ExerciseThumb url={videoUrl} />
        <dl className="flex flex-col gap-2">
          <Row label="GRUPO">{muscleLabel(muscle)}</Row>
          <Row label="EQUIPAMIENTO">{equipmentLabel(equipment) ?? 'Sin equipamiento'}</Row>
        </dl>
        <div>
          <p className={LABEL}>DESCRIPCIÓN</p>
          <p className="mt-1 whitespace-pre-line font-body text-sm text-bone0">
            {description || 'Sin descripción'}
          </p>
        </div>
        {isSafeVideoUrl(videoUrl) && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-body text-sm text-accentText hover:underline"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Ver video
          </a>
        )}
      </div>
    </Dialog>
  );
}
