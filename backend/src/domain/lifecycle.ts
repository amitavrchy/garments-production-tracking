import { Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { Actor } from '../auth/permissions';
import { record, requireThat, delegate, Row } from './context';
import { Resource } from './schemas';
import { canTransition } from './states';
import { balances } from './balance';
import { materialReport } from './materials';
import { payrollBreakdown } from './workforce';
import { sum } from './math';
export async function transition(
  tx: Prisma.TransactionClient,
  actor: Actor,
  resource: Resource,
  id: string,
  target: string,
): Promise<Row> {
  const row = await record(tx, actor, resource, id);
  requireThat(
    canTransition(resource, row.status, target),
    `Cannot move ${row.status} to ${target}`,
  );
  const extra: Row = {};
  if (resource === 'styles') {
    if (target === 'BOM_READY')
      requireThat(await tx.bomItem.count({ where: { styleId: id } }), 'Add BOM items first');
    if (target === 'BULLETIN_READY') {
      const ops = await tx.operation.findMany({ where: { styleId: id } });
      requireThat(ops.length > 0, 'Add operation bulletin first');
      requireThat(
        Math.abs(sum(ops, (o) => o.smv) - row.smv) < 0.01,
        'Operation SMV total must match style SMV',
      );
    }
  }
  if (resource === 'orders') {
    const qty = await tx.orderQuantity.findMany({ where: { orderId: id } });
    requireThat(qty.length > 0, 'Add color and size quantities first');
    if (target === 'CONFIRMED')
      requireThat(
        (await record(tx, actor, 'styles', row.styleId)).status === 'ACTIVE',
        'Activate the style first',
      );
    const bs = await balances(tx, actor, id);
    if (target === 'CANCELLED')
      requireThat(
        !(await tx.cuttingRecord.count({ where: { orderId: id } })),
        'Cannot cancel an order with cutting records',
      );
    if (target === 'PACKING')
      requireThat(
        bs.some((b) => b.finished > 0),
        'Finish garments before packing',
      );
    if (target === 'SHIPPED')
      requireThat(
        bs.every((b) => b.shipped >= b.ordered),
        'Every size and color must be shipped in full',
      );
  }
  if (resource === 'cutting' && target === 'CUTTING') {
    const materials = await materialReport(tx, actor, row.orderId);
    requireThat(materials.length > 0, 'Order style has no BOM');
    requireThat(
      materials.every((m) => m.shortage < 0.0001),
      'BOM shortage: issue the required materials before cutting release',
    );
  }
  if (resource === 'shipments') {
    const cartons = await tx.packingCarton.findMany({ where: { shipmentId: id } });
    requireThat(cartons.length > 0, 'Add cartons to this shipment first');
    if (target === 'DISPATCHED') extra.shippedAt = new Date();
  }
  if (resource === 'payroll') {
    if (target === 'CALCULATED') {
      requireThat(
        !(await tx.payrollRun.findFirst({
          where: {
            factoryId: actor.factoryId,
            id: { not: id },
            periodStart: { lte: row.periodEnd },
            periodEnd: { gte: row.periodStart },
            status: { not: 'DRAFT' },
          },
        })),
        'Payroll periods cannot overlap a calculated run',
      );
      const breakdown = await payrollBreakdown(tx, actor, row);
      requireThat(breakdown.length > 0, 'No piece-rate entries in this period');
      extra.breakdown = breakdown;
      extra.totalMinor = sum(breakdown, (w) => w.amountMinor);
      extra.calculatedBy = actor.id;
    }
    if (target === 'APPROVED') {
      if (row.calculatedBy === actor.id)
        throw new ForbiddenException('A different accounts user must approve this payroll');
      extra.approvedBy = actor.id;
    }
    if (target === 'EXPORTED') requireThat(row.approvedBy, 'Payroll requires approval');
  }
  return delegate(tx, resource).update({ where: { id }, data: { status: target, ...extra } });
}
