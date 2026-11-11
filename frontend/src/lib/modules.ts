import { Resource } from './types';
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'password' | 'select' | 'checkbox' | 'lines';
  options?: string[];
  ref?: Resource;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  optional?: boolean;
};
export type ResourceConfig = {
  name: string;
  singular: string;
  description: string;
  fields: Field[];
  columns: string[];
};
export type ModuleConfig = {
  title: string;
  description: string;
  eyebrow: string;
  resources: Resource[];
};
export const ref = (key: string, label: string, resource: Resource): Field => ({
  key,
  label,
  ref: resource,
  type: 'select',
});
export const text = (key: string, label: string, extra: Partial<Field> = {}): Field => ({
  key,
  label,
  ...extra,
});
export const num = (key: string, label: string, extra: Partial<Field> = {}): Field => ({
  key,
  label,
  type: 'number',
  min: 0,
  step: 1,
  ...extra,
});
export const date = (key = 'date', label = 'Production date'): Field => ({
  key,
  label,
  type: 'date',
});
export const select = (key: string, label: string, options: string[], value?: string): Field => ({
  key,
  label,
  type: 'select',
  options,
  default: value || options[0],
});
export const variant: Field[] = [
  ref('orderId', 'Purchase order', 'orders'),
  text('color', 'Color', { default: 'Navy' }),
  text('size', 'Size', { default: 'M' }),
];
export const modules: Record<string, ModuleConfig> = {
  orders: {
    title: 'Buyer orders',
    description: 'Every commitment, from purchase order to delivery.',
    eyebrow: 'MERCHANDISING',
    resources: ['orders', 'quantities', 'buyers', 'milestones'],
  },
  styles: {
    title: 'Style library',
    description: 'The details behind every well-made garment.',
    eyebrow: 'PRODUCT DEVELOPMENT',
    resources: ['styles', 'bom', 'operations'],
  },
  planning: {
    title: 'Production planning',
    description: 'Put the right people and orders on the right lines.',
    eyebrow: 'PLAN & ALLOCATE',
    resources: ['allocations', 'assignments'],
  },
  cutting: {
    title: 'Cutting room',
    description: 'Release lays with confidence. Keep every size in balance.',
    eyebrow: 'PRODUCTION',
    resources: ['cutting'],
  },
  production: {
    title: 'Hourly production',
    description: 'Capture floor output as it happens, one hour at a time.',
    eyebrow: 'LIVE OPERATIONS',
    resources: ['production'],
  },
  quality: {
    title: 'Quality control',
    description: 'Catch defects early. Close the loop on rework.',
    eyebrow: 'QUALITY ASSURANCE',
    resources: ['qc'],
  },
  finishing: {
    title: 'Finishing & packing',
    description: 'Good garments, checked and ready for their next journey.',
    eyebrow: 'PRODUCTION',
    resources: ['finishing', 'cartons'],
  },
  shipments: {
    title: 'Shipments',
    description: 'From the last carton to a delivered commitment.',
    eyebrow: 'COMMERCIAL',
    resources: ['shipments', 'cartons'],
  },
  inventory: {
    title: 'Materials & store',
    description: 'Know what is received, issued, and still needed.',
    eyebrow: 'SUPPLY CHAIN',
    resources: ['materials', 'bom'],
  },
  payroll: {
    title: 'Piece-rate payroll',
    description: 'Transparent earnings. Every operation accounted for.',
    eyebrow: 'PEOPLE & ACCOUNTS',
    resources: ['payroll', 'pieceEntries'],
  },
  team: {
    title: 'People & floor',
    description: 'The people and equipment that keep your factory moving.',
    eyebrow: 'FACTORY',
    resources: ['workers', 'lines', 'machines', 'floors'],
  },
  settings: {
    title: 'Workspace settings',
    description: 'Manage your factory, users, and access.',
    eyebrow: 'ADMINISTRATION',
    resources: ['factories', 'users'],
  },
};
