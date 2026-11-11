import 'reflect-metadata';
import 'dotenv/config';
import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {PrismaService} from '../src/prisma.service';
import {DomainService} from '../src/domain/domain.service';
import {ReportsService} from '../src/reports.service';
import {LiveGateway} from '../src/live.gateway';
import {Actor} from '../src/auth/permissions';
import {splitByRatio} from '../src/domain/ratios';
const run=process.env.RUN_DB_TESTS==='true'?describe:describe.skip;
describe('ratio allocation',()=>{
  it('reconciles both totals for uneven size ratios',()=>{const rows=splitByRatio([{color:'Black',size:'S',qty:1},{color:'Black',size:'M',qty:2},{color:'Black',size:'L',qty:3}],101,97);expect(rows.reduce((n,r)=>n+r.inputPcs,0)).toBe(101);expect(rows.reduce((n,r)=>n+r.producedPcs,0)).toBe(97);});
});
run('PostgreSQL acceptance workflows',()=>{
  const db=new PrismaService(),service=new DomainService(db,{changed:()=>{}} as unknown as LiveGateway),reports=new ReportsService(db);
  const factoryId=`test-${Date.now()}`,date='2026-11-11';
  let actor:Actor,orderId:string,lineId:string,styleId:string,bomId:string,opId:string,workerId:string,shipmentId:string,cutId:string;
  const make=async(resource:string,body:Record<string,unknown>)=>(await service.write(actor,service.resource(resource),body)).record;
  const variant=()=>({orderId,color:'Navy',size:'M'});
  beforeAll(async()=>{
    await db.$connect();process.env.STRICT_WIP='true';
    await db.factory.create({data:{id:factoryId,name:'Acceptance test factory'}});
    const admin=await db.user.create({data:{factoryId,email:`${factoryId}@test.local`,name:'Test admin',passwordHash:'not-a-login-hash',role:'FACTORY_ADMIN'}});
    actor={id:admin.id,factoryId,role:'FACTORY_ADMIN',name:'Test admin',email:admin.email,lineIds:[]};
    const floor=await make('floors',{name:'Floor A'});
    lineId=(await make('lines',{floorId:floor.id,code:'A-1',targetManpower:20})).id;
    const buyer=await make('buyers',{name:'Test buyer',code:'TEST',email:''});
    styleId=(await make('styles',{code:'TEE',name:'Test tee',smv:12})).id;
    bomId=(await make('bom',{styleId,itemType:'FABRIC',description:'Cotton jersey',consumptionPerPc:.2,wastageBps:500,uom:'kg'})).id;
    opId=(await make('operations',{styleId,seq:1,name:'Sew',smv:12,pieceRateMinor:175,machineType:'SNLS'})).id;
    for(const status of ['BOM_READY','BULLETIN_READY','ACTIVE'])await service.action(actor,'styles',styleId,{status});
    orderId=(await make('orders',{buyerId:buyer.id,styleId,poNumber:'PO-TEST',deliveryDate:'2026-12-01'})).id;
    await make('quantities',{...variant(),qty:1000});
    await service.action(actor,'orders',orderId,{status:'CONFIRMED'});
    await service.action(actor,'orders',orderId,{status:'IN_PRODUCTION'});
    await make('allocations',{lineId,orderId,date,target:1000});
    cutId=(await make('cutting',{...variant(),qty:1000,layNumber:'LAY-TEST',date})).id;
    workerId=(await make('workers',{employeeCode:'W1',name:'Test Worker',skillGrade:'B'})).id;
    shipmentId=(await make('shipments',{orderId,invoiceNo:'INV-TEST',destination:'Dhaka',deliveryDate:'2026-12-01'})).id;
  },30000);
  afterAll(async()=>{
    // Only this suite's factory is removed, with children in dependency order.
    for(const model of ['auditLog','packingCarton','shipment','payrollRun','pieceRateEntry','finishingRecord','qcInspection','hourlyProduction','cuttingRecord','materialMovement','allocation','lineAssignment','orderQuantity','milestone','buyerOrder','bomItem','operation','style','buyer','worker','machine','line','floor','user'] as const)await (db[model] as any).deleteMany({where:{factoryId}});
    await db.factory.deleteMany({where:{id:factoryId}});await db.$disconnect();
  });
  it('blocks cutting release until BOM shortage is filled',async()=>{
    await expect(service.action(actor,'cutting',cutId,{status:'CUTTING'})).rejects.toThrow('BOM shortage');
    for(const kind of ['RECEIVE','ISSUE'])await make('materials',{bomItemId:bomId,orderId,kind,qty:210,reference:kind,date});
    await service.action(actor,'cutting',cutId,{status:'CUTTING'});await service.action(actor,'cutting',cutId,{status:'COMPLETED'});
  });
  it('rejects duplicate hour slots under parallel posts',async()=>{
    const body={...variant(),lineId,date,hourStart:8,producedPcs:200,inputPcs:200,operators:40,availableMinutes:60};
    const results=await Promise.allSettled([make('production',body),make('production',body)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  });
  it('hard blocks WIP overshoot and rolls back the entry',async()=>{
    await expect(make('production',{...variant(),lineId,date,hourStart:9,producedPcs:1000,inputPcs:1000,operators:40,availableMinutes:60})).rejects.toThrow('Sewing input exceeds');
    expect(await db.hourlyProduction.count({where:{factoryId}})).toBe(1);
  });
  it('reports exact efficiency and live DHU after QC post',async()=>{
    await make('qc',{...variant(),lineId,date,inspectedPcs:100,defectCode:'STITCH',defectCount:7,reworkPcs:5,rejectedPcs:2});
    const r=await reports.overview(actor,date);expect(r.efficiency).toBe(100);expect(r.dhu).toBeCloseTo(7);
  });
  it('excludes rejects and unresolved rework from finishing',async()=>{
    await expect(make('finishing',{...variant(),qty:199,date})).rejects.toThrow('Finishing exceeds');
    const qc=await db.qcInspection.findFirstOrThrow({where:{factoryId}});
    await service.action(actor,'qc',qc.id,{action:'resolve',pcs:5});await make('finishing',{...variant(),qty:198,date});
  });
  it('blocks packing beyond available good output',async()=>{
    await expect(make('cartons',{...variant(),shipmentId,cartonNo:'BAD',pcs:199})).rejects.toThrow('Packing exceeds');
    await make('cartons',{...variant(),shipmentId,cartonNo:'C1',pcs:198});
  });
  it('requires packed state and freezes cartons at dispatch',async()=>{
    await expect(service.action(actor,'shipments',shipmentId,{status:'DISPATCHED'})).rejects.toThrow('Cannot move');
    await service.action(actor,'shipments',shipmentId,{status:'PACKED'});await service.action(actor,'shipments',shipmentId,{status:'DISPATCHED'});
    await expect(make('cartons',{...variant(),shipmentId,cartonNo:'C2',pcs:1})).rejects.toThrow('Cartons are locked');
    const r=await reports.overview(actor,date);expect(r.wip[0].shipped).toBe(198);
  });
  it('reconciles integer earnings and enforces approval segregation',async()=>{
    const entry=await make('pieceEntries',{workerId,operationId:opId,orderId,date,pcs:123});expect(entry.rateMinor).toBe(175);expect(entry.amountMinor).toBe(21525);
    const payroll=await make('payroll',{name:'Test run',periodStart:date,periodEnd:date});
    const calculated=await service.action(actor,'payroll',payroll.id,{status:'CALCULATED'});expect(calculated.record.totalMinor).toBe(21525);
    await expect(service.action(actor,'payroll',payroll.id,{status:'APPROVED'})).rejects.toThrow('different accounts user');
    await expect(make('pieceEntries',{workerId,operationId:opId,orderId,date,pcs:1})).rejects.toThrow('period is locked');
    const approver=await db.user.create({data:{factoryId,name:'Approver',email:`approve-${factoryId}@test.local`,passwordHash:'unused',role:'ACCOUNTS'}});
    const accounts={...actor,id:approver.id,role:'ACCOUNTS' as const};
    await service.action(accounts,'payroll',payroll.id,{status:'APPROVED'});expect(await reports.payrollCsv(accounts,payroll.id)).toContain('215.25');
    await service.action(accounts,'payroll',payroll.id,{status:'EXPORTED'});
  });
  it('enforces role, line and tenant boundaries',async()=>{
    const body={...variant(),lineId,date,hourStart:10,producedPcs:1,inputPcs:1,operators:1,availableMinutes:60};
    await expect(service.write({...actor,role:'QC'},'production',body)).rejects.toThrow('Your role');
    await expect(service.write({...actor,role:'SUPERVISOR',lineIds:[]},'production',body)).rejects.toThrow('assigned lines');
    await expect(service.write({...actor,factoryId:'other'},'production',body)).rejects.toThrow('not found');
    expect(()=>service.resource('__proto__')).toThrow('Unknown resource');
  });
  it('audits hourly corrections without losing the old version',async()=>{
    const entry=await db.hourlyProduction.findFirstOrThrow({where:{factoryId}});
    await service.write(actor,'production',{...variant(),lineId,date,hourStart:8,producedPcs:200,inputPcs:201,operators:40,availableMinutes:60},entry.id);
    const logs=await db.auditLog.findMany({where:{factoryId,resource:'production',action:'UPDATE'}});expect(logs).toHaveLength(1);expect((logs[0].before as any).version).toBe(1);expect((logs[0].after as any).version).toBe(2);
  });
});
