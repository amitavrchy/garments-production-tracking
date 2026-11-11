import {advancedGrants} from '../advanced/catalog';
export const roles = [
  'FACTORY_ADMIN',
  'MERCHANDISER',
  'IE',
  'PLANNING',
  'LINE_CHIEF',
  'SUPERVISOR',
  'QC',
  'STORE',
  'SHIPPING',
  'ACCOUNTS',
] as const;
export type Role = (typeof roles)[number];
export type Actor = {
  id: string;
  factoryId: string;
  role: Role;
  name: string;
  email: string;
  lineIds: string[];
};
const grants: Record<string, Role[]> = {
  factories: [],
  floors: [],
  lines: [],
  machines: [],
  workers: [],
  users: [],
  buyers: ['MERCHANDISER'],
  orders: ['MERCHANDISER'],
  quantities: ['MERCHANDISER'],
  milestones: ['MERCHANDISER'],
  styles: ['MERCHANDISER', 'IE'],
  bom: ['MERCHANDISER'],
  operations: ['IE'],
  assignments: ['PLANNING'],
  allocations: ['PLANNING'],
  cutting: ['PLANNING', 'SUPERVISOR'],
  production: ['LINE_CHIEF', 'SUPERVISOR'],
  qc: ['QC'],
  finishing: ['SUPERVISOR', 'SHIPPING'],
  materials: ['STORE'],
  shipments: ['SHIPPING'],
  cartons: ['SHIPPING'],
  pieceEntries: ['SUPERVISOR', 'IE'],
  payroll: ['ACCOUNTS'],
};
export function allowed(role: Role, resource: string) {
  return role === 'FACTORY_ADMIN' || !!(grants[resource]||advancedGrants[resource])?.includes(role);
}
export const scopedLineRoles: Role[] = ['LINE_CHIEF', 'SUPERVISOR'];
