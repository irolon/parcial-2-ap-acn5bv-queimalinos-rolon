/* global __ENV, __VU, open */ // globales de k6
// Prueba de carga de los dos endpoints calientes (tarjeta 54, RNF-01):
//   GET  /routines/today      — la pantalla de inicio del alumno
//   POST /sessions/:id/sets   — el lote de series que sube el celular
// Rampa hasta 100 usuarios virtuales (RNF-01: "hasta 100 usuarios concurrentes").
// Umbrales: p95 < 500 ms y menos de 1 % de errores.
//
// Uso (ver load/README.md): docker run --rm -i -v <backend/load>:/load grafana/k6:0.57.0 run \
//   -e API_URL=http://host.docker.internal:3001/api /load/hot-endpoints.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const API = __ENV.API_URL || 'http://host.docker.internal:3001/api';
const data = JSON.parse(open('/load/users.json'));

export const options = {
  scenarios: {
    alumnos: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '60s', target: 100 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    'http_req_duration{endpoint:today}': ['p(95)<500'],
    'http_req_duration{endpoint:sets}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const headers = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

function setsBatch() {
  const now = new Date().toISOString();
  return data.exercises.map((exerciseId, i) => ({
    id: uuidv4(),
    exercise_id: exerciseId,
    set_number: i + 1,
    actual_reps: 10,
    actual_kg: 40,
    executed_at: now,
  }));
}

export default function () {
  // Cada VU usa un alumno del pool (varios VUs comparten alumno, como varios celulares a la vez).
  const student = data.students[(__VU - 1) % data.students.length];

  const today = http.get(`${API}/routines/today`, { headers: headers(student.token), tags: { endpoint: 'today' } });
  check(today, { 'today 200': (r) => r.status === 200 });

  const sets = http.post(
    `${API}/sessions/${student.sessionId}/sets`,
    JSON.stringify({ sets: setsBatch() }),
    { headers: headers(student.token), tags: { endpoint: 'sets' } }
  );
  check(sets, { 'sets 200 sin fallidas': (r) => r.status === 200 && r.json('data.failed').length === 0 });

  // Un alumno real no golpea sin pausa: entre 1 y 3 s entre pantallas.
  sleep(1 + Math.random() * 2);
}
