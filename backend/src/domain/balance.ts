import { Prisma } from '@prisma/client';
import { Actor } from '../auth/permissions';
import { requireThat } from './context';
import { sum } from './math';

export async function balances(tx: Prisma.TransactionClient, actor: Actor, orderId?: string) {
  const where = {factoryId:actor.factoryId,...(orderId?{orderId}:{})};
  const [quantities,cutting,production,qc,finishing,cartons,shipments] = await Promise.all([
    tx.orderQuantity.findMany({where}),tx.cuttingRecord.findMany({where:{...where,status:'COMPLETED'}}),
    tx.hourlyProduction.findMany({where}),tx.qcInspection.findMany({where}),tx.finishingRecord.findMany({where}),
    tx.packingCarton.findMany({where}),tx.shipment.findMany({where}),
  ]);
  const detailed=production.flatMap(p=>Array.isArray(p.breakdown)?(p.breakdown as {color:string;size:string;inputPcs:number;producedPcs:number}[]).map(b=>({...p,...b})):[p]);
  const dispatched = new Set(shipments.filter(s=>['DISPATCHED','DELIVERED'].includes(s.status)).map(s=>s.id));
  return quantities.map(q=>{
    const match = (r: {orderId:string;color:string;size:string})=>r.orderId===q.orderId&&r.color===q.color&&r.size===q.size;
    const cut = sum(cutting.filter(match),r=>r.qty);
    const input = sum(detailed.filter(match),r=>r.inputPcs);
    const sewn = sum(detailed.filter(match),r=>r.producedPcs);
    const rejected = sum(qc.filter(match),r=>r.rejectedPcs);
    const rework = sum(qc.filter(match),r=>r.reworkPcs-r.resolvedPcs);
    const inspected = sum(qc.filter(match),r=>r.inspectedPcs);
    const finished = sum(finishing.filter(match),r=>r.qty);
    const packed = sum(cartons.filter(match),r=>r.pcs);
    const shipped = sum(cartons.filter(r=>match(r)&&dispatched.has(r.shipmentId)),r=>r.pcs);
    return {...q,ordered:q.qty,cut,input,sewn,rejected,rework,inspected,finished,packed,shipped,wip:cut-sewn};
  });
}
export async function validateBalances(tx: Prisma.TransactionClient, actor: Actor) {
  const warnings:string[]=[];
  const strict=process.env.STRICT_WIP!=='false';
  const over=Number(process.env.CUT_OVER_PERCENT_BPS||300)/10000;
  for(const b of await balances(tx,actor)) {
    const label=`${b.color} / ${b.size}`;
    const soft=(ok:boolean,message:string)=>{if(!ok){if(strict) requireThat(false,`${label}: ${message}`); warnings.push(`${label}: ${message}`);}};
    soft(b.cut<=Math.floor(b.ordered*(1+over)),'Cut quantity exceeds allowed order tolerance');
    soft(b.input<=b.cut,'Sewing input exceeds completed cutting');
    soft(b.sewn<=b.input,'Sewing output exceeds input');
    requireThat(b.inspected<=b.sewn,`${label}: Inspected pieces exceed sewn output`);
    requireThat(b.rejected+b.rework<=b.sewn,`${label}: Reject and rework exceed sewn output`);
    requireThat(b.finished<=b.sewn-b.rejected-b.rework,`${label}: Finishing exceeds good sewn output (resolve rework first)`);
    requireThat(b.packed<=b.finished,`${label}: Packing exceeds finished pieces`);
    requireThat(b.shipped<=b.packed,`${label}: Shipment exceeds packed pieces`);
  }
  return warnings;
}
