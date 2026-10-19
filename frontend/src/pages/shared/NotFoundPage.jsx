import { Link } from 'react-router';
import { SearchX } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink0 p-4">
      <p className="font-mono text-[11px] tracking-[1px] text-ink6">ERROR 404</p>
      <EmptyState
        icon={SearchX}
        titleAs="h1"
        title="No encontramos esta página"
        text="La dirección no existe o se movió."
      />
      <Link
        to="/"
        className="font-display text-sm font-semibold text-accentText hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
