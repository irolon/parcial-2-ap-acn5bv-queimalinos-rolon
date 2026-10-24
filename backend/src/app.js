import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './shared/middlewares/error.middleware.js';
import healthRoutes from './routes/health/health.routes.js';
import authRoutes from './routes/auth/auth.routes.js';
import invitationsRoutes from './routes/invitations/invitations.routes.js';
import studentsRoutes from './routes/students/students.routes.js';
import exercisesRoutes from './routes/exercises/exercises.routes.js';
import routinesRoutes from './routes/routines/routines.routes.js';
import routineTemplatesRoutes from './routes/routine-templates/routine-templates.routes.js';

export function createApp() {
  const app = express();

  // Seguridad y utilidades base.
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Health checks (fuera de /api, como en el README).
  app.use('/health', healthRoutes);

  // API REST — todos los módulos cuelgan de /api.
  app.use('/api/auth', authRoutes);
  app.use('/api/invitations', invitationsRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/exercises', exercisesRoutes);
  app.use('/api/routines', routinesRoutes);
  app.use('/api/routine-templates', routineTemplatesRoutes);

  // 404 + manejador central de errores (siempre al final).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
