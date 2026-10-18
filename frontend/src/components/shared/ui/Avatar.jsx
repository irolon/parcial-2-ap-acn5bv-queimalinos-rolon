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

export default function Avatar({ name = '', size = 40, tone, online = false, className = '' }) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full font-display font-bold ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-label={name}
      role="img"
    >
      <span aria-hidden="true">{getInitials(name)}</span>
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
