# Sesión activa en pantallas compactas — diseño

Igna probó la app en un Galaxy S10 con el zoom de pantalla en grande y la letra al 110 %: la app ve unos
320 dp de ancho y unos 600 dp de alto útil. Encontró dos problemas en la sesión activa:

1. **Pantalla de la serie:** no entra y no se puede bajar. La pantalla se pensó sin scroll (mockup p.13) y,
   cuando no entra, `CardIfFitsLayout` recorta lo de abajo: Técnica, Reemplazar e IA quedan cortados.
2. **Botones con el texto partido:** en los de abajo de la serie y en los del timer de descanso
   (+15″, −15″, Pausar, Saltar), el margen interno de 24 dp por lado deja menos de 20 dp para el texto y se
   parte letra por letra ("P/a/u/s/ar").

## Qué se decidió (Igna, 11/11)

- **Scroll solo si hace falta.** Si todo entra, la pantalla de la serie queda igual que hoy (fija, el botón
  principal debajo de la carga y las acciones ancladas al fondo). Si no entra, se puede bajar; nada se recorta.
- **Botones de abajo de la serie:** menos margen interno y el texto siempre en una línea. Si igual no entra,
  la letra se achica (nunca se parte la palabra).
- **Modo compacto:** en pantallas bajas (menos de 720 dp de alto), los números grandes de peso y reps pasan de
  72 a 56 sp y los espacios entre bloques se achican, para que en la mayoría de los casos siga entrando sin scroll.
- **Timer de descanso en dos filas:** arriba −15″ y +15″ (en ese orden, igual que el selector de descanso de
  la serie); abajo Pausar/Seguir y Saltar, anchos. Mismo texto de una línea que achica la letra si no entra.
  En modo compacto el anillo baja de 240 a 200 dp y la cuenta de 72 a 60 sp.
- **Gráficos → Cargas arranca en un ejercicio con curva** (agregado tras la prueba): viene elegido el más reciente
  con 2 días o más; si ninguno tiene, el más reciente (como antes, spec de la tarjeta 13 §3.2.1). En el S10 la
  alumna entraba a "Curl femoral tumbado" (1 día) y veía solo un punto aunque "Press banca plano" tenía 6.
- **Barra de pestañas:** "Progreso" y "Mensajes" se cortaban ("Progre", "Mensaj"). El texto va en una línea y
  achica la letra hasta 8 sp: las etiquetas son mono de 12 sp con 1 sp de espaciado y, a 10 sp, "Progreso" todavía
  no entra en una pestaña de 58 dp.

## Decisiones mías

- El umbral de compacto es el alto de la ventana (`screenHeightDp`), no el tamaño físico: así lo activa
  también el zoom de pantalla de Samsung.
- La tarjeta del músculo sigue apareciendo solo si entra en el alto visible; nunca fuerza el scroll.
- El texto de una línea (`ui/components/OneLineLabel`) no parte la palabra (`softWrap = false`): con solo
  `maxLines = 1` la palabra se cortaba en dos renglones y `autoSize` no lo veía como desborde.
- Los botones del timer van sin íconos (⏸ ⏭ del boceto): Material Icons core no los trae y sumar
  `material-icons-extended` no se justifica por dos íconos.

## Cómo se prueba

- Unitarios: el ejercicio que viene elegido (`defaultExerciseId` y el ViewModel de Gráficos), el alto mínimo de la parte de abajo, el alto con scroll de `CardIfFitsLayout` y el umbral de compacto.
- Instrumentados con `DeviceConfigurationOverride` (320 × 560 dp, letra 1,1): en la serie se llega con scroll
  a Técnica/Reemplazar/IA y cada texto queda en una línea sin desbordar; en el timer, −15″, +15″, Pausar y Saltar
  igual; "Progreso" en una pestaña de 58 dp no desborda.
- En el S10 de Igna con el zoom grande.
