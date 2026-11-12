import { sparkPoints } from '@/utils/progress/exerciseDetail';

const W = 64;
const H = 26;

/** Curva mínima de 64 × 26, sin ejes, con el trazo de acento (decorativa: los números van al lado). */
export default function Sparkline({ values }) {
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <polyline
        points={sparkPoints(values, W, H)}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
