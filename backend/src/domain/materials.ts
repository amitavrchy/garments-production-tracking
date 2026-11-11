import { Prisma } from '@prisma/client';
import { Actor } from '../auth/permissions';
import { record, requireThat } from './context';
import { requiredMaterial, sum } from './math';
export async function materialReport(tx: Prisma.TransactionClient, actor: Actor, orderId: string) {
  const order = await record(tx, actor, 'orders', orderId);
  const [items, quantities, moves] = await Promise.all([
    tx.bomItem.findMany({ where: { styleId: order.styleId, factoryId: actor.factoryId } }),
    tx.orderQuantity.findMany({ where: { orderId } }),
    tx.materialMovement.findMany({ where: { orderId } }),
  ]);
  const qty = sum(quantities, (r) => r.qty);
  return items.map((item) => {
    const movements = moves.filter((m) => m.bomItemId === item.id);
    const received = sum(
      movements.filter((m) => m.kind === 'RECEIVE'),
      (m) => m.qty,
    );
    const issued =
      sum(
        movements.filter((m) => m.kind === 'ISSUE'),
        (m) => m.qty,
      ) -
      sum(
        movements.filter((m) => m.kind === 'RETURN'),
        (m) => m.qty,
      );
    const required = requiredMaterial(item.consumptionPerPc, qty, item.wastageBps);
    return { ...item, required, received, issued, shortage: Math.max(0, required - issued) };
  });
}
export async function validateMaterials(
  tx: Prisma.TransactionClient,
  actor: Actor,
  orderId: string,
) {
  for (const m of await materialReport(tx, actor, orderId)) {
    requireThat(m.issued >= 0, 'Material return exceeds issued quantity');
    requireThat(m.issued <= m.received, 'Material issue exceeds received quantity');
  }
}
