import { z } from 'zod';
import { roles } from '../auth/permissions';
const text = z.string().trim().min(1).max(180);
const id = text;
const qty = z.number().int().min(1).max(10000000);
const nonnegative = z.number().int().min(0).max(10000000);
const decimal = z.number().positive().max(1000000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Invalid calendar date',
  );
const variant = { orderId: id, color: text, size: text };
export const schemas = {
  factories: z.object({ name: text }),
  floors: z.object({ name: text }),
  lines: z.object({ floorId: id, code: text, targetManpower: qty }),
  machines: z.object({
    lineId: id,
    code: text,
    type: text,
    status: z.enum(['ACTIVE', 'MAINTENANCE']).default('ACTIVE'),
  }),
  workers: z.object({
    employeeCode: text,
    name: text,
    skillGrade: z.enum(['A', 'B', 'C', 'TRAINEE']).default('B'),
  }),
  users: z.object({
    email: z.email().transform((v) => v.toLowerCase()),
    name: text,
    role: z.enum(roles),
    password: z.string().min(10).max(128),
    lineIds: z.array(id).default([]),
  }),
  buyers: z.object({
    name: text,
    code: text,
    email: z.union([z.email(), z.literal('')]).default(''),
  }),
  styles: z.object({ code: text, name: text, smv: decimal }),
  bom: z.object({
    styleId: id,
    itemType: z.enum(['FABRIC', 'TRIM']),
    description: text,
    consumptionPerPc: decimal,
    wastageBps: nonnegative.max(10000),
    uom: z.enum(['kg', 'm', 'pcs', 'yd']),
  }),
  operations: z.object({
    styleId: id,
    seq: qty,
    name: text,
    smv: decimal,
    pieceRateMinor: nonnegative,
    machineType: text,
  }),
  orders: z.object({ buyerId: id, styleId: id, poNumber: text, deliveryDate: date }),
  quantities: z.object({ ...variant, qty }),
  milestones: z.object({
    orderId: id,
    name: text,
    dueDate: date,
    completed: z.boolean().default(false),
  }),
  assignments: z.object({ lineId: id, workerId: id, date, hours: decimal.max(24) }),
  allocations: z.object({ lineId: id, orderId: id, date, target: qty }),
  materials: z.object({
    bomItemId: id,
    orderId: id,
    kind: z.enum(['RECEIVE', 'ISSUE', 'RETURN']),
    qty: decimal,
    reference: text,
    date,
  }),
  cutting: z.object({ ...variant, qty, layNumber: text, date }),
  production: z.object({
    ...variant,
    lineId: id,
    date,
    hourStart: nonnegative.max(23),
    producedPcs: nonnegative,
    inputPcs: nonnegative,
    operators: qty.max(5000),
    availableMinutes: qty.max(180),
  }),
  qc: z.object({
    ...variant,
    lineId: id,
    inspectedPcs: qty,
    defectCode: z.enum(['NONE', 'STITCH', 'STAIN', 'MEASUREMENT', 'HOLE', 'SHADE', 'OTHER']),
    defectCount: nonnegative,
    reworkPcs: nonnegative,
    rejectedPcs: nonnegative,
    date,
  }),
  finishing: z.object({ ...variant, qty, date }),
  shipments: z.object({ orderId: id, invoiceNo: text, destination: text, deliveryDate: date }),
  cartons: z.object({ ...variant, shipmentId: id, cartonNo: text, pcs: qty }),
  pieceEntries: z.object({ workerId: id, operationId: id, orderId: id, date, pcs: qty }),
  payroll: z
    .object({ name: text, periodStart: date, periodEnd: date })
    .refine((v) => v.periodStart <= v.periodEnd, 'End must be after start'),
};
export type Resource = keyof typeof schemas;
export const models: Record<Resource, string> = {
  factories: 'factory',
  floors: 'floor',
  lines: 'line',
  machines: 'machine',
  workers: 'worker',
  users: 'user',
  buyers: 'buyer',
  styles: 'style',
  bom: 'bomItem',
  operations: 'operation',
  orders: 'buyerOrder',
  quantities: 'orderQuantity',
  milestones: 'milestone',
  assignments: 'lineAssignment',
  allocations: 'allocation',
  materials: 'materialMovement',
  cutting: 'cuttingRecord',
  production: 'hourlyProduction',
  qc: 'qcInspection',
  finishing: 'finishingRecord',
  shipments: 'shipment',
  cartons: 'packingCarton',
  pieceEntries: 'pieceRateEntry',
  payroll: 'payrollRun',
};
