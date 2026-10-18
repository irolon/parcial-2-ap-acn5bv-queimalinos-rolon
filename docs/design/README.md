# Diseño de FitTrainer

**Única fuente de diseño** para la web y el mobile. Reemplaza al proyecto de Google Stitch, que quedó obsoleto: no se usa más.

| Archivo | Qué es |
|---|---|
| `prototipo-web.html` | Prototipo navegable de la web (alumno y entrenador). Se abre con doble clic en el navegador. |
| `prototipo-mobile.html` | Prototipo navegable de la app (alumno y entrenador). |
| `guia-web.pdf` | Guía Web: alcance, navegación y las 11 pantallas a 1200 × 780 px. |
| `guia-mobile.pdf` | Guía Mobile: mapa del sitio, flujos y las 11 pantallas. |
| `manual-de-marca.pdf` | Logo, tokens (color, tipografía, espaciado) y componentes. |
| `prototype-src/` | Código fuente de los prototipos (`tokens.jsx`, `ui.jsx` y una pantalla por archivo). Sirve para copiar valores exactos. |

También están en Drive: https://drive.google.com/drive/folders/1wmOpqW5-BReFH-MJ0LRg3AC6BKjyrUUV

## Cómo se usa

- Cada pantalla se construye mirando el prototipo y la guía. Los tokens (colores, tipografías, radios, espaciado) salen de `prototype-src/tokens.jsx` y del manual de marca.
- `prototype-src/` es referencia: no se importa ni se copia tal cual. El código del producto sigue `CONTRIBUTING.md`; esta carpeta no entra en la regla de 200 líneas.

## Lo que el diseño dice distinto de lo decidido

Ante una diferencia, mandan las decisiones del proyecto:

- **Stack mobile:** la Guía Mobile habla de React Native + Expo y de dos apps. Se usa **Kotlin + Jetpack Compose** en **una sola app** que ramifica por rol (ADR-003 en Notion).
- **Nombres de API y tablas:** los mockups usan español (`/rutinas/hoy`, `alumnos`). El backend usa inglés (`/routines/today`, `students`).
- **Roles del equipo:** la guía muestra el reparto viejo. El vigente está en el tablero de equipo.
