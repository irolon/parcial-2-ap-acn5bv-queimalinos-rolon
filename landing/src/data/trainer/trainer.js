// Datos de ejemplo para los mockups (no son métricas reales del producto).
export const progressSeries = [
  { key: '1rm', label: '1RM estimado', title: 'Sentadilla · 1RM estimado', unit: 'kg', decimals: 1, dot: 'var(--color-intensity)', values: [85, 88, 92.5, 95, 100, 102.5, 107.5, 112.5] },
  { key: 'max', label: 'Peso máximo', title: 'Sentadilla · peso máximo levantado', unit: 'kg', decimals: 1, dot: 'var(--color-intensity)', values: [70, 72.5, 75, 77.5, 80, 82.5, 85, 90] },
  { key: 'vol', label: 'Volumen', title: 'Volumen semanal total', unit: 'kg', decimals: 0, dot: 'var(--color-brand-text)', values: [6200, 7100, 7800, 8400, 9900, 10600, 11300, 12480] },
  { key: 'body', label: 'Corporal', title: 'Evolución del peso corporal', unit: 'kg', decimals: 1, dot: 'var(--color-success)', values: [66.8, 66.1, 65.4, 64.9, 64.0, 63.5, 62.9, 62.4] },
]

export const trainerFeatures = [
  { icon: 'users', title: 'Panel de alumnos', text: 'Una ficha por alumno con medidas corporales e IMC calculado.' },
  { icon: 'video', title: 'Biblioteca de ejercicios', text: '50 ejercicios cargados con su video, y los tuyos con tu propio link.' },
  { icon: 'list', title: 'Editor de rutinas', text: 'Plantillas reutilizables para no arrancar de cero con cada alumno.' },
  { icon: 'clock', title: 'Historial de sesiones', text: 'Cada sesión del alumno, serie por serie, con sus comentarios.' },
  { icon: 'chart', title: 'Gráficos de progreso', text: '1RM estimado, peso máximo, volumen y evolución corporal.' },
  { icon: 'trophy', title: 'Desafíos', text: 'Proponé desafíos a tus alumnos y sumales un motivo extra para no faltar.' },
]
