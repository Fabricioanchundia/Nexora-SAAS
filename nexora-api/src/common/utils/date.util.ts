export function formatDateSri(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatDateKey(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}${m}${y}`;
}

export function parseDateLocal(dateOrString: Date | string): Date {
  const str = typeof dateOrString === 'string'
    ? dateOrString
    : dateOrString.toISOString();
  const datePart = str.split('T')[0];
  return new Date(datePart + 'T12:00:00');
}