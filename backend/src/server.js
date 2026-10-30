import { createApp } from './app.js';
import { env } from './config/env.js';
import { startScheduler } from './services/gamification/scheduler.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🚀 FitTrainer API escuchando en http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

if (env.CRON_ENABLED) startScheduler();
