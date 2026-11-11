export const sum = <T>(rows: T[], value: (row: T) => number) =>
  rows.reduce((n, r) => n + value(r), 0);
export const efficiency = (pcs: number, smv: number, operators: number, minutes = 60) =>
  operators > 0 && minutes > 0 ? ((pcs * smv) / (operators * minutes)) * 100 : 0;
export const dhu = (defects: number, inspected: number) =>
  inspected > 0 ? (defects / inspected) * 100 : 0;
export const requiredMaterial = (consumption: number, qty: number, wastageBps: number) =>
  consumption * qty * (1 + wastageBps / 10000);
export const earnings = (pcs: number, rateMinor: number) => pcs * rateMinor;
export const dhakaDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export function csv(rows: Record<string, unknown>[], columns: string[]) {
  const cell = (v: unknown) => {
    let text = String(v ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return (
    '\uFEFF' +
    [
      columns.map(cell).join(','),
      ...rows.map((r) => columns.map((k) => cell(r[k])).join(',')),
    ].join('\r\n')
  );
}
