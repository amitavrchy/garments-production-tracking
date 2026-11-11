import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Actor } from './auth/permissions';
import { balances } from './domain/balance';
import { materialReport } from './domain/materials';
import { dhakaDate, dhu, efficiency, sum, csv } from './domain/math';
import { record, requireThat } from './domain/context';
@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private db: PrismaService) {}
  async overview(actor: Actor, date = dhakaDate()) {
    const where = { factoryId: actor.factoryId };
    const [
      orders,
      lines,
      styles,
      production,
      inspections,
      allocations,
      wip,
      shipments,
      milestones,
    ] = await Promise.all([
      this.db.buyerOrder.findMany({ where }),
      this.db.line.findMany({ where }),
      this.db.style.findMany({ where }),
      this.db.hourlyProduction.findMany({ where: { ...where, date } }),
      this.db.qcInspection.findMany({ where: { ...where, date } }),
      this.db.allocation.findMany({ where: { ...where, date } }),
      balances(this.db, actor),
      this.db.shipment.findMany({ where }),
      this.db.milestone.findMany({ where: { ...where, completed: false, dueDate: { lte: date } } }),
    ]);
    const lineRows = lines.map((line) => {
      const entries = production.filter((p) => p.lineId === line.id);
      const actual = sum(entries, (p) => p.producedPcs),
        minutes = sum(entries, (p) => p.operators * p.availableMinutes);
      const earned = sum(
        entries,
        (p) =>
          p.producedPcs *
          (styles.find((s) => s.id === orders.find((o) => o.id === p.orderId)?.styleId)?.smv || 0),
      );
      const inspected = inspections.filter((q) => q.lineId === line.id);
      return {
        ...line,
        actual,
        target: allocations.find((a) => a.lineId === line.id)?.target || 0,
        efficiency: minutes ? (earned / minutes) * 100 : 0,
        dhu: dhu(
          sum(inspected, (q) => q.defectCount),
          sum(inspected, (q) => q.inspectedPcs),
        ),
        orderId: allocations.find((a) => a.lineId === line.id)?.orderId,
        operators: entries.at(-1)?.operators || line.targetManpower,
      };
    });
    const totalActual = sum(lineRows, (l) => l.actual),
      target = sum(lineRows, (l) => l.target);
    const denominator = sum(production, (p) => p.operators * p.availableMinutes);
    const earned = sum(
      production,
      (p) =>
        p.producedPcs *
        (styles.find((s) => s.id === orders.find((o) => o.id === p.orderId)?.styleId)?.smv || 0),
    );
    const hourly = Array.from({ length: 12 }, (_, i) => ({
      hour: i + 8,
      actual: sum(
        production.filter((p) => p.hourStart === i + 8),
        (p) => p.producedPcs,
      ),
      target: target / (Number(process.env.DEFAULT_SHIFT_MINUTES || 480) / 60),
      recorded: production.some((p) => p.hourStart === i + 8),
    }));
    const orderRows = orders.map((o) => {
      const b = wip.filter((b) => b.orderId === o.id);
      const ordered = sum(b, (b) => b.ordered),
        packed = sum(b, (b) => b.packed),
        shipped = sum(b, (b) => b.shipped);
      const days = Math.ceil((Date.parse(o.deliveryDate) - Date.parse(date)) / 86400000);
      return {
        ...o,
        ordered,
        cut: sum(b, (b) => b.cut),
        sewn: sum(b, (b) => b.sewn),
        finished: sum(b, (b) => b.finished),
        packed,
        shipped,
        progress: ordered ? Math.min(100, (shipped / ordered) * 100) : 0,
        atRisk:
          !['CANCELLED', 'CLOSED', 'SHIPPED'].includes(o.status) && days <= 7 && packed < ordered,
        days,
      };
    });
    return {
      date,
      actual: totalActual,
      target,
      efficiency: denominator ? (earned / denominator) * 100 : 0,
      dhu: dhu(
        sum(inspections, (q) => q.defectCount),
        sum(inspections, (q) => q.inspectedPcs),
      ),
      defects: sum(inspections, (q) => q.defectCount),
      inspected: sum(inspections, (q) => q.inspectedPcs),
      activeOrders: orders.filter((o) => !['CANCELLED', 'CLOSED', 'SHIPPED'].includes(o.status))
        .length,
      lines: lineRows,
      hourly,
      orders: orderRows,
      wip,
      shipments,
      milestones,
      alerts: [
        ...orderRows
          .filter((o) => o.atRisk)
          .map((o) => ({
            title: `${o.poNumber} delivery at risk`,
            detail: `${o.ordered - o.packed} pieces to pack · ${o.days < 0 ? 'Overdue' : `${o.days} days remaining`}`,
            type: 'warning',
          })),
        ...milestones.map((m) => ({
          title: m.name,
          detail: `TNA milestone due ${m.dueDate}`,
          type: 'warning',
        })),
      ],
    };
  }
  async materials(actor: Actor, orderId: string) {
    return materialReport(this.db, actor, orderId);
  }
  async audit(actor: Actor) {
    if (!['FACTORY_ADMIN', 'ACCOUNTS'].includes(actor.role))
      throw new ForbiddenException('Audit history is restricted');
    return this.db.auditLog.findMany({
      where: { factoryId: actor.factoryId },
      orderBy: { at: 'desc' },
      take: 300,
    });
  }
  async payrollCsv(actor: Actor, id: string) {
    if (!['FACTORY_ADMIN', 'ACCOUNTS'].includes(actor.role)) throw new ForbiddenException();
    const run = await record(this.db, actor, 'payroll', id);
    requireThat(['APPROVED', 'EXPORTED'].includes(run.status), 'Approve payroll before exporting');
    const rows = (
      run.breakdown as { employeeCode: string; name: string; pcs: number; amountMinor: number }[]
    ).map((r) => ({ ...r, amountBDT: (r.amountMinor / 100).toFixed(2) }));
    return csv(rows, ['employeeCode', 'name', 'pcs', 'amountMinor', 'amountBDT']);
  }
  async packingCsv(actor: Actor, id: string) {
    await record(this.db, actor, 'shipments', id);
    const rows = await this.db.packingCarton.findMany({
      where: { factoryId: actor.factoryId, shipmentId: id },
    });
    return csv(rows, ['cartonNo', 'color', 'size', 'pcs']);
  }
}
