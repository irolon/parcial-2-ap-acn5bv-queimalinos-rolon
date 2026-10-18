import { Zap } from 'lucide-react';

/** Logo cuadrado de la marca: fondo accent y rayo, como el prototipo (28 px, radio 8). */
export default function BrandMark({ size = 28 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-sm bg-accent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Zap size={Math.round(size * 0.57)} strokeWidth={2} className="fill-accentInk text-accentInk" />
    </div>
  );
}
