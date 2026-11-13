import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useIsChangingPassword } from '@/hooks/account/useChangePassword';
import ChangePasswordForm from './ChangePasswordForm';

const FORM_ID = 'change-password-form';

/** Cambiar la contraseña con la actual. Al guardar: `onChanged()` y se cierra. */
export default function ChangePasswordDialog({ open, onClose, onChanged }) {
  const saving = useIsChangingPassword();

  function handleSuccess() {
    onChanged?.();
    onClose();
  }

  return (
    <Dialog
      open={open}
      dismissible={!saving}
      onOpenChange={(next) => !next && onClose()}
      title="Cambiar contraseña"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      {open && <ChangePasswordForm formId={FORM_ID} onSuccess={handleSuccess} />}
    </Dialog>
  );
}
