import { Resource } from './types';
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'password' | 'select' | 'checkbox' | 'lines' | 'textarea';
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
