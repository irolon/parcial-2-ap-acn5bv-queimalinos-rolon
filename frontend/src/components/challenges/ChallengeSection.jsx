import { useId } from 'react';
import ChallengeCard from './ChallengeCard';

/** Sección titulada de desafíos; sin desafíos muestra `empty`. */
export default function ChallengeSection({ title, challenges, empty, onAssign, onDelete }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="font-display text-base font-semibold text-bone0">
        {title}
      </h2>
      {challenges.length === 0 ? (
        empty
      ) : (
        <ul className="flex flex-col gap-3">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} onAssign={onAssign} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}
