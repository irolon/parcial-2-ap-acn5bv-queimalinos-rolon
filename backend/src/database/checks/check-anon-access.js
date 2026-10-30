import dotenv from 'dotenv';

/**
 * Verifica que la API REST pública de Supabase no exponga datos con la anon
 * key. Con RLS activo y sin políticas, cada tabla devuelve [] con HTTP 200.
 *
 * Resultado por tabla:
 *   ok             HTTP 200 y [] (sin filas visibles)
 *   EXPUESTA       HTTP 200 con filas: fuga de datos
 *   NO CONCLUYENTE cualquier otra cosa (401/403 por key inválida, 404, 5xx,
 *                  cuerpo no-array o sin respuesta): no prueba nada
 * Cualquier EXPUESTA o NO CONCLUYENTE termina con exit 1.
 *
 * Ojo: una tabla VACÍA también devuelve [] aunque no tenga RLS. Este script es
 * concluyente para las tablas con datos; el flag de RLS de todas se verifica en
 * schema-checks.sql.
 *
 * Uso: npm run db:check-anon (lee SUPABASE_URL y SUPABASE_ANON_KEY de .env)
 */
dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en backend/.env');
  process.exit(1);
}

const TABLES = [
  'trainers',
  'refresh_tokens',
  'students',
  'body_metrics',
  'invitations',
  'exercises',
  'routine_templates',
  'routines',
  'routine_exercises',
  'sessions',
  'session_sets',
  'achievements',
  'student_achievements',
  'challenges',
  'student_challenges',
  'student_streaks',
  'chat_messages',
  'ai_routine_generations',
  'appointments',
  'notifications',
  // Vista (no tabla): con security_invoker hereda el RLS de sessions.
  'student_last_session',
];

const LABEL_WIDTH = 'NO CONCLUYENTE'.length;
let exposed = 0;
let inconclusive = 0;

/** Consulta una tabla con la anon key y la clasifica en ok / EXPUESTA / NO CONCLUYENTE. */
async function check(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const body = await res.json().catch(() => null);
    const status = `HTTP ${res.status}`;
    if (res.status !== 200 || !Array.isArray(body)) return { label: 'NO CONCLUYENTE', status };
    return { label: body.length > 0 ? 'EXPUESTA' : 'ok', status };
  } catch {
    return { label: 'NO CONCLUYENTE', status: 'sin respuesta' };
  }
}

for (const table of TABLES) {
  const { label, status } = await check(table);
  if (label === 'EXPUESTA') exposed += 1;
  if (label === 'NO CONCLUYENTE') inconclusive += 1;
  console.log(`${label.padEnd(LABEL_WIDTH)}  ${table}  (${status})`);
}

if (exposed || inconclusive) {
  console.log(`\n${exposed} tabla(s) EXPUESTA(S), ${inconclusive} NO CONCLUYENTE(S)`);
  process.exit(1);
}
console.log('\nNinguna tabla expuesta');
