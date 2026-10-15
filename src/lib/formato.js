const fechaHora = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
const fechaCorta = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatoFechaHora(iso) {
  if (!iso) return '';
  return fechaHora.format(new Date(iso));
}

export function formatoFecha(iso) {
  if (!iso) return '';
  return fechaCorta.format(new Date(iso));
}

// "hace 5 min", "hace 3 h", "ayer", o la fecha
export function hace(iso) {
  if (!iso) return '';
  const segundos = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return 'hace un momento';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return 'hace ' + minutos + ' min';
  const horas = Math.round(minutos / 60);
  if (horas < 24) return 'hace ' + horas + ' h';
  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return 'hace ' + dias + ' días';
  return formatoFecha(iso);
}

export function claseEstado(estado) {
  if (!estado) return 'estado estado-sin-estado';
  const slug = estado.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
  return 'estado estado-' + slug;
}

export function plural(n, uno, varios) {
  return n + ' ' + (n === 1 ? uno : varios);
}
