import { X } from 'lucide-react';

/** Previsualización de la foto elegida en el composer (`url` es un object URL), con "Quitar". */
export default function ImagePreview({ file, url, onRemove }) {
  return (
    <div className="flex items-center gap-3 border-t border-ink2 px-3 pt-2.5">
      {url && <img src={url} alt="Vista previa de la foto" className="h-14 w-14 rounded-md object-cover" />}
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink6">{file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-display text-xs font-medium text-bone0 hover:bg-ink2 focus-visible:outline-2 focus-visible:outline-accentText"
      >
        <X size={14} aria-hidden="true" />
        Quitar
      </button>
    </div>
  );
}
