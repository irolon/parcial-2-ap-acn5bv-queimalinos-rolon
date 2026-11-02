// Genera body_map.json (el dibujo del cuerpo del "Mapa muscular") a partir del
// paquete react-native-body-highlighter@3.1.3 (MIT, © 2022 ELABBASSI Hicham).
// Uso: node generate-body-map.js <carpeta-del-paquete> <salida.json>
// La carpeta del paquete trae assets/bodyFront.ts, assets/bodyBack.ts,
// components/SvgMaleWrapper.tsx y LICENSE. Los .ts se leen como texto y se
// evalúan en un contexto vacío; las coordenadas no se tocan.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const [pkg, out] = process.argv.slice(2);
if (!pkg || !out) {
  console.error('Uso: node generate-body-map.js <carpeta-del-paquete> <salida.json>');
  process.exit(1);
}

function loadParts(file) {
  const text = fs.readFileSync(path.join(pkg, file), 'utf8')
    .replace(/^import .*$/m, '')
    .replace(/export const \w+\s*:[^=]*=/, 'result =');
  const ctx = { result: null };
  vm.runInNewContext(text, ctx, { timeout: 1000 });
  return ctx.result.map((p) => ({
    slug: p.slug,
    paths: [...(p.path.left || []), ...(p.path.right || []), ...(p.path.common || [])],
  }));
}

const wrapper = fs.readFileSync(path.join(pkg, 'components', 'SvgMaleWrapper.tsx'), 'utf8');
const outlines = [...wrapper.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
if (outlines.length < 2) {
  console.error('SvgMaleWrapper.tsx no trae los dos contornos');
  process.exit(1);
}

const data = {
  source: 'react-native-body-highlighter@3.1.3 (MIT, © 2022 ELABBASSI Hicham)',
  views: {
    front: {
      viewBox: [30, 90, 670, 1280],
      outline: outlines[0],
      parts: loadParts(path.join('assets', 'bodyFront.ts')),
    },
    back: {
      viewBox: [754, 90, 670, 1280],
      outline: outlines[1],
      parts: loadParts(path.join('assets', 'bodyBack.ts')),
    },
  },
};
fs.writeFileSync(out, JSON.stringify(data));
console.log('listo:', out, '| partes frente', data.views.front.parts.length, '| espalda', data.views.back.parts.length);
