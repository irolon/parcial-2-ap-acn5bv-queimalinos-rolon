import { formatKg, formatVolume } from '@/utils/progress/format';

/** `30 días` (`1 día`). */
export const durationLabel = (days) => `${days} ${days === 1 ? 'día' : 'días'}`;

const GOAL_LABELS = {
  sessions_count: (value) => `${value} sesiones`,
  streak: (value) => `Racha de ${durationLabel(value)}`,
  volume: (value) => `${formatVolume(value)} de volumen`,
  weight_target: (value) => `Llegar a ${formatKg(value)}`,
};

/** Meta legible: "12 sesiones", "Racha de 14 días", "10 t de volumen", "Llegar a 75 kg". */
export function goalLabel({ goal_type: type, goal_value: value }) {
  return GOAL_LABELS[type]?.(value) ?? String(value);
}
