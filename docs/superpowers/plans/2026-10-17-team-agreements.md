# Plan — Acuerdos de equipo + CONTRIBUTING.md

- **Spec:** `docs/superpowers/specs/2026-10-17-team-agreements-design.md` (autoridad; ante conflicto, manda el spec).
- **Rama:** `docs/team-agreements` (sale de `origin/develop`).

## Global Constraints

- Todo en español rioplatense neutro, con el tono de los docs existentes (frases cortas, listas, negritas para lo clave).
- **Sin firma de asistentes**: commits, PRs, comentarios y ediciones externas no llevan `Co-Authored-By`, "Generated with…" ni mención de autoría automática. Conventional Commits en español.
- Las dos reglas de código actuales de `CONTRIBUTING.md` (Regla 1, Regla 2 con sus árboles, y "Cómo se controla") se conservan **con el texto idéntico**; solo cambian de lugar y su nivel de título.
- La rama principal se llama `master`. Nunca escribir `main` como nombre de rama.
- No pushear. No cambiar configuración de GitHub. En Trello, el tablero de equipo solo admite el cambio de texto `main` → `master`.

## Task 1: CONTRIBUTING.md y plantilla de PR

**Archivos:**
- `CONTRIBUTING.md` (raíz): reestructurar según spec §2 "Estructura del archivo".
  - Título `# Cómo trabajamos en FitTrainer`.
  - Línea de fuente de verdad: este archivo manda sobre Notion y el tablero.
  - Índice con links a las secciones.
  - Secciones nuevas, en este orden y con el contenido del spec §2: Ramas y releases (con la tabla de hitos y tags), Commits, Pull requests y review, Definition of Done (los 6 puntos), Bloqueos y ritual semanal, Specs y plans, Asistentes de IA.
  - Al final, "Reglas de código": las dos reglas actuales con el texto exacto (incluidos "no negociables", los ejemplos y los árboles) y "Cómo se controla".
  - Que se entienda leyéndolo una vez; nada de repetir lo mismo en dos secciones.
- `.github/pull_request_template.md`: secciones "Tarjeta y spec", "Qué hace", "Cómo se probó" y una checklist con los puntos de la DoD (en forma de casillas `- [ ]`), más "Observaciones para el revisor" opcional. Corta.
- Verificación: `diff` del bloque de reglas viejo contra el nuevo (texto idéntico salvo niveles de título); `grep -n "main"` sin usos como nombre de rama; links del índice que apunten a títulos existentes.

**Commit:** `docs: acuerdos de equipo en CONTRIBUTING.md y plantilla de PR`

## Task 2: main → master en Notion y Trello

**Notion** (README Técnico, https://app.notion.com/p/33c5ffbef7b5818285b1cab269d991ba):
- §7 "Flujo de trabajo con Git": en el bloque de ramas y en el flujo típico, `main` → `master` (solo donde es el nombre de la rama).
- §9 Deploy: `main` → `master` donde es el nombre de la rama.
- Al comienzo de §7, una línea: "El flujo detallado (ramas, commits, review, Definition of Done) está en `CONTRIBUTING.md` del repo, que es la fuente de verdad."
- No tocar nada más de la página.

**Trello** (tablero de equipo https://trello.com/b/yBj0xE8S):
- Buscar tarjetas cuyo nombre o descripción mencione `main` como rama (p.ej. la de acuerdos https://trello.com/c/J04ndRqd y la guía "Cómo se usa este tablero").
- En cada una, cambiar solo ese texto a `master` (`update` con la descripción completa, idéntica salvo ese reemplazo). No mover tarjetas, no comentar, no tocar etiquetas ni checklists.

**Evidencia:** en el report, para cada página/tarjeta: el fragmento antes y después.
