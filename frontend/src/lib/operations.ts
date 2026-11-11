import { ResourceConfig, ref, text, num, date, select, variant } from './modules';
export const operations: Record<string, ResourceConfig> = {
  allocations: {
    name: 'Line allocations',
    singular: 'Line allocation',
    description: 'Assign one order to each line per day, with a full-shift target.',
    fields: [
      ref('lineId', 'Line', 'lines'),
      ref('orderId', 'Purchase order', 'orders'),
      date(),
      num('target', 'Shift target (pcs)', { min: 1 }),
    ],
    columns: ['lineId', 'orderId', 'date', 'target'],
  },
  assignments: {
    name: 'Worker assignments',
    singular: 'Worker assignment',
    description: 'Split a worker’s day across lines. Daily assigned hours cannot exceed 24.',
    fields: [
      ref('workerId', 'Worker', 'workers'),
      ref('lineId', 'Line', 'lines'),
      date(),
      num('hours', 'Assigned hours', { min: 0.25, max: 24, step: 0.25, default: 8 }),
    ],
    columns: ['workerId', 'lineId', 'date', 'hours'],
  },
  materials: {
    name: 'Material movements',
    singular: 'Material movement',
    description: 'Receive material, issue against an order, or return unused stock.',
    fields: [
      ref('orderId', 'Purchase order', 'orders'),
      ref('bomItemId', 'BOM material', 'bom'),
      select('kind', 'Movement', ['RECEIVE', 'ISSUE', 'RETURN']),
      num('qty', 'Quantity', { min: 0.0001, step: 0.0001 }),
      text('reference', 'Reference'),
      date(),
    ],
    columns: ['orderId', 'bomItemId', 'kind', 'qty', 'reference', 'date'],
  },
  cutting: {
    name: 'Cutting orders',
    singular: 'Cutting lay',
    description:
      'Plan a lay, release after BOM checks, then complete to make sewing input available.',
    fields: [
      ...variant,
      text('layNumber', 'Lay number'),
      num('qty', 'Cut quantity', { min: 1 }),
      date(),
    ],
    columns: ['layNumber', 'orderId', 'color', 'size', 'qty', 'status', 'date'],
  },
  production: {
    name: 'Hourly entries',
    singular: 'Hourly production',
    description: 'One entry per line and hour. All hours use Asia/Dhaka time.',
    fields: [
      ref('lineId', 'Production line', 'lines'),
      ...variant.map((field) =>
        field.key === 'size'
          ? {
              ...field,
              hint: 'Enter a size, or AUTO to distribute totals using the order size ratio.',
            }
          : field,
      ),
      date(),
      num('hourStart', 'Hour start (24-hour)', { min: 0, max: 23, default: 13 }),
      num('inputPcs', 'Sewing input (pcs)', { default: 200 }),
      num('producedPcs', 'Sewn output (pcs)', { default: 180 }),
      num('operators', 'Operators', { min: 1, max: 5000, default: 32 }),
      num('availableMinutes', 'Available minutes per operator', {
        min: 1,
        max: 180,
        default: 60,
        hint: 'Include overtime minutes in the denominator.',
      }),
    ],
    columns: ['lineId', 'orderId', 'date', 'hourStart', 'producedPcs', 'operators', 'version'],
  },
  qc: {
    name: 'QC inspections',
    singular: 'QC inspection',
    description: 'Record inspected units, defect occurrences, rejects, and pieces sent for rework.',
    fields: [
      ref('lineId', 'Line', 'lines'),
      ...variant,
      date(),
      num('inspectedPcs', 'Inspected pieces', { min: 1, default: 100 }),
      select('defectCode', 'Defect code', [
        'NONE',
        'STITCH',
        'STAIN',
        'MEASUREMENT',
        'HOLE',
        'SHADE',
        'OTHER',
      ]),
      num('defectCount', 'Defect occurrences', {
        default: 0,
        hint: 'A piece may have more than one defect.',
      }),
      num('reworkPcs', 'Pieces for rework', { default: 0 }),
      num('rejectedPcs', 'Rejected pieces', { default: 0 }),
    ],
    columns: [
      'orderId',
      'lineId',
      'inspectedPcs',
      'defectCode',
      'defectCount',
      'reworkPcs',
      'resolvedPcs',
      'rejectedPcs',
    ],
  },
  finishing: {
    name: 'Finishing records',
    singular: 'Finishing record',
    description: 'Only good sewn output can enter finishing; open rework and rejects are excluded.',
    fields: [...variant, num('qty', 'Finished pieces', { min: 1 }), date()],
    columns: ['orderId', 'color', 'size', 'qty', 'date'],
  },
};
