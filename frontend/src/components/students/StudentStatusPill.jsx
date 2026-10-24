import Pill from '@/components/shared/ui/Pill';
import { STATUS_LABELS } from '@/utils/students/activity';

const TONES = { inactive: 'hot', new: 'cool', disabled: 'ghost' };

/** Insignia de estado; no muestra nada si el alumno está al día. */
export default function StudentStatusPill({ status }) {
  const tone = TONES[status];
  return tone ? <Pill tone={tone}>{STATUS_LABELS[status]}</Pill> : null;
}
