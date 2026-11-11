import 'reflect-metadata';
import 'dotenv/config';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../src/prisma.service';
import { DomainService } from '../src/domain/domain.service';
import { AdvancedService } from '../src/advanced/advanced.service';
import { ReportsService } from '../src/reports.service';
import { Actor } from '../src/auth/permissions';
import { LiveGateway } from '../src/live.gateway';
import { Row } from '../src/domain/context';
import { buildSchedule, stationBalance } from '../src/advanced/planning';
import { dhakaDate } from '../src/domain/math';
describe('capacity and bottleneck mathematics', () => {
  it('allocates earliest delivery first and preserves occupied slots', () => {
    const input = {
      orders: [
        { id: 'late', poNumber: 'B', styleId: 's', deliveryDate: '2026-11-30' },
        { id: 'early', poNumber: 'A', styleId: 's', deliveryDate: '2026-11-12' },
      ],
      lines: [
        { id: 'l1', code: '01', targetManpower: 10 },
        { id: 'l2', code: '02', targetManpower: 10 },
      ],
      styles: [{ id: 's', smv: 10 }],
      allocations: [{ lineId: 'l1', date: '2026-11-11' }],
      remaining: { late: 100, early: 300 },
    } as any;
    const r = buildSchedule(input, {
      startDate: '2026-11-11',
      days: 2,
      efficiency: 100,
      overtimeMinutes: 0,
      operatorsOverride: 0,
    });
    expect(r.plan[0].orderId).toBe('early');
    expect(r.plan[0].lineId).toBe('l2');
    expect(r.plannedPcs).toBe(400);
    expect(r.unplanned).toEqual([]);
  });
  it('reconciles station capacity and recommended operators', () => {
    const rows = stationBalance(
      [{ id: 'op', smv: 5 }],
      [{ operationId: 'op', operators: 5 }],
      500,
      480,
      80,
    );
    expect(rows[0].capacity).toBe(384);
    expect(rows[0].recommended).toBe(7);
    expect(rows[0].gap).toBe(116);
  });
});
const suite = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;
suite('advanced transactional manufacturing workflows', () => {
  const db = new PrismaService(),
    domain = new DomainService(db, { changed: () => {} } as unknown as LiveGateway),
    reports = new ReportsService(db),
    advanced = new AdvancedService(db, reports),
    factoryId = `advanced-${Date.now()}`;
  let admin: Actor,
    accounts: Actor,
    qc: Actor,
    orderId: string,
    lineId: string,
    machineId: string,
    bomId: string,
    operationId: string,
    cutId: string,
    supplier: Row,
    purchase: Row,
    lot: Row,
    workerId: string;
  const date = dhakaDate(),
    future = (n: number) => {
      const d = new Date(date + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
  const create = async (resource: string, data: Row | Record<string, unknown>, key?: string) =>
    (await domain.write(admin, domain.resource(resource), data, undefined, key)).record;
  const act = async (
    resource: string,
    row: Row,
    status: string,
    actor = admin,
    extra: Row | Record<string, unknown> = {},
  ) =>
    (
      await domain.action(actor, domain.resource(resource), row.id, {
        status,
        expectedVersion: row.version,
        ...extra,
      })
    ).record;
  beforeAll(async () => {
    await db.$connect();
    await db.factory.create({ data: { id: factoryId, name: 'Advanced workflow test' } });
    async function user(role: Actor['role']) {
      const u = await db.user.create({
        data: {
          factoryId,
          name: role,
          email: `${role}-${factoryId}@test.local`,
          passwordHash: 'unused',
          role,
        },
      });
      return { id: u.id, factoryId, name: u.name, email: u.email, role, lineIds: [] } as Actor;
    }
    admin = await user('FACTORY_ADMIN');
    accounts = await user('ACCOUNTS');
    qc = await user('QC');
    const floor = await create('floors', { name: 'A' });
    lineId = (await create('lines', { floorId: floor.id, code: 'A1', targetManpower: 20 })).id;
    const second = await create('lines', { floorId: floor.id, code: 'A2', targetManpower: 24 });
    machineId = (await create('machines', { lineId, code: 'M1', type: 'SNLS', status: 'ACTIVE' }))
      .id;
    await create('machines', { lineId: second.id, code: 'M2', type: 'SNLS', status: 'ACTIVE' });
    workerId = (
      await create('workers', { employeeCode: 'W1', name: 'Qualified worker', skillGrade: 'A' })
    ).id;
    const buyer = await create('buyers', { name: 'Test buyer', code: 'A', email: '' }),
      style = await create('styles', { code: 'A', name: 'A', smv: 10 });
    bomId = (
      await create('bom', {
        styleId: style.id,
        itemType: 'FABRIC',
        description: 'Test cotton',
        consumptionPerPc: 0.2,
        wastageBps: 500,
        uom: 'kg',
      })
    ).id;
    operationId = (
      await create('operations', {
        styleId: style.id,
        seq: 1,
        name: 'Join',
        smv: 10,
        pieceRateMinor: 100,
        machineType: 'SNLS',
      })
    ).id;
    for (const status of ['BOM_READY', 'BULLETIN_READY', 'ACTIVE'])
      await domain.action(admin, 'styles', style.id, { status });
    orderId = (
      await create('orders', {
        buyerId: buyer.id,
        styleId: style.id,
        poNumber: 'ADV-PO',
        deliveryDate: future(14),
      })
    ).id;
    await create('quantities', { orderId, color: 'Navy', size: 'M', qty: 1000 });
    for (const status of ['CONFIRMED', 'IN_PRODUCTION'])
      await domain.action(admin, 'orders', orderId, { status });
    for (const kind of ['RECEIVE', 'ISSUE'])
      await create('materials', {
        orderId,
        bomItemId: bomId,
        kind,
        qty: 210,
        reference: kind,
        date,
      });
    const cut = await create('cutting', {
      orderId,
      color: 'Navy',
      size: 'M',
      qty: 1000,
      layNumber: 'A',
      date,
    });
    cutId = cut.id;
    for (const status of ['CUTTING', 'COMPLETED'])
      await domain.action(admin, 'cutting', cut.id, { status });
    await create('allocations', { lineId, orderId, date, target: 500 });
    await create('production', {
      lineId,
      orderId,
      color: 'Navy',
      size: 'M',
      date,
      hourStart: 8,
      producedPcs: 300,
      inputPcs: 300,
      operators: 20,
      availableMinutes: 60,
    });
    await create('finishing', { orderId, color: 'Navy', size: 'M', qty: 200, date });
    const shipment = await create('shipments', {
      orderId,
      invoiceNo: 'INV-A',
      destination: 'Dhaka',
      deliveryDate: future(14),
    });
    await create('cartons', {
      orderId,
      color: 'Navy',
      size: 'M',
      shipmentId: shipment.id,
      cartonNo: 'A1',
      pcs: 50,
    });
    supplier = await create('suppliers', {
      code: 'SUP',
      name: 'Supplier',
      email: 'supplier@test.local',
      country: 'Bangladesh',
      paymentTerms: 'Net 30',
    });
  }, 30000);
  afterAll(async () => {
    for (const name of [
      'auditLog',
      'mutationReceipt',
      'bundleEvent',
      'lotIssue',
      'correctiveAction',
      'qualityAudit',
      'stationPlan',
      'workerSkill',
      'attendance',
      'maintenance',
      'downtime',
      'bundle',
      'costSheet',
      'complianceCheck',
      'capacityScenario',
      'subcontract',
      'sustainabilityRecord',
      'materialLot',
      'purchaseOrder',
      'supplier',
      'packingCarton',
      'shipment',
      'payrollRun',
      'pieceRateEntry',
      'finishingRecord',
      'qcInspection',
      'hourlyProduction',
      'cuttingRecord',
      'materialMovement',
      'allocation',
      'lineAssignment',
      'orderQuantity',
      'milestone',
      'buyerOrder',
      'bomItem',
      'operation',
      'style',
      'buyer',
      'worker',
      'machine',
      'line',
      'floor',
      'user',
    ])
      await (db as any)[name].deleteMany({ where: { factoryId } });
    await db.factory.deleteMany({ where: { id: factoryId } });
    await db.$disconnect();
  });
  it('separates purchase approval and atomically receives a held lot', async () => {
    purchase = await create('purchases', {
      number: 'P1',
      supplierId: supplier.id,
      orderId,
      bomItemId: bomId,
      qty: 100,
      unitCostMinor: 45000,
      currency: 'BDT',
      exchangeRate: 1,
      dueDate: future(3),
    });
    purchase = await act('purchases', purchase, 'SUBMITTED');
    await expect(act('purchases', purchase, 'APPROVED')).rejects.toThrow('different accounts');
    purchase = await act('purchases', purchase, 'APPROVED', accounts);
    purchase = await act('purchases', purchase, 'RECEIVED');
    lot = await db.materialLot.findFirstOrThrow({ where: { factoryId, lotNo: 'GRN-P1' } });
    expect(lot.testResult).toBe('HOLD');
    expect(
      await db.materialMovement.count({
        where: { factoryId, reference: { startsWith: 'PURCHASE:P1' } },
      }),
    ).toBe(1);
  });
  it('blocks held fabric and independently clears its QC', async () => {
    await expect(
      create('lotIssues', { lotId: lot.id, orderId, qty: 10, kind: 'ISSUE', date }),
    ).rejects.toThrow('Held or failed');
    lot = (
      await domain.action(qc, 'lots', lot.id, {
        action: 'inspect',
        result: 'PASS',
        expectedVersion: lot.version,
      })
    ).record;
    expect(lot.testResult).toBe('PASS');
  });
  it('replays an idempotency key without posting stock twice', async () => {
    const body = { lotId: lot.id, orderId, qty: 40, kind: 'ISSUE', date },
      key = 'stock-idempotency-0001';
    const first = await create('lotIssues', body, key),
      second = await create('lotIssues', body, key);
    expect(second.id).toBe(first.id);
    expect((await db.materialLot.findUniqueOrThrow({ where: { id: lot.id } })).issuedQty).toBe(40);
    await expect(create('lotIssues', { ...body, qty: 1 }, key)).rejects.toThrow(
      'different request',
    );
  });
  it('serializes competing stock issues and prevents negative availability', async () => {
    const body = { lotId: lot.id, orderId, qty: 40, kind: 'ISSUE', date };
    const results = await Promise.allSettled([
      create('lotIssues', body),
      create('lotIssues', body),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await db.materialLot.findUniqueOrThrow({ where: { id: lot.id } })).issuedQty).toBe(80);
    await create('lotIssues', { ...body, qty: 20, kind: 'RETURN' });
    expect((await db.materialLot.findUniqueOrThrow({ where: { id: lot.id } })).issuedQty).toBe(60);
  });
  it('detects stale edits before overwriting advanced master data', async () => {
    const body = {
      code: 'SUP',
      name: 'Updated',
      email: 'supplier@test.local',
      country: 'Bangladesh',
      paymentTerms: 'Net 45',
      expectedVersion: supplier.version,
    };
    await domain.write(admin, 'suppliers', body, supplier.id);
    await expect(domain.write(admin, 'suppliers', body, supplier.id)).rejects.toThrow(
      'changed since',
    );
  });
  it('protects machine state through maintenance resolution', async () => {
    let job = await create('maintenance', {
      machineId,
      title: 'Needle alignment',
      kind: 'CORRECTIVE',
      priority: 'HIGH',
      assignedTo: admin.id,
      dueDate: future(1),
      spareCostMinor: 0,
      resolution: '',
    });
    expect((await db.machine.findUniqueOrThrow({ where: { id: machineId } })).status).toBe(
      'MAINTENANCE',
    );
    job = await act('maintenance', job, 'IN_PROGRESS');
    await expect(act('maintenance', job, 'COMPLETED')).rejects.toThrow('resolution');
    job = (
      await domain.write(
        admin,
        'maintenance',
        {
          machineId,
          title: job.title,
          kind: job.kind,
          priority: job.priority,
          assignedTo: admin.id,
          dueDate: job.dueDate,
          spareCostMinor: 0,
          resolution: 'Replaced needle and verified alignment',
          expectedVersion: job.version,
        },
        job.id,
      )
    ).record;
    await act('maintenance', job, 'COMPLETED');
    expect((await db.machine.findUniqueOrThrow({ where: { id: machineId } })).status).toBe(
      'ACTIVE',
    );
  });
  it('calculates attendance overtime and excludes expired skills', async () => {
    const attendance = await create('attendance', {
      workerId,
      date,
      clockIn: 480,
      clockOut: 1080,
      breakMinutes: 60,
      status: 'PRESENT',
    });
    expect(attendance.workedMinutes).toBe(540);
    expect(attendance.overtimeMinutes).toBe(60);
    await create('skills', {
      workerId,
      operationId,
      level: 4,
      efficiency: 90,
      trainedDate: future(-10),
      validUntil: future(-1),
    });
    await create('stations', { lineId, operationId, date, operators: 20 });
    const result = await advanced.balance(admin, lineId, date);
    expect(result.operations[0].capacity).toBe(768);
    expect(result.recommendations[0].workers).toHaveLength(0);
  });
  it('assesses final sampling and requires independent CAPA verification', async () => {
    let inspection = await create('qualityAudits', {
      orderId,
      lineId,
      name: 'Final audit',
      lotSize: 200,
      sampleSize: 80,
      criticalCount: 0,
      majorCount: 3,
      minorCount: 0,
      acceptMajor: 2,
      acceptMinor: 5,
      date,
    });
    inspection = await act('qualityAudits', inspection, 'ASSESSED');
    expect(inspection.status).toBe('FAILED');
    let capa = await create('correctiveActions', {
      auditId: inspection.id,
      title: 'Puckering',
      rootCause: 'Tension',
      containment: 'Hold',
      corrective: 'Recalibrate',
      preventive: 'First-off checks',
      ownerId: qc.id,
      dueDate: future(2),
    });
    capa = await act('correctiveActions', capa, 'IN_PROGRESS');
    await expect(act('correctiveActions', capa, 'VERIFIED', qc)).rejects.toThrow('Another quality');
    capa = await act('correctiveActions', capa, 'VERIFIED');
    capa = await act('correctiveActions', capa, 'CLOSED');
    expect(capa.verifiedBy).toBe(admin.id);
  });
  it('reconciles BOM prices, wastage, SMV labor and margin', async () => {
    let cost = await create('costing', {
      orderId,
      name: 'Revision A',
      laborMinuteMinor: 10,
      overheadMinor: 100,
      packingMinor: 50,
      freightMinor: 50,
      sellingMinor: 15000,
    });
    cost = await act('costing', cost, 'CALCULATED');
    expect(cost.materialMinor).toBe(9450);
    expect(cost.totalMinor).toBe(9750);
    expect(cost.marginPercent).toBe(35);
    await expect(act('costing', cost, 'APPROVED')).rejects.toThrow('Another accounts');
    cost = await act('costing', cost, 'APPROVED', accounts);
    expect(cost.status).toBe('APPROVED');
  });
  it('keeps bundle checkpoints append-only and behind actual production', async () => {
    let bundle = await create('bundles', { code: 'BUNDLE-A', cuttingId: cutId, lineId, qty: 25 });
    for (const status of ['SEWING', 'QC', 'FINISHING', 'PACKED'])
      bundle = await act('bundles', bundle, status);
    const trace = await advanced.trace(admin, bundle.code);
    expect(trace.events).toHaveLength(5);
    expect(trace.bundle.status).toBe('PACKED');
    let oversize = await create('bundles', {
      code: 'BUNDLE-B',
      cuttingId: cutId,
      lineId,
      qty: 400,
    });
    oversize = await act('bundles', oversize, 'SEWING');
    await expect(act('bundles', oversize, 'QC')).rejects.toThrow('recorded sewing');
  });
  it('accounts for external sent input and partial good return', async () => {
    let job = await create('subcontracts', {
      supplierId: supplier.id,
      orderId,
      color: 'Navy',
      size: 'M',
      qty: 100,
      receivedQty: 0,
      sentDate: date,
      dueDate: future(3),
    });
    job = await act('subcontracts', job, 'SENT');
    job = await act('subcontracts', job, 'RECEIVED', admin, { receivedQty: 90 });
    const report = await reports.overview(admin, date);
    expect(report.wip[0].input).toBe(400);
    expect(report.wip[0].sewn).toBe(390);
  });
  it('requires evidence and an independent compliance reviewer', async () => {
    let check = await create('compliance', {
      title: 'Fire exits',
      category: 'FIRE_SAFETY',
      ownerId: admin.id,
      dueDate: future(2),
      severity: 'HIGH',
      notes: 'Verified exit access',
      evidenceUrl: '',
    });
    check = await act('compliance', check, 'REVIEW');
    await expect(act('compliance', check, 'PASSED')).rejects.toThrow('different reviewer');
    check = await act('compliance', check, 'PASSED', qc);
    expect(check.reviewedBy).toBe(qc.id);
  });
  it('rejects stale simulated schedules and applies only a current plan', async () => {
    let scenario = await create('scenarios', {
      name: 'Next week',
      startDate: future(1),
      days: 3,
      efficiency: 80,
      overtimeMinutes: 0,
      operatorsOverride: 0,
    });
    scenario = await act('scenarios', scenario, 'SIMULATED');
    expect(scenario.result.plannedPcs).toBe(610);
    const second = await db.line.findFirstOrThrow({ where: { factoryId, id: { not: lineId } } });
    await create('allocations', { lineId: second.id, orderId, date: future(1), target: 1 });
    await expect(act('scenarios', scenario, 'APPLIED')).rejects.toThrow('changed');
    scenario = await act('scenarios', scenario, 'SIMULATED');
    scenario = await act('scenarios', scenario, 'APPLIED');
    expect(scenario.status).toBe('APPLIED');
  });
  it('imports master data atomically on duplicate failure', async () => {
    await expect(
      advanced.importMasters(admin, 'buyers', [
        { name: 'Imported', code: 'IMPORT-NEW', email: '' },
        { name: 'Duplicate', code: 'A', email: '' },
      ]),
    ).rejects.toThrow();
    expect(await db.buyer.count({ where: { factoryId, code: 'IMPORT-NEW' } })).toBe(0);
    await expect(advanced.importMasters(qc, 'buyers', [])).rejects.toThrow('administrators');
  });
});
