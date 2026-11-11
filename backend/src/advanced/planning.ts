import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {Actor} from '../auth/permissions';
import {Row,requireThat} from '../domain/context';
import {balances} from '../domain/balance';
import {sum} from '../domain/math';
export function buildSchedule(input:{orders:Row[];lines:Row[];styles:Row[];allocations:Row[];remaining:Record<string,number>},scenario:Row){
  const remaining={...input.remaining},plan:Row[]=[];
  const orders=[...input.orders].sort((a,b)=>a.deliveryDate.localeCompare(b.deliveryDate)||a.poNumber.localeCompare(b.poNumber));
  const reserved=new Set(input.allocations.map(a=>`${a.lineId}:${a.date}`));
  const minutes=Number(process.env.DEFAULT_SHIFT_MINUTES||480)+scenario.overtimeMinutes;
  for(let day=0;day<scenario.days;day++){
    const date=new Date(`${scenario.startDate}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+day);const dateText=date.toISOString().slice(0,10);
    for(const line of input.lines){
      if(reserved.has(`${line.id}:${dateText}`))continue;
      const order=orders.find(o=>(remaining[o.id]||0)>0);if(!order)break;
      const style=input.styles.find(s=>s.id===order.styleId);if(!style?.smv)continue;
      const operators=scenario.operatorsOverride||line.targetManpower;
      const capacity=Math.floor(operators*minutes*scenario.efficiency/100/style.smv);
      const target=Math.min(capacity,remaining[order.id]);if(target<=0)continue;
      plan.push({lineId:line.id,line:line.code,orderId:order.id,poNumber:order.poNumber,date:dateText,target,capacity,operators,late:dateText>order.deliveryDate});remaining[order.id]-=target;
    }
  }
  return {plan,unplanned:orders.filter(o=>remaining[o.id]>0).map(o=>({orderId:o.id,poNumber:o.poNumber,qty:remaining[o.id]})),plannedPcs:sum(plan,p=>p.target),latePcs:sum(plan.filter(p=>p.late),p=>p.target),utilization:plan.length?sum(plan,p=>p.target)/sum(plan,p=>p.capacity)*100:0};
}
export async function simulate(tx:Prisma.TransactionClient,actor:Actor,scenario:Row){
  const where={factoryId:actor.factoryId};
  const [orders,lines,styles,allocations,wip]=await Promise.all([tx.buyerOrder.findMany({where:{...where,status:{in:['CONFIRMED','IN_PRODUCTION']}}}),tx.line.findMany({where,orderBy:{code:'asc'}}),tx.style.findMany({where}),tx.allocation.findMany({where:{...where,date:{gte:scenario.startDate}}}),balances(tx,actor)]);
  requireThat(lines.length>0,'Create production lines before simulating');
  const remaining=Object.fromEntries(orders.map(o=>[o.id,Math.max(0,sum(wip.filter(b=>b.orderId===o.id),b=>b.ordered-b.sewn)-sum(allocations.filter(a=>a.orderId===o.id),a=>a.target))]));
  const input={orders,lines,styles,allocations,remaining};
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return {...buildSchedule(input,scenario),fingerprint,generatedAt:new Date().toISOString()};
}
export function stationBalance(operations:Row[],stations:Row[],target:number,minutes:number,efficiency:number){
  return operations.map(op=>{
    const operators=sum(stations.filter(s=>s.operationId===op.id),s=>s.operators);
    const recommended=Math.ceil(target*op.smv/(minutes*efficiency/100));
    const capacity=Math.floor(operators*minutes*efficiency/100/op.smv);
    return {...op,operators,recommended,capacity,gap:Math.max(0,target-capacity),load:operators?target*op.smv/(operators*minutes)*100:0};
  });
}
