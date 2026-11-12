/** Punto verde de "en curso" (GX4): late, salvo con movimiento reducido. Decorativo: el texto lo dice al lado. */
export default function LiveDot() {
  return (
    <span
      aria-hidden="true"
      data-live-dot
      className="inline-block size-2 shrink-0 rounded-full bg-good animate-pulse motion-reduce:animate-none"
    />
  );
}
