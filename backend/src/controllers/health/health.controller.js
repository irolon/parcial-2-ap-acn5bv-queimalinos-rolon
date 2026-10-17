import { supabase } from '../../config/supabase.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const VERSION = '0.1.0';

/** GET /health — liveness básico del servicio. */
export const health = (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: VERSION });
};

/** GET /health/db — verifica conectividad con Supabase/PostgreSQL. */
export const healthDb = asyncHandler(async (_req, res) => {
  const start = Date.now();
  // Consulta liviana contra una tabla existente; cuenta sin traer filas.
  const { error } = await supabase.from('trainers').select('id', { count: 'exact', head: true });
  const latencyMs = Date.now() - start;

  if (error) {
    return res.status(503).json({ db: 'error', message: error.message, latency_ms: latencyMs });
  }
  return res.json({ db: 'connected', latency_ms: latencyMs });
});
