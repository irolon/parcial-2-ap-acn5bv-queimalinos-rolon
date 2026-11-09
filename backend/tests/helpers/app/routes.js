// Recorre el router de una app de Express 4 y devuelve cada ruta con su método, su path completo
// y los handlers de su cadena. Lo usan los barridos de tests/unit/app.

/** Path legible de un router montado con app.use / router.use (por ejemplo, '/api/students/:id'). */
function mountPath(layer) {
  let source = layer.regexp.source.replace(/^\^/, '').replace('\\/?(?=\\/|$)', '');
  // Cada parámetro es un grupo como (?:\/([^/]+?)); según la versión, la barra de la clase va escapada o no.
  for (const key of layer.keys) {
    const param = ['(?:\\/([^/]+?))', '(?:\\/([^\\/]+?))'].find((p) => source.includes(p));
    if (param) source = source.replace(param, `/:${key.name}`);
  }
  return source.split('\\/').join('/');
}

function walk(stack, prefix, out) {
  for (const layer of stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((s) => s.handle);
      const path = `${prefix}${layer.route.path}`.replace(/(.)\/$/, '$1');
      for (const method of Object.keys(layer.route.methods)) {
        out.push({ method: method.toUpperCase(), path, handlers });
      }
    } else if (layer.name === 'router') {
      walk(layer.handle.stack, prefix + mountPath(layer), out);
    }
  }
  return out;
}

/** listRoutes(app) → [{ method: 'POST', path: '/api/auth/login', handlers: [fn, …] }] */
export function listRoutes(app) {
  const stack = app._router?.stack ?? app.router.stack;
  return walk(stack, '', []);
}
