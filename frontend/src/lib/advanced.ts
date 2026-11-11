import { ResourceConfig, ModuleConfig, ref, text, num, date, select } from './forms';
export type AdvancedResource =
  | 'suppliers'
  | 'purchases'
  | 'lots'
  | 'lotIssues'
  | 'bundles'
  | 'downtime'
  | 'maintenance'
  | 'attendance'
  | 'skills'
  | 'stations'
  | 'qualityAudits'
  | 'correctiveActions'
  | 'costing'
  | 'compliance'
  | 'scenarios'
  | 'subcontracts'
  | 'sustainability';
export const advancedConfigs: Record<AdvancedResource, ResourceConfig> = {
  suppliers: {
    name: 'Suppliers',
    singular: 'Supplier',
    description: 'Commercial contacts, origin and agreed payment terms.',
    fields: [
      text('code', 'Supplier code'),
      text('name', 'Supplier name'),
      text('email', 'Email', { type: 'email' }),
      text('country', 'Country', { default: 'Bangladesh' }),
      text('paymentTerms', 'Payment terms', { default: 'Net 30' }),
    ],
    columns: ['code', 'name', 'email', 'country', 'paymentTerms'],
  },
  purchases: {
    name: 'Purchase orders',
    singular: 'Material purchase',
    description:
      'Submit → independent accounts approval → receive into a held stock lot. Prices and FX are explicit.',
    fields: [
      text('number', 'Purchase number'),
      ref('supplierId', 'Supplier', 'suppliers'),
      ref('orderId', 'Buyer order', 'orders'),
      ref('bomItemId', 'BOM item', 'bom'),
      num('qty', 'Purchase quantity', { min: 0.0001, step: 0.0001 }),
      num('unitCostMinor', 'Unit cost in currency minor units'),
      select('currency', 'Currency', ['BDT', 'USD', 'EUR', 'GBP']),
      num('exchangeRate', 'BDT per currency unit', { min: 0.0001, step: 0.0001, default: 1 }),
      date('dueDate', 'Expected receipt'),
    ],
    columns: [
      'number',
      'supplierId',
      'orderId',
      'qty',
      'unitCostMinor',
      'currency',
      'dueDate',
      'status',
    ],
  },
  lots: {
    name: 'Fabric & trim lots',
    singular: 'Material lot',
    description: 'Shade, GSM, width, bins and QC clearance. Receiving updates the material ledger.',
    fields: [
      text('lotNo', 'Lot / roll number'),
      ref('supplierId', 'Supplier', 'suppliers'),
      ref('orderId', 'Reserved order', 'orders'),
      ref('bomItemId', 'BOM material', 'bom'),
      text('warehouse', 'Warehouse', { default: 'Main warehouse' }),
      text('bin', 'Storage bin'),
      text('shade', 'Shade group'),
      num('gsm', 'Fabric GSM', { default: 180, step: 0.1 }),
      num('widthCm', 'Width (cm)', { default: 160, step: 0.1 }),
      num('qty', 'Received quantity', { min: 0.0001, step: 0.0001 }),
      select('testResult', 'Fabric test', ['HOLD', 'PASS', 'FAIL']),
    ],
    columns: ['lotNo', 'warehouse', 'bin', 'shade', 'qty', 'issuedQty', 'testResult'],
  },
  lotIssues: {
    name: 'Lot issues & returns',
    singular: 'Lot movement',
    description: 'Atomic stock reservation and return validation. Posted movements are immutable.',
    fields: [
      ref('lotId', 'Stock lot', 'lots'),
      ref('orderId', 'Reserved order', 'orders'),
      select('kind', 'Movement', ['ISSUE', 'RETURN']),
      num('qty', 'Quantity', { min: 0.0001, step: 0.0001 }),
      date(),
    ],
    columns: ['lotId', 'orderId', 'kind', 'qty', 'date'],
  },
  bundles: {
    name: 'Bundle tickets',
    singular: 'Bundle ticket',
    description: 'QR tickets, quality holds and append-only checkpoint history.',
    fields: [
      text('code', 'Bundle / barcode'),
      ref('cuttingId', 'Completed cutting lay', 'cutting'),
      ref('lineId', 'Assigned line', 'lines'),
      num('qty', 'Bundle pieces', { min: 1, default: 25 }),
    ],
    columns: ['code', 'cuttingId', 'lineId', 'qty', 'status', 'version'],
  },
  downtime: {
    name: 'Downtime log',
    singular: 'Downtime event',
    description: 'Machine-level loss reasons feed availability and the Pareto.',
    fields: [
      ref('lineId', 'Line', 'lines'),
      ref('machineId', 'Machine', 'machines'),
      date(),
      num('minutes', 'Lost minutes', { min: 1, max: 1440 }),
      select('category', 'Loss category', [
        'BREAKDOWN',
        'CHANGEOVER',
        'MATERIAL',
        'POWER',
        'QUALITY',
        'PLANNED',
        'OTHER',
      ]),
      text('reason', 'Reason'),
    ],
    columns: ['lineId', 'machineId', 'date', 'minutes', 'category', 'reason'],
  },
  maintenance: {
    name: 'Maintenance work orders',
    singular: 'Maintenance work order',
    description: 'Machine status follows open work. Record a resolution before completing.',
    fields: [
      ref('machineId', 'Machine', 'machines'),
      text('title', 'Work description'),
      select('kind', 'Maintenance type', ['PREVENTIVE', 'CORRECTIVE']),
      select('priority', 'Priority', ['NORMAL', 'LOW', 'HIGH', 'CRITICAL']),
      ref('assignedTo', 'Assigned engineer', 'users'),
      date('dueDate', 'Due date'),
      num('spareCostMinor', 'Spare cost (poisha)', { default: 0 }),
      text('resolution', 'Resolution', { optional: true, default: '' }),
    ],
    columns: ['title', 'machineId', 'kind', 'priority', 'dueDate', 'status'],
  },
  attendance: {
    name: 'Attendance & overtime',
    singular: 'Attendance record',
    description: 'Dhaka clock minutes since midnight; overnight clock-out may exceed 1440.',
    fields: [
      ref('workerId', 'Worker', 'workers'),
      date(),
      num('clockIn', 'Clock-in minute', {
        max: 1439,
        default: 480,
        hint: '08:00 = 480; 17:00 = 1020.',
      }),
      num('clockOut', 'Clock-out minute', { min: 1, max: 2880, default: 1020 }),
      num('breakMinutes', 'Break minutes', { max: 240, default: 60 }),
      select('status', 'Attendance', ['PRESENT', 'ABSENT', 'LEAVE']),
    ],
    columns: ['workerId', 'date', 'status', 'workedMinutes', 'overtimeMinutes'],
  },
  skills: {
    name: 'Skill matrix',
    singular: 'Worker skill',
    description: 'Proficiency, achieved efficiency, training and certification expiry.',
    fields: [
      ref('workerId', 'Worker', 'workers'),
      ref('operationId', 'Operation', 'operations'),
      num('level', 'Skill level (1–5)', { min: 1, max: 5, default: 3 }),
      num('efficiency', 'Achieved efficiency (%)', { min: 1, max: 200, default: 80, step: 0.1 }),
      date('trainedDate', 'Training date'),
      date('validUntil', 'Valid until'),
    ],
    columns: ['workerId', 'operationId', 'level', 'efficiency', 'validUntil'],
  },
  stations: {
    name: 'Station plans',
    singular: 'Operation station',
    description:
      'Operation capacity gaps and qualified-worker suggestions appear in the balance view.',
    fields: [
      ref('lineId', 'Line', 'lines'),
      ref('operationId', 'Operation', 'operations'),
      date(),
      num('operators', 'Station operators', { min: 1, max: 500, default: 5 }),
    ],
    columns: ['lineId', 'operationId', 'date', 'operators'],
  },
  qualityAudits: {
    name: 'Final sampling audits',
    singular: 'Sampling audit',
    description:
      'Buyer-configured acceptance counts; critical defects always fail. Not ISO sampling certification.',
    fields: [
      ref('orderId', 'Order', 'orders'),
      ref('lineId', 'Line', 'lines'),
      text('name', 'Audit reference'),
      num('lotSize', 'Finished lot size', { min: 1 }),
      num('sampleSize', 'Sample size', { min: 1 }),
      num('criticalCount', 'Critical defects', { default: 0 }),
      num('majorCount', 'Major defects', { default: 0 }),
      num('minorCount', 'Minor defects', { default: 0 }),
      num('acceptMajor', 'Major acceptance limit', { default: 2 }),
      num('acceptMinor', 'Minor acceptance limit', { default: 5 }),
      date(),
    ],
    columns: [
      'name',
      'orderId',
      'sampleSize',
      'criticalCount',
      'majorCount',
      'minorCount',
      'status',
    ],
  },
  correctiveActions: {
    name: 'Corrective & preventive actions',
    singular: 'CAPA',
    description: 'Root cause, containment, correction, prevention and independent verification.',
    fields: [
      ref('auditId', 'Sampling audit', 'qualityAudits'),
      text('title', 'Issue'),
      ref('ownerId', 'Responsible owner', 'users'),
      date('dueDate', 'Due date'),
      text('rootCause', 'Root cause', { optional: true, default: '' }),
      text('containment', 'Immediate containment', { optional: true, default: '' }),
      text('corrective', 'Corrective action', { optional: true, default: '' }),
      text('preventive', 'Preventive action', { optional: true, default: '' }),
    ],
    columns: ['title', 'ownerId', 'dueDate', 'status', 'verifiedBy'],
  },
  costing: {
    name: 'Order cost sheets',
    singular: 'Cost sheet',
    description: 'Approved purchase prices + FX + BOM + SMV labor. All outputs are BDT.',
    fields: [
      ref('orderId', 'Buyer order', 'orders'),
      text('name', 'Cost revision'),
      num('laborMinuteMinor', 'Labor per SMV (poisha)', { default: 25 }),
      num('overheadMinor', 'Overhead per piece (poisha)', { default: 400 }),
      num('packingMinor', 'Packing per piece (poisha)', { default: 150 }),
      num('freightMinor', 'Freight per piece (poisha)', { default: 200 }),
      num('sellingMinor', 'Selling price per piece (poisha)', { min: 1, default: 45000 }),
    ],
    columns: [
      'name',
      'orderId',
      'materialMinor',
      'totalMinor',
      'sellingMinor',
      'marginPercent',
      'status',
    ],
  },
  compliance: {
    name: 'Compliance register',
    singular: 'Compliance check',
    description: 'Evidence, accountable owners, deadlines and independent review.',
    fields: [
      text('title', 'Requirement'),
      select('category', 'Category', [
        'FIRE_SAFETY',
        'SOCIAL',
        'ENVIRONMENT',
        'CHEMICAL',
        'BUILDING',
        'BUYER_REQUIREMENT',
      ]),
      ref('ownerId', 'Responsible owner', 'users'),
      date('dueDate', 'Review due'),
      select('severity', 'Severity', ['MEDIUM', 'LOW', 'HIGH', 'CRITICAL']),
      text('notes', 'Evidence / findings', { optional: true, default: '' }),
      text('evidenceUrl', 'Evidence URL', { optional: true, default: '' }),
    ],
    columns: ['title', 'category', 'ownerId', 'severity', 'dueDate', 'status'],
  },
  scenarios: {
    name: 'Capacity scenarios',
    singular: 'Capacity scenario',
    description:
      'Earliest-delivery scheduling into free slots. Stale inputs block applying a plan.',
    fields: [
      text('name', 'Scenario name'),
      date('startDate', 'Planning start'),
      num('days', 'Horizon (days)', { min: 1, max: 90, default: 7 }),
      num('efficiency', 'Expected efficiency (%)', { min: 1, max: 100, step: 0.1, default: 80 }),
      num('overtimeMinutes', 'Overtime per day', { max: 240, default: 0 }),
      num('operatorsOverride', 'Operators per line override', {
        max: 5000,
        default: 0,
        hint: '0 uses planned line manpower.',
      }),
    ],
    columns: ['name', 'startDate', 'days', 'efficiency', 'overtimeMinutes', 'status'],
  },
  subcontracts: {
    name: 'Subcontract jobs',
    singular: 'Subcontract job',
    description:
      'Dispatch reserves cut input; receipt adds external output to the same WIP balance.',
    fields: [
      ref('supplierId', 'Partner', 'suppliers'),
      ref('orderId', 'Buyer order', 'orders'),
      text('color', 'Color', { default: 'Navy' }),
      text('size', 'Size', { default: 'M' }),
      num('qty', 'Sent pieces', { min: 1 }),
      num('receivedQty', 'Expected good return', {
        default: 0,
        hint: '0 defaults to receiving the full job.',
      }),
      date('sentDate', 'Dispatch date'),
      date('dueDate', 'Return due'),
    ],
    columns: ['supplierId', 'orderId', 'color', 'size', 'qty', 'receivedQty', 'status'],
  },
  sustainability: {
    name: 'Resource & waste ledger',
    singular: 'Resource record',
    description: 'Measured resources; CO₂ estimates use your supplied electricity factor.',
    fields: [
      ref('orderId', 'Buyer order', 'orders'),
      date(),
      num('energyKwh', 'Energy (kWh)', { step: 0.01, default: 0 }),
      num('waterLiters', 'Water (liters)', { step: 0.01, default: 0 }),
      num('scrapKg', 'Scrap (kg)', { step: 0.01, default: 0 }),
      num('recycledKg', 'Recycled scrap (kg)', { step: 0.01, default: 0 }),
      num('co2Factor', 'kg CO₂ per kWh', { step: 0.001, default: 0.7, max: 10 }),
      text('notes', 'Measurement notes', { optional: true, default: '' }),
    ],
    columns: ['orderId', 'date', 'energyKwh', 'waterLiters', 'scrapKg', 'recycledKg'],
  },
};
export const advancedModules: Record<string, ModuleConfig> = {
  procurement: {
    title: 'Procurement',
    description: 'From supplier quotation to approved purchase and quality-held receipt.',
    eyebrow: 'SOURCE & CONTROL',
    resources: ['purchases', 'suppliers'],
  },
  warehouse: {
    title: 'Warehouse & fabric',
    description: 'Every roll, shade and stock movement accounted for.',
    eyebrow: 'MATERIAL INTELLIGENCE',
    resources: ['lots', 'lotIssues'],
  },
  traceability: {
    title: 'Bundle traceability',
    description: 'A digital thread from cutting to the final carton.',
    eyebrow: 'TRACK EVERY HANDOFF',
    resources: ['bundles'],
  },
  equipment: {
    title: 'Equipment & maintenance',
    description: 'Find lost minutes, prevent breakdowns and close work orders.',
    eyebrow: 'RELIABILITY',
    resources: ['downtime', 'maintenance'],
  },
  workforce: {
    title: 'Workforce intelligence',
    description: 'Attendance, overtime, skills and station allocation.',
    eyebrow: 'PEOPLE & PRODUCTIVITY',
    resources: ['attendance', 'skills', 'stations'],
  },
  assurance: {
    title: 'Quality assurance',
    description: 'Sampling, root-cause investigation and verified corrective action.',
    eyebrow: 'PREVENT & IMPROVE',
    resources: ['qualityAudits', 'correctiveActions'],
  },
  commercial: {
    title: 'Costing & subcontracting',
    description: 'Defensible margins and controlled external production.',
    eyebrow: 'COMMERCIAL CONTROL',
    resources: ['costing', 'subcontracts'],
  },
  governance: {
    title: 'Compliance & impact',
    description: 'Evidence, review deadlines and measured resource use.',
    eyebrow: 'RESPONSIBLE MANUFACTURING',
    resources: ['compliance', 'sustainability'],
  },
  capacity: {
    title: 'Capacity & line balancing',
    description: 'Model changes, find bottlenecks and release a feasible plan.',
    eyebrow: 'ADVANCED PLANNING',
    resources: ['scenarios', 'stations'],
  },
};
export const advancedStates: Record<string, Record<string, string[]>> = {
  purchases: { DRAFT: ['SUBMITTED'], SUBMITTED: ['APPROVED', 'REJECTED'], APPROVED: ['RECEIVED'] },
  bundles: {
    CREATED: ['SEWING'],
    SEWING: ['QC'],
    QC: ['FINISHING', 'HOLD'],
    HOLD: ['QC'],
    FINISHING: ['PACKED'],
  },
  maintenance: { OPEN: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'] },
  qualityAudits: { DRAFT: ['ASSESSED'] },
  correctiveActions: { OPEN: ['IN_PROGRESS'], IN_PROGRESS: ['VERIFIED'], VERIFIED: ['CLOSED'] },
  costing: { DRAFT: ['CALCULATED'], CALCULATED: ['APPROVED'] },
  compliance: { OPEN: ['REVIEW'], REVIEW: ['PASSED', 'FAILED'], FAILED: ['REVIEW'] },
  scenarios: { DRAFT: ['SIMULATED'], SIMULATED: ['SIMULATED', 'APPLIED'] },
  subcontracts: { DRAFT: ['SENT'], SENT: ['RECEIVED'] },
};
export const advancedPermissions: Record<string, string[]> = {
  suppliers: ['MERCHANDISER', 'STORE'],
  purchases: ['MERCHANDISER', 'STORE', 'ACCOUNTS'],
  lots: ['STORE', 'QC'],
  lotIssues: ['STORE'],
  bundles: ['SUPERVISOR', 'LINE_CHIEF', 'QC', 'SHIPPING'],
  downtime: ['SUPERVISOR', 'LINE_CHIEF', 'IE'],
  maintenance: ['IE', 'PLANNING'],
  attendance: ['PLANNING', 'ACCOUNTS'],
  skills: ['IE'],
  stations: ['IE', 'PLANNING'],
  qualityAudits: ['QC'],
  correctiveActions: ['QC', 'IE'],
  costing: ['MERCHANDISER', 'ACCOUNTS'],
  compliance: ['QC', 'MERCHANDISER'],
  scenarios: ['PLANNING'],
  subcontracts: ['MERCHANDISER', 'PLANNING'],
  sustainability: ['STORE', 'IE'],
};

for (const config of Object.values(advancedConfigs))
  for (const field of config.fields)
    if (
      ['notes', 'resolution', 'rootCause', 'containment', 'corrective', 'preventive'].includes(
        field.key,
      )
    )
      field.type = 'textarea';
