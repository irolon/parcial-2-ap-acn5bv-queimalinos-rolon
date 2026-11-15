import { useRef, useState } from 'react';
import Avatar from '@/components/shared/ui/Avatar';
import Button from '@/components/shared/ui/Button';
import { avatarErrorMessage } from '@/hooks/students/useAvatar';
import { AVATAR_ACCEPT } from '@/utils/students/profile/resizeImage';

const UPLOAD_ERROR = 'No pudimos subir la foto';
const REMOVE_ERROR = 'No pudimos quitar la foto';

/**
 * Foto de perfil editable (alumno en Mi perfil, PT en Tu perfil): avatar de 84 px, "Cambiar foto" (abre el selector de
 * archivos; la foto se achica antes de subirla) y "Quitar" si hay foto. `avatar` es `{ upload, remove, uploading,
 * removing }` (`useAvatar` o `useTrainerAvatar`). Cada acción guarda sola; el error queda debajo hasta reintentar.
 */
export default function PhotoField({ name, src, avatar }) {
  const input = useRef(null);
  const [error, setError] = useState(null);
  const { upload, remove, uploading, removing } = avatar;
  const busy = uploading || removing;

  async function handleFile(event) {
    const [file] = event.target.files ?? [];
    // Se limpia para poder volver a elegir el mismo archivo.
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      await upload(file);
    } catch (err) {
      setError(avatarErrorMessage(err, UPLOAD_ERROR));
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await remove();
    } catch {
      setError(REMOVE_ERROR);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar name={name} src={src} size={84} decorative />
      <input
        ref={input}
        type="file"
        hidden
        accept={AVATAR_ACCEPT}
        aria-label="Elegir foto de perfil"
        onChange={handleFile}
      />
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          loading={uploading}
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          Cambiar foto
        </Button>
        {src && (
          <Button variant="ghost" size="sm" loading={removing} disabled={busy} onClick={handleRemove}>
            Quitar
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="font-mono text-[11px] text-hot">
          {error}
        </p>
      )}
    </div>
  );
}
