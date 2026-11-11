export type Row = { id: string; [key: string]: any };
export type User = Row & {
  name: string;
  email: string;
  role: string;
  factoryId: string;
  lineIds: string[];
};
export type Resource =
  | 'factories'
  | 'floors'
  | 'lines'
  | 'machines'
  | 'workers'
  | 'users'
  | 'buyers'
  | 'styles'
  | 'bom'
  | 'operations'
  | 'orders'
  | 'quantities'
  | 'milestones'
  | 'assignments'
  | 'allocations'
  | 'materials'
  | 'cutting'
  | 'production'
  | 'qc'
  | 'finishing'
  | 'shipments'
  | 'cartons'
  | 'pieceEntries'
  | 'payroll';
export type Overview = {
  date: string;
  actual: number;
  target: number;
  efficiency: number;
  dhu: number;
  defects: number;
  inspected: number;
  activeOrders: number;
  lines: Row[];
  hourly: { hour: number; actual: number; target: number }[];
  orders: Row[];
  wip: Row[];
  shipments: Row[];
  milestones: Row[];
  alerts: { title: string; detail: string; type: string }[];
};
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const number = (v: number = 0) => new Intl.NumberFormat('en-US').format(v);
export const money = (minor: number = 0) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(minor / 100);
export const title = (value: string) =>
  value
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || '—';
