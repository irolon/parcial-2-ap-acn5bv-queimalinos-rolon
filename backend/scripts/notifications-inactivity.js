import { runInactivityAlerts } from '../src/services/notifications/inactivity-job.service.js';

// Uso (desde backend/): npm run notifications:inactivity — corre el job de inactividad una vez a mano.
try {
  const result = await runInactivityAlerts();
  console.log('Job de inactividad:', result);
  process.exit(0);
} catch (err) {
  console.error('Falló el job de inactividad:', err);
  process.exit(1);
}
