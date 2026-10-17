# Spec — Acuerdos de equipo + CONTRIBUTING.md

- **Tarjeta:** "2 · Acuerdos de equipo + CONTRIBUTING.md (con Igna)" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/J04ndRqd
- **Fecha:** 2026-10-17
- **Rama:** `docs/team-agreements`, sale de `develop`. PR a `develop`; la revisa y aprueba Igna, y esa aprobación es su conformidad con los acuerdos.
- **Fuentes:** tarjeta de equipo; guía del tablero de equipo ("Cómo se usa este tablero": DoD, WIP, ritual); Notion *README Técnico* §7–§9; práctica real del repo (PRs #2–#14).

## 1. Objetivo

Escribir en `CONTRIBUTING.md` cómo trabaja el equipo: ramas y releases, commits, PRs y review, Definition of Done, bloqueos y specs. Así el acuerdo queda en el repo y no en un chat.

**Criterio de aceptación (de la tarjeta):** el acuerdo está en `CONTRIBUTING.md` y los dos hicieron al menos un PR revisado por el otro.

## 2. Decisiones tomadas

### Ramas y releases
- La rama principal se llama **`master`** (no `main`). `develop` es la integración y la rama por defecto del repo.
- `master` representa **las entregas**. Solo recibe una PR de release desde `develop` en cada hito. Hitos y tags:

  | Hito | Fecha | Tag |
  |---|---|---|
  | Feature freeze | 08/11 | `v0.1` |
  | Congelamiento | 22/11 | `v0.2` |
  | Defensa | 04/12 | `v1.0` |

- Cuando llegue el VPS (S7), `master` es lo que se despliega. El primer release es el del 08/11; antes no se toca `master`.
- Ramas de trabajo, que salen de `develop` y vuelven a `develop` por PR:
  - `feature/` para funcionalidad;
  - `fix/` para correcciones;
  - `docs/` para cambios que son solo documentación.
- Nombre de rama en inglés, kebab-case, sin número de tarjeta. Ejemplo: `feature/exercises-library`.
- Nadie pushea directo a `develop` ni a `master`.
- Se evitan las PRs apiladas. Si una es inevitable, apunta a la rama base, y al mergear la base se le cambia el destino a `develop`.

### Commits
- Conventional Commits, con tipos `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Descripción en español.
- El scope es recomendado, no obligatorio. Valores sugeridos: `backend`, `mobile`, `web`, `db`, `docker` o el módulo (`exercises`, `routines`…).
- La referencia a la tarjeta va en el título de la PR (`(tarjeta 9)`); en el commit es opcional.

### Pull requests y review
- Todo entra por PR. Revisa, aprueba y **mergea el otro**, nunca el autor.
- Como no hay CI, el revisor:
  - corre lint y tests de lo afectado, combinado con `develop`;
  - compara contra el spec o la tarjeta y contra las reglas de código;
  - aprueba o pide cambios, y marca cada observación como **bloqueante** o **menor**. Las menores no frenan el merge.
- La review se responde en 24 h hábiles. La tarjeta presupuesta unos 30 minutos por PR: el objetivo es que los dos entiendan todo el sistema antes de la defensa.
- Merge con **merge commit** (no squash ni rebase). La rama se borra después del merge.
- Plantilla de PR en `.github/pull_request_template.md`, con estas secciones: tarjeta y spec, qué hace, cómo se probó, checklist de la DoD.

### Definition of Done
`CONTRIBUTING.md` es la fuente de verdad. Una tarjeta está terminada cuando:
1. Todos los ítems del checklist de la tarjeta están tildados.
2. Está mergeada a `develop` por una PR aprobada por el otro.
3. Lint y tests pasan:
   - backend: `npm run lint` y `npm test`;
   - mobile: `gradlew checkFileLength testDebugUnitTest`, y `connectedDebugAndroidTest` si tocó Room u otro código instrumentado;
   - web: `npm run lint` y tests, cuando exista.
4. Cumple las reglas de código (200 líneas; capa → módulo → archivo).
5. Se probó a mano el flujo completo de punta a punta.
6. Si cambió el contrato de la API o el schema, está actualizado en Notion.

### Bloqueos y ritual
- Si uno queda bloqueado esperando al otro, avisa **el mismo día** por WhatsApp y lo deja anotado en un comentario de la tarjeta o la PR.
- Mientras espera, toma la siguiente tarjeta. El WIP es de máximo 2 tarjetas en curso por persona.
- Ritual semanal de 30 minutos, el que ya figura en el tablero:
  - lunes: planificación;
  - jueves: checkpoint (bloqueos, tarjetas con más de 4 días en curso).

### Specs y plans
- Cada tarjeta de más de medio día lleva un spec en `docs/superpowers/specs/AAAA-MM-DD-<tema>-design.md`. Si hace falta, también un plan en `docs/superpowers/plans/`.
- Se commitean en la misma rama que el código. El spec manda ante cualquier conflicto, y el revisor compara contra él.

### Asistentes de IA
- Se pueden usar para programar y para revisar.
- Commits, PRs, reviews y comentarios no llevan firma ni trailers de IA (`Co-Authored-By`, "Generated with…").
- Una auditoría con IA complementa la review humana, nunca la reemplaza: siempre aprueba la otra persona.

### Estructura del archivo
- El título pasa a "Cómo trabajamos en FitTrainer", con un índice.
- Secciones nuevas, en este orden: Ramas y releases · Commits · Pull requests y review · Definition of Done · Bloqueos y ritual semanal · Specs y plans · Asistentes de IA · Reglas de código.
- "Reglas de código" contiene las dos reglas actuales (200 líneas y orden) **sin cambiar el texto**, y también "Cómo se controla".
- Una línea al principio dice que este archivo es la fuente de verdad del flujo de trabajo y que, si Notion o el tablero dicen otra cosa, manda el archivo.

### Fuera del repo (mismo PR / misma tarjeta)
- **Notion, README Técnico:** cambiar `main` → `master` en §7 (ramas y flujo típico) y §9 (deploy), y agregar una línea que diga que el flujo detallado está en `CONTRIBUTING.md`.
- **Trello, tablero de equipo:** solo el texto `main` → `master` en la tarjeta de acuerdos y en cualquier otra donde aparezca. Nada más.
- **Para Igna, pedido en la PR** (requiere permisos de admin del repo):
  - proteger `develop` y `master` con PR obligatoria y 1 aprobación;
  - activar `delete_branch_on_merge`;
  - dejar habilitado solo el merge commit;
  - hacer que la DoD de la guía del tablero apunte a `CONTRIBUTING.md`.

## 3. Evidencia del criterio "PR revisado por el otro"
- Igna revisó, aprobó y mergeó las PRs de Pablo #9 y #10.
- Pablo revisó las PRs de Igna #2 a #8 y #11 a #13 (y #1, que no se aprobó).
- La PR de esta tarjeta la revisa Igna.

## 4. Fuera de alcance
- Cambiar la configuración del repo en GitHub (lo hace Igna).
- Borrar las ramas viejas del remoto: se listan en la PR y se limpian cuando se active el borrado automático.
- Definition of Ready, CI y reparto de responsables por capa.
- Actualizar otras partes desactualizadas de Notion (estructura de carpetas, GitHub Actions) o del "Documento Control de Versiones". Se listan en la PR.
