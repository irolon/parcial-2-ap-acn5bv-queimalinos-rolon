export const formatNumber = (n, decimals = 0) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export const formatClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
