import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import {
  BODY_METRICS_TABLE,
  BODY_METRIC_COLUMNS,
} from '../../models/body-metrics/body-metric.model.js';

/** Medida más reciente del alumno, o null si no tiene ninguna. */
export async function findLatestMetric(studentId) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select(BODY_METRIC_COLUMNS)
    .eq('student_id', studentId)
    .order('recorded_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Última altura registrada en o antes de `atOrBefore` (para el IMC), o null. */
export async function findLatestHeightCm(studentId, atOrBefore) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select('height_cm')
    .eq('student_id', studentId)
    .not('height_cm', 'is', null)
    .lte('recorded_at', atOrBefore)
    .order('recorded_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data?.height_cm ?? null;
}

/** Historial del alumno, de la medida más vieja a la más nueva (orden de los gráficos). */
export async function findMetricsByStudent(studentId) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select(BODY_METRIC_COLUMNS)
    .eq('student_id', studentId)
    .order('recorded_at', { ascending: true })
    .order('id', { ascending: true }); // desempate estable: el mismo que el de findLatestHeightCm
  if (error) throw Errors.internal(error.message);
  return data;
}

/**
 * Inserta una medida. Devuelve null si el id (generado en el cliente) ya
 * existe (23505): es un reintento y el service resuelve qué responder.
 */
export async function insertMetric(fields) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .insert(fields)
    .select(BODY_METRIC_COLUMNS)
    .single();
  if (error && error.code === '23505') return null;
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca una medida por id, o null. */
export async function findMetricById(id) {
  const { data, error } = await supabase
    .from(BODY_METRICS_TABLE)
    .select(BODY_METRIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Borra una medida por id. */
export async function deleteMetric(id) {
  const { error } = await supabase.from(BODY_METRICS_TABLE).delete().eq('id', id);
  if (error) throw Errors.internal(error.message);
}
