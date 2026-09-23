/** El backend manda fechas ISO en UTC ("2026-09-23T14:00:00Z"); aquí se muestran en hora local. */

/** "23 sep, 09:12" */
export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "viernes, 2 de octubre de 2026, 11:59 p. m." */
export function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' });
}

/** "hace 5 min", "hace 3 h", "hace 2 días" */
export function haceCuanto(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} día${dias === 1 ? '' : 's'}`;
}
