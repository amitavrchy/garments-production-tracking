import {Inject,Injectable,ForbiddenException} from '@nestjs/common';
import {PrismaService} from '../prisma.service';
import {ReportsService} from '../reports.service';
import {Actor} from '../auth/permissions';
import {dhakaDate,sum} from '../domain/math';
import {record,requireThat,audit,Row} from '../domain/context';
import {stationBalance} from './planning';
import {schemas,Resource} from '../domain/schemas';
@Injectable()
export class AdvancedService{
  constructor(@Inject(PrismaService)private db:PrismaService,@Inject(ReportsService)private reports:ReportsService){}
  directory(actor:Actor){return this.db.user.findMany({where:{factoryId:actor.factoryId,active:true},select:{id:true,name:true,role:true}});}
  async insights(actor:Actor,date=dhakaDate()){
    const where={factoryId:actor.factoryId};
    const [base,lots,purchases,downtime,maintenance,attendance,skills,audits,capa,compliance,impact,bundles,costing,scenarios]=await Promise.all([
      this.reports.overview(actor,date),this.db.materialLot.findMany({where}),this.db.purchaseOrder.findMany({where}),this.db.downtime.findMany({where:{...where,date}}),this.db.maintenance.findMany({where}),this.db.attendance.findMany({where:{...where,date}}),this.db.workerSkill.findMany({where}),this.db.qualityAudit.findMany({where}),this.db.correctiveAction.findMany({where}),this.db.complianceCheck.findMany({where}),this.db.sustainabilityRecord.findMany({where:{...where,date}}),this.db.bundle.findMany({where}),this.db.costSheet.findMany({where:{...where,status:{in:['CALCULATED','APPROVED']}}}),this.db.capacityScenario.findMany({where}),
    ]);
    const shift=Number(process.env.DEFAULT_SHIFT_MINUTES||480);
    const equipment=base.lines.map(line=>{
      const stops=downtime.filter(d=>d.lineId===line.id),lost=Math.min(shift,sum(stops,d=>d.minutes));
      const availability=(shift-lost)/shift*100,performance=Math.min(100,line.efficiency),quality=Math.max(0,100-line.dhu);
      return {...line,downtime:lost,availability,performance,quality,oee:availability*performance*quality/10000};
    });
    // Performance is estimated from SMV efficiency; quality below is based on rejected pieces, never DHU.
    const rejected=sum(base.wip,b=>b.rejected),sewn=sum(base.wip,b=>b.sewn);
    const qualityYield=sewn?Math.max(0,(sewn-rejected)/sewn*100):100;
    equipment.forEach(line=>{line.quality=qualityYield;line.oee=line.availability*line.performance*qualityYield/10000;});
    const finance=['FACTORY_ADMIN','ACCOUNTS','MERCHANDISER'].includes(actor.role);
    const reasons=Object.entries(downtime.reduce((out:Record<string,number>,d)=>({...out,[d.category]:(out[d.category]||0)+d.minutes}),{})).map(([reason,minutes])=>({reason,minutes})).sort((a,b)=>b.minutes-a.minutes);
    return {date,equipment,reasons,oee:equipment.length?sum(equipment,e=>e.oee)/equipment.length:0,stock:{lots:lots.length,held:lots.filter(l=>l.testResult!=='PASS').length,remaining:sum(lots,l=>l.qty-l.issuedQty),byWarehouse:Object.entries(lots.reduce((out:Record<string,number>,l)=>({...out,[l.warehouse]:(out[l.warehouse]||0)+1}),{})).map(([name,count])=>({name,count}))},procurement:{pending:purchases.filter(p=>p.status==='SUBMITTED').length,late:purchases.filter(p=>!['RECEIVED','REJECTED'].includes(p.status)&&p.dueDate<date).length,committedMinor:finance?sum(purchases.filter(p=>['APPROVED','RECEIVED'].includes(p.status)),p=>Math.round(p.qty*p.unitCostMinor*p.exchangeRate)):null},maintenance:{open:maintenance.filter(m=>m.status!=='COMPLETED').length,overdue:maintenance.filter(m=>m.status!=='COMPLETED'&&m.dueDate<date).length},workforce:{present:attendance.filter(a=>a.status==='PRESENT').length,absent:attendance.filter(a=>a.status==='ABSENT').length,overtimeMinutes:sum(attendance,a=>a.overtimeMinutes),expiredSkills:skills.filter(s=>s.validUntil<date).length},quality:{passed:audits.filter(a=>a.status==='PASSED').length,failed:audits.filter(a=>a.status==='FAILED').length,openCapa:capa.filter(c=>c.status!=='CLOSED').length,overdueCapa:capa.filter(c=>c.status!=='CLOSED'&&c.dueDate<date).length},compliance:{open:compliance.filter(c=>c.status!=='PASSED').length,critical:compliance.filter(c=>c.status!=='PASSED'&&c.severity==='CRITICAL').length},traceability:{bundles:bundles.length,pieces:sum(bundles,b=>b.qty),held:bundles.filter(b=>b.status==='HOLD').length},costing:finance?{sheets:costing.length,averageMargin:costing.length?sum(costing,c=>c.marginPercent)/costing.length:0}:null,planning:{scenarios:scenarios.length,applied:scenarios.filter(s=>s.status==='APPLIED').length},impact:{energyKwh:sum(impact,r=>r.energyKwh),waterLiters:sum(impact,r=>r.waterLiters),scrapKg:sum(impact,r=>r.scrapKg),recycledKg:sum(impact,r=>r.recycledKg),estimatedCo2Kg:sum(impact,r=>r.energyKwh*r.co2Factor)}};
  }
  async balance(actor:Actor,lineId:string,date:string){
    const line=await record(this.db,actor,'lines',lineId);
    const allocation=await this.db.allocation.findUnique({where:{lineId_date:{lineId,date}}});
    if(!allocation)return {line,allocation:null,operations:[],recommendations:[]};
    const order=await record(this.db,actor,'orders',allocation.orderId);
    const [ops,stations,skills,workers,assignments]=await Promise.all([this.db.operation.findMany({where:{styleId:order.styleId},orderBy:{seq:'asc'}}),this.db.stationPlan.findMany({where:{lineId,date}}),this.db.workerSkill.findMany({where:{factoryId:actor.factoryId,validUntil:{gte:date}}}),this.db.worker.findMany({where:{factoryId:actor.factoryId}}),this.db.lineAssignment.findMany({where:{factoryId:actor.factoryId,date}})]);
    const balanced=stationBalance(ops,stations,allocation.target,Number(process.env.DEFAULT_SHIFT_MINUTES||480),80);
    const recommendations=ops.map(op=>({operationId:op.id,operation:op.name,workers:skills.filter(s=>s.operationId===op.id&&s.level>=3).filter(s=>!assignments.some(a=>a.workerId===s.workerId&&a.lineId!==lineId&&a.hours>=8)).sort((a,b)=>b.efficiency-a.efficiency).map(s=>({workerId:s.workerId,name:workers.find(w=>w.id===s.workerId)?.name,level:s.level,efficiency:s.efficiency}))}));
    return {line,allocation,order,operations:balanced,recommendations,bottleneck:balanced.length?Math.min(...balanced.map(o=>o.capacity)):0};
  }
  async trace(actor:Actor,code:string){
    const bundle=await this.db.bundle.findFirst({where:{factoryId:actor.factoryId,OR:[{code},{id:code}]}});requireThat(bundle,'Bundle not found in your factory');
    const cut=await record(this.db,actor,'cutting',bundle.cuttingId),order=await record(this.db,actor,'orders',cut.orderId),style=await record(this.db,actor,'styles',order.styleId);
    const events=await this.db.bundleEvent.findMany({where:{bundleId:bundle.id},orderBy:{at:'asc'}});
    return {bundle,cut,order,style,events};
  }
  async search(actor:Actor,q:string){
    if(q.trim().length<2)return [];
    const where={factoryId:actor.factoryId},contains={contains:q.slice(0,80),mode:'insensitive' as const};
    const [orders,styles,workers,bundles]=await Promise.all([this.db.buyerOrder.findMany({where:{...where,poNumber:contains},take:5}),this.db.style.findMany({where:{...where,OR:[{code:contains},{name:contains}]},take:5}),this.db.worker.findMany({where:{...where,OR:[{name:contains},{employeeCode:contains}]},take:5}),this.db.bundle.findMany({where:{...where,code:contains},take:5})]);
    return [...orders.map(o=>({id:o.id,title:o.poNumber,kind:'Purchase order',href:`/orders?q=${encodeURIComponent(o.poNumber)}`})),...styles.map(s=>({id:s.id,title:`${s.code} · ${s.name}`,kind:'Style',href:`/styles?q=${encodeURIComponent(s.code)}`})),...workers.map(w=>({id:w.id,title:`${w.employeeCode} · ${w.name}`,kind:'Worker',href:`/team?q=${encodeURIComponent(w.employeeCode)}`})),...bundles.map(b=>({id:b.id,title:b.code,kind:'Bundle',href:`/traceability?code=${encodeURIComponent(b.code)}`}))];
  }
  async importMasters(actor:Actor,resource:string,rows:unknown[]){
    if(actor.role!=='FACTORY_ADMIN')throw new ForbiddenException('Only administrators can import master data');
    requireThat(['buyers','workers','suppliers'].includes(resource),'Only buyers, workers and suppliers support master import');
    requireThat(Array.isArray(rows)&&rows.length>0&&rows.length<=500,'Import between 1 and 500 rows');
    const parsed=rows.map((row,i)=>{const p=schemas[resource as Resource].safeParse(row);requireThat(p.success,`Row ${i+1}: ${p.success?'':p.error.issues.map(e=>e.message).join(', ')}`);return p.data;});
    return this.db.atomic(actor.factoryId,async tx=>{
      const model=resource==='buyers'?tx.buyer:resource==='workers'?tx.worker:tx.supplier;
      for(const data of parsed){const row=await (model as any).create({data:{...data,factoryId:actor.factoryId,...(resource==='suppliers'?{createdBy:actor.id}:{})}});await audit(tx,actor,resource,row.id,'IMPORT',null,row);}
      return {imported:parsed.length};
    });
  }
}
