import 'dotenv/config';
import { assertRealSupabase } from './lib/qa-env.js';
import { DEMO_DOMAIN, STUDENTS, TRAINER } from './demo/people.js';

// Uso (desde backend/):
//   npm run demo:seed                          borra la demo anterior y carga la nueva (fechas relativas a hoy)
//   npm run demo:seed -- --date 2026-11-18     carga para ese día (sirve para correrlo la noche anterior)
//   npm run demo:reset                         solo borra la demo
// El historial llega hasta el día anterior a la demo: corrido un día antes sin --date, ese día queda
// sin entrenar y las rachas se cortan. Contraseña de todas las cuentas: DEMO_PASSWORD (backend/.env).
// Solo corre contra Supabase dev.
assertRealSupabase(process.env);
const resetOnly = process.argv.includes('--reset');
const { demoNow, localDateOf } = await import('./demo/dates.js');
let now;
try {
  now = demoNow(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
const password = process.env.DEMO_PASSWORD?.trim();
if (!resetOnly && (!password || password.length < 8)) {
  console.error('Falta DEMO_PASSWORD en backend/.env (mínimo 8 caracteres): es la contraseña de las cuentas de demo.');
  process.exit(1);
}

// Después del guard: los servicios de la app leen el .env al importarse.
const { supabase } = await import('../src/config/supabase.js');
const { resetDemo } = await import('./demo/reset.js');
const { seedDemo } = await import('./demo/seed.js');

try {
  const removed = await resetDemo(supabase);
  console.log(`Demo anterior borrada: ${removed.trainers} entrenadora(s), ${removed.students} alumnos`);
  if (!resetOnly) {
    const started = Date.now();
    const result = await seedDemo(supabase, { password, now });
    console.log(`\nDemo cargada en ${Math.round((Date.now() - started) / 1000)} s: ${result.students} alumnos, ${result.sessions} sesiones.`);
    console.log(`Preparada para el ${localDateOf(now)}: usala ese día (otro día, las rachas no coinciden).`);
    console.log(`Entrenadora: ${TRAINER.email}`);
    console.log(`Alumnos: ${STUDENTS.map((s) => s.email.replace(`@${DEMO_DOMAIN}`, '')).join(', ')} (@${DEMO_DOMAIN})`);
    console.log('Contraseña: la de DEMO_PASSWORD.');
  }
  process.exit(0);
} catch (err) {
  console.error('Falló la demo:', err);
  process.exit(1);
}
