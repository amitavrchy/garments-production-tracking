import 'dotenv/config';
import {PrismaService} from '../src/prisma.service';
import {dhakaDate} from '../src/domain/math';
const db=new PrismaService();
async function main(){
  const factoryId='factory-loom',factory=await db.factory.findUnique({where:{id:factoryId}});
  if(!factory){console.log('No sample factory; advanced demo seed skipped.');return;}
  if(await db.supplier.findFirst({where:{factoryId,code:'DEMO-TEXTILE'}})){console.log('Advanced demo records already exist; seed skipped.');return;}
  const user=await db.user.findFirstOrThrow({where:{factoryId,role:'FACTORY_ADMIN'}}),date=dhakaDate();
  const future=(n:number)=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const common={factoryId,createdBy:user.id};
  await db.$transaction(async tx=>{
    await tx.supplier.createMany({data:[{...common,id:'supplier-demo-1',code:'DEMO-TEXTILE',name:'Meghna Textile Mills',email:'orders@example.com',country:'Bangladesh',paymentTerms:'Net 30'},{...common,id:'supplier-demo-2',code:'DEMO-TRIM',name:'Delta Trims & Sourcing',email:'sourcing@example.com',country:'Bangladesh',paymentTerms:'Net 45'}]});
    for(const [i,bomItemId,qty,unitCostMinor]of [[1,'bom-1',2310,45000],[2,'bom-2',10200,125]] as const)await tx.purchaseOrder.create({data:{...common,id:`purchase-demo-${i}`,number:`MPO-DEMO-00${i}`,supplierId:`supplier-demo-${i}`,orderId:'order-1',bomItemId,qty,unitCostMinor,currency:'BDT',exchangeRate:1,dueDate:future(3),status:'APPROVED',approvedBy:'user-accounts'}});
    await tx.materialLot.create({data:{...common,id:'lot-demo-1',lotNo:'ROLL-DEMO-001',supplierId:'supplier-demo-1',orderId:'order-1',bomItemId:'bom-1',warehouse:'Fabric warehouse',bin:'A-03-02',shade:'Navy · Shade A',gsm:180,widthCm:160,qty:600,testResult:'PASS'}});
    await tx.materialMovement.create({data:{factoryId,orderId:'order-1',bomItemId:'bom-1',kind:'RECEIVE',qty:600,reference:'LOT:ROLL-DEMO-001',date}});
    await tx.bundle.create({data:{...common,id:'bundle-demo-1',code:'BDL-2026-0001',cuttingId:(await tx.cuttingRecord.findFirstOrThrow({where:{orderId:'order-1',status:'COMPLETED'}})).id,lineId:'line-1',qty:25,status:'QC'}});
    for(const stage of ['CREATED','SEWING','QC'])await tx.bundleEvent.create({data:{factoryId,bundleId:'bundle-demo-1',stage,actorId:user.id}});
    await tx.downtime.createMany({data:[{...common,lineId:'line-1',machineId:'machine-1',date,minutes:22,category:'CHANGEOVER',reason:'Style change and needle alignment'},{...common,lineId:'line-2',machineId:'machine-2',date,minutes:15,category:'MATERIAL',reason:'Bundle replenishment delay'}]});
    await tx.maintenance.create({data:{...common,machineId:'machine-4',title:'Preventive needle-bar alignment',kind:'PREVENTIVE',priority:'NORMAL',assignedTo:user.id,dueDate:future(2),spareCostMinor:0,resolution:'',status:'OPEN'}});
    await tx.machine.update({where:{id:'machine-4'},data:{status:'MAINTENANCE'}});
    for(let i=1;i<=12;i++){
      const present=i<=10;
      await tx.attendance.create({data:{...common,workerId:`worker-${i}`,date,clockIn:480,clockOut:i===1?1080:1020,breakMinutes:60,status:present?'PRESENT':i===11?'ABSENT':'LEAVE',workedMinutes:present?(i===1?540:480):0,overtimeMinutes:i===1?60:0}});
      await tx.workerSkill.create({data:{...common,workerId:`worker-${i}`,operationId:`op-${(i-1)%3+1}`,level:3+i%3,efficiency:75+i*2,trainedDate:future(-30),validUntil:future(i===12?-1:90)}});
    }
    for(const [i,operators]of [[1,8],[2,10],[3,14]] as const)await tx.stationPlan.create({data:{...common,lineId:'line-1',operationId:`op-${i}`,date,operators}});
    await tx.qualityAudit.create({data:{...common,id:'audit-demo-1',orderId:'order-1',lineId:'line-1',name:'Final sampling · PO-2026-001',lotSize:500,sampleSize:80,criticalCount:0,majorCount:3,minorCount:2,acceptMajor:2,acceptMinor:5,date,status:'FAILED'}});
    await tx.correctiveAction.create({data:{...common,auditId:'audit-demo-1',title:'Eliminate sleeve seam puckering',rootCause:'Needle tension varies at shift handover',containment:'Segregate the affected bundle',corrective:'Recalibrate tension and rework affected seams',preventive:'Add a first-off check to every shift handover',ownerId:'user-qc',dueDate:future(2),status:'IN_PROGRESS'}});
    await tx.costSheet.create({data:{...common,orderId:'order-1',name:'November cost revision',laborMinuteMinor:25,overheadMinor:400,packingMinor:150,freightMinor:200,sellingMinor:18000}});
    await tx.complianceCheck.create({data:{...common,title:'Fire exit clearance · sewing floor',category:'FIRE_SAFETY',ownerId:user.id,dueDate:future(7),severity:'CRITICAL',notes:'Document exit access checks and evacuation drill records.',evidenceUrl:'',status:'OPEN'}});
    await tx.capacityScenario.create({data:{...common,name:'Balanced capacity · next 7 days',startDate:future(1),days:7,efficiency:80,overtimeMinutes:0,operatorsOverride:0}});
    await tx.subcontract.create({data:{...common,supplierId:'supplier-demo-2',orderId:'order-2',color:'Navy',size:'M',qty:100,receivedQty:0,sentDate:date,dueDate:future(4)}});
    await tx.sustainabilityRecord.create({data:{...common,orderId:'order-1',date,energyKwh:110.2,waterLiters:210,scrapKg:8.1,recycledKg:6,co2Factor:.7,notes:'Illustrative meter readings for the sample factory.'}});
    await tx.auditLog.create({data:{factoryId,actorId:user.id,resource:'factory',recordId:factoryId,action:'SEED_ADVANCED',after:{sample:true,modules:17}}});
  },{timeout:30000});
  console.log('Advanced sample workflows seeded. Supplier identities and measurements are illustrative demo data.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
