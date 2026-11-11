import { ResourceConfig, ref, text, num, date, select, variant } from './modules';
import { merchandising } from './merchandising';
import { operations } from './operations';
import { Resource } from './types';
const administration: Record<string, ResourceConfig> = {
  shipments: {
    name: 'Shipments',
    singular: 'Shipment',
    description:
      'Build a packing list, seal it, then dispatch. Invoice documents are commercial stubs.',
    fields: [
      ref('orderId', 'Purchase order', 'orders'),
      text('invoiceNo', 'Invoice number'),
      text('destination', 'Destination'),
      date('deliveryDate', 'Expected delivery'),
    ],
    columns: ['invoiceNo', 'orderId', 'destination', 'deliveryDate', 'status'],
  },
  cartons: {
    name: 'Packing cartons',
    singular: 'Carton',
    description: 'A carton holds a color and size. Add multiple cartons for an assortment.',
    fields: [
      ref('shipmentId', 'Shipment', 'shipments'),
      ...variant,
      text('cartonNo', 'Carton number'),
      num('pcs', 'Pieces', { min: 1 }),
    ],
    columns: ['cartonNo', 'shipmentId', 'orderId', 'color', 'size', 'pcs'],
  },
  payroll: {
    name: 'Payroll runs',
    singular: 'Payroll run',
    description: 'Calculate earnings, get independent approval, then export for accounts.',
    fields: [
      text('name', 'Run name'),
      date('periodStart', 'Period start'),
      date('periodEnd', 'Period end'),
    ],
    columns: ['name', 'periodStart', 'periodEnd', 'status', 'totalMinor'],
  },
  pieceEntries: {
    name: 'Worker output',
    singular: 'Piece-rate entry',
    description: 'Earnings use the operation bulletin rate. Calculated payroll periods are locked.',
    fields: [
      ref('workerId', 'Worker', 'workers'),
      ref('orderId', 'Purchase order', 'orders'),
      ref('operationId', 'Operation', 'operations'),
      date(),
      num('pcs', 'Completed pieces', { min: 1 }),
    ],
    columns: ['workerId', 'operationId', 'date', 'pcs', 'rateMinor', 'amountMinor'],
  },
  factories: {
    name: 'Factory profile',
    singular: 'Factory',
    description: 'Your workspace is isolated by factory. Shift time uses Asia/Dhaka.',
    fields: [text('name', 'Factory name')],
    columns: ['name', 'timezone'],
  },
  floors: {
    name: 'Floors',
    singular: 'Floor',
    description: 'Organize production lines by floor.',
    fields: [text('name', 'Floor name')],
    columns: ['name'],
  },
  lines: {
    name: 'Production lines',
    singular: 'Production line',
    description: 'Line references, floor locations, and planned manpower.',
    fields: [
      text('code', 'Line code'),
      ref('floorId', 'Floor', 'floors'),
      num('targetManpower', 'Target manpower', { min: 1, default: 32 }),
    ],
    columns: ['code', 'floorId', 'targetManpower'],
  },
  machines: {
    name: 'Machines',
    singular: 'Machine',
    description: 'Keep equipment assignments and maintenance status visible.',
    fields: [
      text('code', 'Machine code'),
      ref('lineId', 'Line', 'lines'),
      text('type', 'Machine type'),
      select('status', 'Status', ['ACTIVE', 'MAINTENANCE']),
    ],
    columns: ['code', 'lineId', 'type', 'status'],
  },
  workers: {
    name: 'Workers',
    singular: 'Worker',
    description: 'Employee records, skills, and payroll references.',
    fields: [
      text('employeeCode', 'Employee code'),
      text('name', 'Full name'),
      select('skillGrade', 'Skill grade', ['A', 'B', 'C', 'TRAINEE'], 'B'),
    ],
    columns: ['employeeCode', 'name', 'skillGrade'],
  },
  users: {
    name: 'Users & permissions',
    singular: 'User',
    description:
      'Create individual accounts. Supervisors and line chiefs require line assignments.',
    fields: [
      text('name', 'Full name'),
      text('email', 'Email', { type: 'email' }),
      text('password', 'Password', {
        type: 'password',
        hint: 'At least 10 characters. Editing resets the password.',
      }),
      select('role', 'Role', [
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
      ]),
      text('lineIds', 'Assigned lines', { type: 'lines' }),
    ],
    columns: ['name', 'email', 'role', 'active'],
  },
};
export const configs = { ...merchandising, ...operations, ...administration } as Record<
  Resource,
  ResourceConfig
>;
export const nextStates: Record<string, Record<string, string[]>> = {
  orders: {
    DRAFT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
    IN_PRODUCTION: ['PACKING'],
    PACKING: ['SHIPPED'],
    SHIPPED: ['CLOSED'],
  },
  styles: {
    DRAFT: ['BOM_READY'],
    BOM_READY: ['BULLETIN_READY'],
    BULLETIN_READY: ['ACTIVE'],
    ACTIVE: ['ARCHIVED'],
  },
  cutting: { PLANNED: ['CUTTING'], CUTTING: ['COMPLETED'] },
  shipments: { PLANNED: ['PACKED'], PACKED: ['DISPATCHED'], DISPATCHED: ['DELIVERED'] },
  payroll: { DRAFT: ['CALCULATED'], CALCULATED: ['APPROVED'], APPROVED: ['EXPORTED'] },
};
