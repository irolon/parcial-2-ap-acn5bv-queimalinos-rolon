# Dibujo del Mapa muscular

`app/src/main/assets/body_map/body_map.json` es el dibujo del cuerpo (vista de frente y de espalda) que usa el
componente `BodyMap`. Sale del paquete
[react-native-body-highlighter](https://www.npmjs.com/package/react-native-body-highlighter)
**v3.1.3**, licencia **MIT** (© 2022 ELABBASSI Hicham). La licencia está en
`app/src/main/assets/body_map/LICENSE-react-native-body-highlighter.txt`, junto al JSON.

El script no toca las coordenadas: junta los trazos de cada músculo y los dos
contornos del cuerpo en un solo JSON.

## Regenerar

1. Bajar de `https://cdn.jsdelivr.net/npm/react-native-body-highlighter@3.1.3/` a una
   carpeta temporal (fuera del repo): `assets/bodyFront.ts`, `assets/bodyBack.ts`,
   `components/SvgMaleWrapper.tsx` y `LICENSE`.
2. Desde `mobile/`:

```
node tools/body-map/generate-body-map.js <carpeta-del-paquete> app/src/main/assets/body_map/body_map.json
```
