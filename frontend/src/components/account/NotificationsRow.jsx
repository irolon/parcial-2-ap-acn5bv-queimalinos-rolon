import { useState } from 'react';
import { useNotificationPrefs } from '@/hooks/notifications/useNotificationPrefs';
import { summary } from '@/utils/notifications/preferences';
import AccountRow from './AccountRow';
import NotificationPrefsDialog from './NotificationPrefsDialog';

/** Fila "Notificaciones" de la tarjeta Cuenta del alumno (GX3): el resumen de sus avisos y el diálogo para cambiarlos. */
export default function NotificationsRow() {
  const { query } = useNotificationPrefs();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (query.isError) {
    return (
      <AccountRow
        title="Notificaciones"
        subtitle="No pudimos cargar tus preferencias"
        actionLabel="Reintentar"
        onAction={() => query.refetch()}
        loading={query.isFetching}
      />
    );
  }

  const loaded = query.data !== undefined;
  return (
    <>
      <AccountRow
        title="Notificaciones"
        subtitle={loaded ? summary(query.data) : 'Cargando…'}
        actionLabel="Editar"
        onAction={() => setDialogOpen(true)}
        loading={!loaded}
      />
      {loaded && (
        <NotificationPrefsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initial={query.data} />
      )}
    </>
  );
}
