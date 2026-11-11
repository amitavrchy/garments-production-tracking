import { Resource } from './types';
import { advancedPermissions } from './advanced';
const grants: Partial<Record<Resource, string[]>> = {
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
  materials: ['STORE'],
  finishing: ['SUPERVISOR', 'SHIPPING'],
  shipments: ['SHIPPING'],
  cartons: ['SHIPPING'],
  pieceEntries: ['SUPERVISOR', 'IE'],
  payroll: ['ACCOUNTS'],
};
export const canWrite = (role: string, resource: Resource) =>
  role === 'FACTORY_ADMIN' || !!(grants[resource] || advancedPermissions[resource])?.includes(role);
export const canRead = (role: string, resource: Resource) =>
  resource === 'costing'
    ? ['FACTORY_ADMIN', 'ACCOUNTS', 'MERCHANDISER'].includes(role)
    : resource === 'users'
      ? role === 'FACTORY_ADMIN'
      : resource === 'payroll'
        ? ['FACTORY_ADMIN', 'ACCOUNTS'].includes(role)
        : resource === 'pieceEntries'
          ? ['FACTORY_ADMIN', 'ACCOUNTS', 'IE', 'SUPERVISOR'].includes(role)
          : true;
