const cells = [
  [26, 2, 6, 6], [36, 8, 6, 6], [26, 16, 6, 6], [2, 26, 6, 6], [14, 30, 6, 6], [26, 28, 12, 6],
  [44, 26, 6, 6], [58, 30, 10, 6], [32, 40, 6, 6], [48, 40, 6, 12], [26, 52, 6, 6], [38, 58, 6, 10],
  [58, 52, 10, 6], [56, 62, 6, 6], [22, 40, 6, 6],
]
const finders = [[0, 0], [50, 0], [0, 50]]

/** QR decorativo (no escaneable). */
export function QrMock() {
  return (
    <svg viewBox="0 0 70 70" className="size-[104px] shrink-0 rounded-field bg-bone p-2" aria-hidden="true">
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="20" height="20" rx="3" fill="#0b0d0c" />
          <rect x={x + 4} y={y + 4} width="12" height="12" rx="2" fill="#f5f2ec" />
          <rect x={x + 7} y={y + 7} width="6" height="6" fill="#0b0d0c" />
        </g>
      ))}
      {cells.map(([x, y, w, h]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="#0b0d0c" />)}
    </svg>
  )
}
