import type { ModuleConfig } from './forms';
import { advancedModules } from './advanced';
export * from './forms';
export const modules: Record<string, ModuleConfig> = {
  ...advancedModules,
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
