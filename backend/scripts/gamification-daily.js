import { runDailyGamification } from '../src/services/gamification/daily-job.service.js';

// Uso (desde backend/): npm run gamification:daily — corre el job diario una vez a mano.
try {
  const result = await runDailyGamification();
  console.log('Job diario de gamificación:', result);
  process.exit(0);
} catch (err) {
  console.error('Falló el job diario de gamificación:', err);
  process.exit(1);
}
