/** Aviso mientras se elige en la biblioteca el ejercicio que reemplaza a una fila. */
export default function ReplaceBanner({ name, onCancel }) {
  return (
    <p role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-accentText px-4 py-3 font-body text-sm text-bone0">
      <span>Elegí en la biblioteca el ejercicio que reemplaza a {name}. Conserva su lugar y sus valores.</span>
      <button type="button" onClick={onCancel} className="cursor-pointer font-mono text-xs uppercase text-ink6 underline hover:text-bone0">
        Cancelar
      </button>
    </p>
  );
}
