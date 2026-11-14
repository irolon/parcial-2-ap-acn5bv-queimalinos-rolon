import { useState } from 'react';
import Switch from '@/components/shared/forms/Switch';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useNotificationPrefs } from '@/hooks/notifications/useNotificationPrefs';
import { PREFERENCE_ITEMS, pickPreferences } from '@/utils/notifications/preferences';

const sameAs = (a, b) => PREFERENCE_ITEMS.every(({ type }) => a[type] === b[type]);

/**
 * Diálogo "Avisos en tu celular" (GX3): cinco interruptores sobre una copia local de `initial` (lo del GET), que se
 * vuelve a tomar cada vez que se abre. Guardar manda los cinco y cierra; si falla, avisa adentro y no cierra.
 */
export default function NotificationPrefsDialog({ open, onClose, initial }) {
  const { save, isSaving } = useNotificationPrefs({ enabled: false });
  const [draft, setDraft] = useState(() => pickPreferences(initial));
  const [failed, setFailed] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  // Al abrir, se descarta lo que haya quedado de la vez anterior (Cancelar no guarda).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(pickPreferences(initial));
      setFailed(false);
    }
  }

  async function handleSave() {
    setFailed(false);
    try {
      await save(draft);
      onClose();
    } catch {
      setFailed(true);
    }
  }

  return (
    <Dialog
      open={open}
      dismissible={!isSaving}
      onOpenChange={(next) => !next && onClose()}
      title="Avisos en tu celular"
      description="Elegí qué te avisamos con una notificación. Lo apagado igual queda en la app."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={isSaving} disabled={sameAs(draft, initial)}>
            Guardar
          </Button>
        </>
      }
    >
      {PREFERENCE_ITEMS.map(({ type, title, detail }) => (
        <Switch
          key={type}
          id={`notification-pref-${type}`}
          label={title}
          detail={detail}
          checked={draft[type] !== false}
          disabled={isSaving}
          onChange={(next) => setDraft((current) => ({ ...current, [type]: next }))}
        />
      ))}
      {failed && (
        <p role="alert" className="mt-3 font-body text-[13px] text-hot">
          No pudimos guardar tus preferencias
        </p>
      )}
    </Dialog>
  );
}
