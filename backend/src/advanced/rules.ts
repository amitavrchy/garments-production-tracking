import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { Actor } from '../auth/permissions';
import { Resource } from '../domain/schemas';
import { Row, record, requireThat, delegate } from '../domain/context';
import {
  advancedModels,
  advancedTransitions,
  advancedReferences,
  AdvancedResource,
} from './catalog';
import { sum, requiredMaterial, dhakaDate } from '../domain/math';
import { simulate } from './planning';
import { validateMaterials } from '../domain/materials';
import { balances } from '../domain/balance';
export const isAdvanced = (resource: string) => Object.hasOwn(advancedModels, resource);
export async function prepareAdvanced(
  tx: Prisma.TransactionClient,
  actor: Actor,
  resource: Resource,
  data: Row,
  before: Row | null,
  expectedVersion: unknown,
) {
  if (!isAdvanced(resource)) return data;
  if (before) {
    if (expectedVersion !== before.version)
      throw new ConflictException(
        'This record changed since you opened it. Refresh before saving.',
      );
    requireThat(
      !['lotIssues', 'bundles'].includes(resource),
      'Posted movements and bundle identity are immutable',
    );
    for (const field of Object.keys(advancedReferences[resource] || {}))
      requireThat(data[field] === before[field], `Cannot change ${field} on a posted record`);
  }
  const result: Row = {
    ...data,
    version: (before?.version || 0) + 1,
    ...(!before ? { createdBy: actor.id } : {}),
  };
  if(resource==='scenarios'&&before){result.status='DRAFT';result.result=Prisma.JsonNull;}
  if (resource === 'purchases') {
    requireThat(
      data.currency !== 'BDT' || data.exchangeRate === 1,
      'BDT purchases must use exchange rate 1',
    );
    requireThat(
      data.qty * data.unitCostMinor * data.exchangeRate <= 2147483647,
      'Purchase total exceeds the supported value; split the order',
    );
  }
  if (resource === 'lots') {
    requireThat(
      ['FACTORY_ADMIN', 'STORE'].includes(actor.role),
      'Only store users can receive stock',
    );
    requireThat(!before, 'Stock lots are immutable after receipt; use issue/return movements');
    requireThat(actor.role==='FACTORY_ADMIN'||data.testResult==='HOLD','Store receipts must enter quality hold before QC clearance');
    await tx.materialMovement.create({
      data: {
        factoryId: actor.factoryId,
        orderId: data.orderId,
        bomItemId: data.bomItemId,
        kind: 'RECEIVE',
        qty: data.qty,
        reference: `LOT:${data.lotNo}`,
        date: dhakaDate(),
      },
    });
  }
  if (resource === 'lotIssues') {
    const lot = await record(tx, actor, 'lots', data.lotId);
    requireThat(lot.orderId === data.orderId, 'Lot is reserved for a different order');
    requireThat(lot.testResult === 'PASS', 'Held or failed fabric cannot be issued');
    const next = lot.issuedQty + (data.kind === 'ISSUE' ? data.qty : -data.qty);
    requireThat(
      next >= -0.000001 && next <= lot.qty + 0.000001,
      'Lot issue/return would create negative stock or exceed received stock',
    );
    await tx.materialLot.update({
      where: { id: lot.id },
      data: { issuedQty: Math.max(0, next), version: { increment: 1 } },
    });
    await tx.materialMovement.create({
      data: {
        factoryId: actor.factoryId,
        orderId: data.orderId,
        bomItemId: lot.bomItemId,
        kind: data.kind,
        qty: data.qty,
        reference: `LOT:${lot.lotNo}`,
        date: data.date,
      },
    });
    await validateMaterials(tx, actor, data.orderId);
  }
  if (resource === 'bundles') {
    requireThat(['FACTORY_ADMIN','LINE_CHIEF','SUPERVISOR'].includes(actor.role),'Only production roles can generate bundle tickets');
    const cut = await record(tx, actor, 'cutting', data.cuttingId);
    requireThat(cut.status === 'COMPLETED', 'Complete the cutting lay before generating tickets');
    const used = await tx.bundle.aggregate({ where: { cuttingId: cut.id }, _sum: { qty: true } });
    requireThat(
      (used._sum.qty || 0) + data.qty <= cut.qty,
      'Bundle totals exceed the cutting lay quantity',
    );
  }
  if (resource === 'downtime') {
    const machine = await record(tx, actor, 'machines', data.machineId);
    requireThat(machine.lineId === data.lineId, 'Machine does not belong to the selected line');
    const rows = await tx.downtime.findMany({
      where: {
        factoryId: actor.factoryId,
        machineId: data.machineId,
        date: data.date,
        ...(before ? { id: { not: before.id } } : {}),
      },
    });
    requireThat(
      sum(rows, (r) => r.minutes) + data.minutes <= 1440,
      'Machine downtime exceeds 24 hours in one day',
    );
  }
  if (resource === 'maintenance')
    await tx.machine.update({ where: { id: data.machineId }, data: { status: 'MAINTENANCE' } });
  if (resource === 'attendance') {
    const duration = data.clockOut - data.clockIn - data.breakMinutes;
    requireThat(
      data.status !== 'PRESENT' || (duration > 0 && data.clockOut - data.clockIn <= 1440),
      'Clock-out must follow clock-in within a 24-hour shift; breaks must fit',
    );
    result.workedMinutes = data.status === 'PRESENT' ? duration : 0;
    result.overtimeMinutes = Math.max(
      0,
      result.workedMinutes - Number(process.env.DEFAULT_SHIFT_MINUTES || 480),
    );
  }
  if (resource === 'stations') {
    const allocation = await tx.allocation.findUnique({
      where: { lineId_date: { lineId: data.lineId, date: data.date } },
    });
    requireThat(allocation, 'Allocate an order before balancing stations');
    const order = await record(tx, actor, 'orders', allocation.orderId),
      op = await record(tx, actor, 'operations', data.operationId);
    requireThat(op.styleId === order.styleId, 'Station operation must match the allocated style');
    const stations = await tx.stationPlan.findMany({
      where: {
        lineId: data.lineId,
        date: data.date,
        ...(before ? { id: { not: before.id } } : {}),
      },
    });
    const line = await record(tx, actor, 'lines', data.lineId);
    requireThat(
      sum(stations, (s) => s.operators) + data.operators <= line.targetManpower,
      'Station operators exceed planned line manpower',
    );
  }
  if (resource === 'qualityAudits') {
    requireThat(data.sampleSize <= data.lotSize, 'Sample size exceeds lot size');
    requireThat(
      data.acceptMajor <= data.sampleSize && data.acceptMinor <= data.sampleSize,
      'Acceptance counts exceed sample size',
    );
    requireThat(
      data.lotSize <= sum(await balances(tx, actor, data.orderId), (b) => b.finished),
      'Final audit lot exceeds finished pieces',
    );
  }
  return result;
}
export async function advancedAction(
  tx: Prisma.TransactionClient,
  actor: Actor,
  resource: Resource,
  before: Row,
  body: Row,
): Promise<Row | null> {
  if (!isAdvanced(resource)) return null;
  if (body.expectedVersion !== before.version)
    throw new ConflictException('This record changed. Refresh before applying the action.');
  if (resource === 'lots' && body.action === 'inspect') {
    requireThat(
      ['FACTORY_ADMIN', 'QC'].includes(actor.role),
      'Quality clearance requires a QC user',
    );
    requireThat(
      ['PASS', 'FAIL', 'HOLD'].includes(body.result),
      'Choose a valid fabric test result',
    );
    requireThat(
      before.issuedQty === 0,
      'Cannot change fabric clearance after stock has been issued',
    );
    return tx.materialLot.update({
      where: { id: before.id },
      data: { testResult: body.result, version: { increment: 1 } },
    });
  }
  const next = body.status;
  requireThat(
    advancedTransitions[resource]?.[before.status]?.includes(next),
    `Cannot move ${before.status} to ${next}`,
  );
  const extra: Row = {};
  let status = next;
  if (resource === 'purchases') {
    if (next === 'APPROVED') {
      requireThat(
        ['FACTORY_ADMIN', 'ACCOUNTS'].includes(actor.role),
        'Accounts approval is required',
      );
      requireThat(
        before.createdBy !== actor.id,
        'A different accounts user must approve procurement',
      );
      extra.approvedBy = actor.id;
    }
    if (next === 'RECEIVED') {
      const lot = await tx.materialLot.create({
        data: {
          factoryId: actor.factoryId,
          lotNo: `GRN-${before.number}`,
          supplierId: before.supplierId,
          orderId: before.orderId,
          bomItemId: before.bomItemId,
          qty: before.qty,
          warehouse: 'Main warehouse',
          bin: 'Receiving',
          shade: 'Pending shade assessment',
          gsm: 0,
          widthCm: 0,
          testResult: 'HOLD',
          createdBy: actor.id,
        },
      });
      await tx.materialMovement.create({
        data: {
          factoryId: actor.factoryId,
          orderId: before.orderId,
          bomItemId: before.bomItemId,
          kind: 'RECEIVE',
          qty: before.qty,
          reference: `PURCHASE:${before.number}:${lot.id}`,
          date: dhakaDate(),
        },
      });
    }
  }
  if (resource === 'maintenance' && next === 'COMPLETED') {
    requireThat(
      before.resolution.trim().length > 0,
      'Record the maintenance resolution before completing',
    );
    extra.completedAt = new Date();
    if (
      !(await tx.maintenance.count({
        where: {
          machineId: before.machineId,
          id: { not: before.id },
          status: { not: 'COMPLETED' },
        },
      }))
    )
      await tx.machine.update({ where: { id: before.machineId }, data: { status: 'ACTIVE' } });
  }
  if (resource === 'qualityAudits' && next === 'ASSESSED')
    status =
      before.criticalCount > 0 ||
      before.majorCount > before.acceptMajor ||
      before.minorCount > before.acceptMinor
        ? 'FAILED'
        : 'PASSED';
  if (resource === 'correctiveActions' && next === 'VERIFIED') {
    requireThat(
      [before.rootCause, before.containment, before.corrective, before.preventive].every(
        (v) => v.trim().length > 0,
      ),
      'Complete root cause, containment, correction and prevention',
    );
    requireThat(
      actor.id !== before.ownerId,
      'Another quality user must verify the corrective action',
    );
    extra.verifiedBy = actor.id;
  }
  if (resource === 'compliance') {
    if (next === 'REVIEW')
      requireThat(before.notes.trim() || before.evidenceUrl, 'Attach evidence or inspection notes');
    if (['PASSED', 'FAILED'].includes(next)) {
      requireThat(
        actor.id !== before.ownerId,
        'A different reviewer must assess the compliance check',
      );
      extra.reviewedBy = actor.id;
    }
  }
  if (resource === 'costing') {
    if (next === 'CALCULATED') {
      const order = await record(tx, actor, 'orders', before.orderId),
        style = await record(tx, actor, 'styles', order.styleId);
      const [bom, purchases] = await Promise.all([
        tx.bomItem.findMany({ where: { styleId: style.id } }),
        tx.purchaseOrder.findMany({
          where: { orderId: order.id, status: { in: ['APPROVED', 'RECEIVED'] } },
        }),
      ]);
      requireThat(bom.length > 0, 'Style has no BOM to cost');
      const breakdown = bom.map((item) => {
        const prices = purchases.filter((p) => p.bomItemId === item.id);
        requireThat(prices.length > 0, `No approved supplier price for ${item.description}`);
        const unitCost =
          sum(prices, (p) => p.unitCostMinor * p.exchangeRate * p.qty) / sum(prices, (p) => p.qty);
        return {
          description: item.description,
          uom: item.uom,
          consumption: item.consumptionPerPc,
          wastageBps: item.wastageBps,
          unitCostMinor: Math.round(unitCost),
          costMinor: Math.round(
            requiredMaterial(item.consumptionPerPc, 1, item.wastageBps) * unitCost,
          ),
        };
      });
      extra.materialMinor = sum(breakdown, (b) => b.costMinor);
      extra.totalMinor =
        extra.materialMinor +
        Math.round(style.smv * before.laborMinuteMinor) +
        before.overheadMinor +
        before.packingMinor +
        before.freightMinor;
      extra.marginPercent = ((before.sellingMinor - extra.totalMinor) / before.sellingMinor) * 100;
      requireThat(Number.isSafeInteger(extra.totalMinor)&&extra.totalMinor<=2147483647,'Calculated cost exceeds the supported poisha amount. Review prices and consumption.');
      extra.breakdown = breakdown;
    }
    if (next === 'APPROVED') {
      requireThat(
        ['FACTORY_ADMIN', 'ACCOUNTS'].includes(actor.role),
        'Accounts approval is required',
      );
      requireThat(
        actor.id !== before.createdBy,
        'Another accounts user must approve the cost sheet',
      );
    }
  }
  if (resource === 'scenarios') {
    const result = await simulate(tx, actor, before);
    if (next === 'SIMULATED') extra.result = result;
    else {
      requireThat(
        before.result?.fingerprint === result.fingerprint,
        'Production or planning changed. Simulate again before applying.',
      );
      requireThat(before.startDate >= dhakaDate(), 'Cannot apply a schedule in the past');
      requireThat(result.plan.length > 0, 'This scenario has no available allocation slots');
      await tx.allocation.createMany({
        data: result.plan.map((p) => ({
          factoryId: actor.factoryId,
          lineId: p.lineId,
          orderId: p.orderId,
          date: p.date,
          target: p.target,
        })),
      });
    }
  }
  if(resource==='bundles'&&actor.role!=='FACTORY_ADMIN'){
    const roles=next==='PACKED'?['SHIPPING']:['FINISHING','HOLD'].includes(next)||before.status==='HOLD'?['QC']:['LINE_CHIEF','SUPERVISOR','QC'];
    requireThat(roles.includes(actor.role),'This checkpoint requires a different operational role');
  }
  if (resource === 'bundles')
    await tx.bundleEvent.create({
      data: { factoryId: actor.factoryId, bundleId: before.id, stage: next, actorId: actor.id },
    });
  if (resource === 'bundles' && ['QC', 'FINISHING', 'PACKED'].includes(next)) {
    const cut = await record(tx, actor, 'cutting', before.cuttingId);
    const b = (await balances(tx, actor, cut.orderId)).find(
      (b) => b.color === cut.color && b.size === cut.size,
    );
    const cuts = await tx.cuttingRecord.findMany({
      where: { orderId: cut.orderId, color: cut.color, size: cut.size },
    });
    const stages =
      next === 'QC'
        ? ['QC', 'HOLD', 'FINISHING', 'PACKED']
        : next === 'FINISHING'
          ? ['FINISHING', 'PACKED']
          : ['PACKED'];
    const others = await tx.bundle.findMany({
      where: {
        cuttingId: { in: cuts.map((c) => c.id) },
        id: { not: before.id },
        status: { in: stages },
      },
    });
    const available = next === 'QC' ? b?.sewn : next === 'FINISHING' ? b?.finished : b?.packed;
    requireThat(
      (available || 0) >= sum(others, (r) => r.qty) + before.qty,
      `Traceability cannot advance beyond recorded ${next === 'QC' ? 'sewing' : next === 'FINISHING' ? 'finishing' : 'packing'} output`,
    );
  }
  if (resource === 'subcontracts' && next === 'RECEIVED') {
    const received = body.receivedQty ?? (before.receivedQty || before.qty);
    requireThat(
      Number.isInteger(received) && received > 0 && received <= before.qty,
      'Received pieces must be between 1 and the dispatched quantity',
    );
    extra.receivedQty = received;
  }
  return delegate(tx, resource).update({
    where: { id: before.id },
    data: { status, ...extra, version: { increment: 1 } },
  });
}
