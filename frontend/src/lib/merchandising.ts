import { ResourceConfig, ref, text, num, date, select, variant } from './modules';
export const merchandising: Record<string, ResourceConfig> = {
  buyers: {
    name: 'Buyers',
    singular: 'Buyer',
    description: 'Buyer contacts and unique references.',
    fields: [
      text('name', 'Buyer name'),
      text('code', 'Buyer code'),
      text('email', 'Contact email', { type: 'email', optional: true, default: '' }),
    ],
    columns: ['name', 'code', 'email'],
  },
  orders: {
    name: 'Purchase orders',
    singular: 'Purchase order',
    description: 'Create a draft, add size quantities, then confirm.',
    fields: [
      text('poNumber', 'PO number'),
      ref('buyerId', 'Buyer', 'buyers'),
      ref('styleId', 'Style', 'styles'),
      date('deliveryDate', 'Delivery date'),
    ],
    columns: ['poNumber', 'buyerId', 'styleId', 'deliveryDate', 'status'],
  },
  quantities: {
    name: 'Size breakdown',
    singular: 'Size / color quantity',
    description: 'One row per order, color, and size. Revisions preserve existing WIP.',
    fields: [...variant, num('qty', 'Ordered quantity', { min: 1 })],
    columns: ['orderId', 'color', 'size', 'qty'],
  },
  milestones: {
    name: 'Time & action',
    singular: 'Milestone',
    description: 'Track buyer commitments and production deadlines.',
    fields: [
      ref('orderId', 'Purchase order', 'orders'),
      text('name', 'Milestone'),
      date('dueDate', 'Due date'),
      text('completed', 'Completed', { type: 'checkbox', default: false }),
    ],
    columns: ['orderId', 'name', 'dueDate', 'completed'],
  },
  styles: {
    name: 'Styles',
    singular: 'Style',
    description: 'BOM → operation bulletin → active style. Bulletin SMV must reconcile.',
    fields: [
      text('code', 'Style code'),
      text('name', 'Style name'),
      num('smv', 'Standard minute value', {
        min: 0.001,
        step: 0.001,
        hint: 'Must equal the sum of operation SMV.',
      }),
    ],
    columns: ['code', 'name', 'smv', 'status'],
  },
  bom: {
    name: 'Bill of materials',
    singular: 'BOM item',
    description: 'Consumption and wastage form the cutting material requirement.',
    fields: [
      ref('styleId', 'Style', 'styles'),
      select('itemType', 'Material type', ['FABRIC', 'TRIM']),
      text('description', 'Description'),
      num('consumptionPerPc', 'Consumption per piece', { min: 0.0001, step: 0.0001 }),
      num('wastageBps', 'Wastage (basis points)', {
        max: 10000,
        default: 500,
        hint: '100 basis points = 1%.',
      }),
      select('uom', 'Unit', ['kg', 'm', 'pcs', 'yd']),
    ],
    columns: ['styleId', 'description', 'itemType', 'consumptionPerPc', 'wastageBps', 'uom'],
  },
  operations: {
    name: 'Operation bulletin',
    singular: 'Operation',
    description: 'The source of truth for SMV and worker piece rates. Rates lock after use.',
    fields: [
      ref('styleId', 'Style', 'styles'),
      num('seq', 'Sequence', { min: 1 }),
      text('name', 'Operation name'),
      num('smv', 'SMV', { min: 0.001, step: 0.001 }),
      num('pieceRateMinor', 'Piece rate (poisha)', { hint: '100 poisha = ৳1.00.' }),
      text('machineType', 'Machine type', { default: 'SNLS' }),
    ],
    columns: ['styleId', 'seq', 'name', 'smv', 'pieceRateMinor', 'machineType'],
  },
};
