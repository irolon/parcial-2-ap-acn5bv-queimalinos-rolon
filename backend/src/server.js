import { createApp } from './app.js';
import { env } from './config/env.js';
import { startScheduler } from './shared/utils/scheduler.js';
import { runDailyGamification } from './services/gamification/daily-job.service.js';
import { runInactivityAlerts } from './services/notifications/inactivity-job.service.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🚀 FitTrainer API escuchando en http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

if (env.CRON_ENABLED) {
  startScheduler({
    jobs: [
      { name: 'gamification', run: runDailyGamification },
      { name: 'inactividad', run: runInactivityAlerts },
    ],
  });
}
