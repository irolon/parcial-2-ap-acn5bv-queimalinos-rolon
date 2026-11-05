# Prueba de carga (k6)

Escenario de la tarjeta 54 contra los dos endpoints calientes, para medir RNF-01 (p95 < 500 ms con hasta 100 usuarios concurrentes):

- `GET /routines/today`: la pantalla de inicio del alumno.
- `POST /sessions/:id/sets`: el lote de series que sube el celular (3 series nuevas por iteración).

Rampa de 0 a 100 usuarios virtuales en 30 s, meseta de 60 s y bajada de 10 s. Cada usuario virtual hace las dos requests y espera 1–3 s, como un alumno real. Umbrales: `p(95) < 500 ms` y errores < 1 %.

## Cómo correrla

Desde `backend/`, con el backend levantado (`npm run dev`) y Docker Desktop prendido:

```bash
node load/setup-users.mjs > load/users.json
```

```bash
docker run --rm -i -v "$(pwd)/load:/load" grafana/k6:0.57.0 run -e API_URL=http://host.docker.internal:3001/api /load/hot-endpoints.js
```

- `setup-users.mjs` arma por la API un PT de QA, 10 alumnos (`LOAD_STUDENTS`), una rutina de los 7 días por alumno y una sesión abierta por alumno. Todo usa emails de QA (`it.<corrida>…@test.fittrainer.dev`), así que `npm run test:integration:clean` lo borra una vez que pasó 1 hora.
- `users.json` tiene tokens de acceso: está en `.gitignore` y conviene borrarlo al terminar.
- Contra el VPS: `API_URL=https://<dominio>/api`. Si nginx limita por IP, la carga sale de una sola IP.

Los resultados se anotan en `docs/proceso/auditoria-seguridad.md` ("Prueba de carga").
