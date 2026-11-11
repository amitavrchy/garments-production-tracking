import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { dhakaDate } from '../src/domain/math';
const db=new PrismaClient();
async function seed(){
  if(await db.factory.count()){console.log('Database already contains a factory; seed skipped.');return;}
  const password=process.env.SEED_ADMIN_PASSWORD;
  if(!password||password.length<10)throw new Error('Set SEED_ADMIN_PASSWORD (10+ characters)');
  const passwordHash=await hash(password,12),date=dhakaDate();
  const future=(days:number)=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  await db.$transaction(async tx=>{
    const factoryId='factory-loom';
    await tx.factory.create({data:{id:factoryId,name:'Loom Apparel Ltd.'}});
    await tx.floor.create({data:{id:'floor-1',factoryId,name:'Sewing floor · Unit 01'}});
    for(let i=1;i<=4;i++) {
      await tx.line.create({data:{id:`line-${i}`,factoryId,floorId:'floor-1',code:`Line 0${i}`,targetManpower:30+i*2}});
      await tx.machine.create({data:{id:`machine-${i}`,factoryId,lineId:`line-${i}`,code:`SNLS-00${i}`,type:'Single needle lockstitch'}});
    }
    await tx.user.createMany({data:[
      {id:'user-admin',factoryId,email:process.env.SEED_ADMIN_EMAIL||'admin@loom.local',name:'Amitav Roy Chowdhury',role:'FACTORY_ADMIN',passwordHash,lineIds:[]},
      {id:'user-accounts',factoryId,email:'accounts@loom.local',name:'Nadia Rahman',role:'ACCOUNTS',passwordHash,lineIds:[]},
      {id:'user-supervisor',factoryId,email:'supervisor@loom.local',name:'Hasan Ahmed',role:'SUPERVISOR',passwordHash,lineIds:['line-1']},
      {id:'user-qc',factoryId,email:'qc@loom.local',name:'Farzana Islam',role:'QC',passwordHash,lineIds:[]},
    ]});
    const buyers=[['buyer-1','H&M','HM'],['buyer-2','Zara','ZARA'],['buyer-3','Primark','PRM']];
    for(const [id,name,code]of buyers)await tx.buyer.create({data:{id,factoryId,name,code}});
    await tx.style.create({data:{id:'style-1',factoryId,code:'ST-2401',name:'Essential cotton tee',smv:12,status:'ACTIVE'}});
    await tx.bomItem.createMany({data:[
      {id:'bom-1',factoryId,styleId:'style-1',itemType:'FABRIC',description:'180 GSM organic cotton jersey',consumptionPerPc:0.22,wastageBps:500,uom:'kg'},
      {id:'bom-2',factoryId,styleId:'style-1',itemType:'TRIM',description:'Woven care label',consumptionPerPc:1,wastageBps:200,uom:'pcs'},
    ]});
    for(const [i,name,smv,rate]of [[1,'Shoulder join',3,180],[2,'Sleeve attach',4,250],[3,'Side seam & hem',5,320]] as const)
      await tx.operation.create({data:{id:`op-${i}`,factoryId,styleId:'style-1',seq:i,name,smv,pieceRateMinor:rate,machineType:'SNLS'}});
    for(let i=1;i<=3;i++) {
      const orderId=`order-${i}`;
      await tx.buyerOrder.create({data:{id:orderId,factoryId,buyerId:`buyer-${i}`,styleId:'style-1',poNumber:`PO-2026-00${i}`,status:'IN_PRODUCTION',deliveryDate:future(i===1?5:i*8)}});
      for(const size of ['S','M','L','XL'])await tx.orderQuantity.create({data:{factoryId,orderId,color:'Navy',size,qty:2500}});
      for(const [bomItemId,qty]of [['bom-1',2310],['bom-2',10200]] as const)for(const kind of ['RECEIVE','ISSUE'])await tx.materialMovement.create({data:{factoryId,orderId,bomItemId,qty,kind,reference:`MR-${i}-${bomItemId}-${kind}`,date}});
      await tx.cuttingRecord.create({data:{factoryId,orderId,color:'Navy',size:'M',qty:2400,layNumber:`LAY-00${i}`,date,status:'COMPLETED'}});
      await tx.milestone.create({data:{factoryId,orderId,name:'Pre-shipment inspection',dueDate:future(i*5),completed:false}});
      await tx.shipment.create({data:{id:`shipment-${i}`,factoryId,orderId,invoiceNo:`INV-2026-00${i}`,destination:['Hamburg, Germany','Barcelona, Spain','Dublin, Ireland'][i-1],deliveryDate:future(i*8)}});
    }
    for(let line=1;line<=4;line++) {
      const orderId=`order-${Math.min(line,3)}`;
      await tx.allocation.create({data:{factoryId,lineId:`line-${line}`,orderId,date,target:1800+line*100}});
      for(let hour=8;hour<=12;hour++) {
        const producedPcs=140+line*8+(hour-8)*7;
        await tx.hourlyProduction.create({data:{factoryId,lineId:`line-${line}`,orderId,color:'Navy',size:'M',date,hourStart:hour,producedPcs,inputPcs:producedPcs,operators:30+line*2,availableMinutes:60,enteredBy:'user-admin'}});
      }
      await tx.qcInspection.create({data:{factoryId,orderId,lineId:`line-${line}`,color:'Navy',size:'M',date,inspectedPcs:300,defectCode:'STITCH',defectCount:4+line,reworkPcs:2,rejectedPcs:1}});
    }
    for(let i=1;i<=12;i++) {
      const workerId=`worker-${i}`,lineId=`line-${Math.ceil(i/3)}`;
      await tx.worker.create({data:{id:workerId,factoryId,employeeCode:`EMP-${String(i).padStart(3,'0')}`,name:['Fatema Begum','Rafiq Islam','Mousumi Akter','Arif Hossain','Ruma Khatun','Shakil Ahmed','Nasima Begum','Jahid Hasan','Salma Akter','Rakib Islam','Shirin Akter','Kamal Hossain'][i-1],skillGrade:i%3===0?'A':'B'}});
      await tx.lineAssignment.create({data:{factoryId,workerId,lineId,date,hours:8}});
      await tx.pieceRateEntry.create({data:{factoryId,workerId,orderId:'order-1',operationId:'op-1',date,pcs:180+i*3,rateMinor:180,amountMinor:(180+i*3)*180}});
    }
    await tx.finishingRecord.create({data:{factoryId,orderId:'order-1',color:'Navy',size:'M',qty:600,date}});
    await tx.packingCarton.create({data:{factoryId,shipmentId:'shipment-1',orderId:'order-1',cartonNo:'CTN-001',color:'Navy',size:'M',pcs:50}});
    await tx.payrollRun.create({data:{factoryId,name:'November · Week 02',periodStart:date,periodEnd:future(6)}});
  },{timeout:30000});
  console.log('Seeded Loom Apparel: 4 lines, 3 orders, 12 workers. Sign in with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.');
}
seed().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
