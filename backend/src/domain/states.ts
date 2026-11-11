export const transitions: Record<string, Record<string, string[]>> = {
  orders: { DRAFT:['CONFIRMED','CANCELLED'], CONFIRMED:['IN_PRODUCTION','CANCELLED'], IN_PRODUCTION:['PACKING'], PACKING:['SHIPPED'], SHIPPED:['CLOSED'], CLOSED:[], CANCELLED:[] },
  styles: { DRAFT:['BOM_READY'], BOM_READY:['BULLETIN_READY'], BULLETIN_READY:['ACTIVE'], ACTIVE:['ARCHIVED'], ARCHIVED:[] },
  cutting: { PLANNED:['CUTTING'], CUTTING:['COMPLETED'], COMPLETED:[] },
  shipments: { PLANNED:['PACKED'], PACKED:['DISPATCHED'], DISPATCHED:['DELIVERED'], DELIVERED:[] },
  payroll: { DRAFT:['CALCULATED'], CALCULATED:['APPROVED'], APPROVED:['EXPORTED'], EXPORTED:[] },
};
export function canTransition(resource: string, from: string, to: string) { return transitions[resource]?.[from]?.includes(to) ?? false; }
