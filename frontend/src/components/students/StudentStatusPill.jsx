import Pill from '@/components/shared/ui/Pill';
import { STATUS_LABELS } from '@/utils/students/activity';

const TONES = { inactive: 'hot', new: 'cool', disabled: 'ghost' };

/** Insignia de estado; "Al día" solo se muestra con `showUpToDate` (la ficha), no en las tarjetas. */
export default function StudentStatusPill({ status, showUpToDate = false }) {
  const tone = TONES[status] ?? (showUpToDate && status === 'active' ? 'good' : undefined);
  return tone ? <Pill tone={tone}>{STATUS_LABELS[status]}</Pill> : null;
}
