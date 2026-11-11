import { Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { Actor, scopedLineRoles } from '../auth/permissions';
import { delegate, record, requireThat, Row } from './context';
import { Resource } from './schemas';
export const references: Partial<Record<Resource, Record<string, Resource>>> = {
  lines:{floorId:'floors'}, machines:{lineId:'lines'}, bom:{styleId:'styles'},operations:{styleId:'styles'},
  orders:{buyerId:'buyers',styleId:'styles'},quantities:{orderId:'orders'},milestones:{orderId:'orders'},
  assignments:{lineId:'lines',workerId:'workers'},allocations:{lineId:'lines',orderId:'orders'},
  materials:{bomItemId:'bom',orderId:'orders'},cutting:{orderId:'orders'},
  production:{lineId:'lines',orderId:'orders'},qc:{lineId:'lines',orderId:'orders'},
  finishing:{orderId:'orders'},shipments:{orderId:'orders'},cartons:{shipmentId:'shipments',orderId:'orders'},
  pieceEntries:{workerId:'workers',operationId:'operations',orderId:'orders'},
};
export async function checkReferences(tx: Prisma.TransactionClient, actor: Actor, resource: Resource, data: Row) {
  for(const [field,target] of Object.entries(references[resource] || {})) if(data[field]) await record(tx,actor,target,data[field]);
  if(data.lineId && scopedLineRoles.includes(actor.role) && !actor.lineIds.includes(data.lineId)) throw new ForbiddenException('You can only enter data for your assigned lines');
  if(resource==='users') for(const line of data.lineIds || []) await record(tx,actor,'lines',line);
  if(data.orderId) {
    const order = await record(tx,actor,'orders',data.orderId);
    if(!['quantities','milestones','shipments'].includes(resource)) requireThat(!['DRAFT','CANCELLED','CLOSED','SHIPPED'].includes(order.status), 'Order must be confirmed and open for production');
    if(data.color && data.size) requireThat(await tx.orderQuantity.findFirst({where:{orderId:order.id,color:data.color,size:data.size}}), 'Color and size must match the order breakdown');
    if(resource==='materials') requireThat((await record(tx,actor,'bom',data.bomItemId)).styleId===order.styleId,'Material must belong to the order style');
    if(resource==='pieceEntries') requireThat((await record(tx,actor,'operations',data.operationId)).styleId===order.styleId,'Operation must belong to the order style');
    if(resource==='cartons') {
      const shipment=await record(tx,actor,'shipments',data.shipmentId);
      requireThat(shipment.orderId===order.id,'Carton order must match shipment');
      requireThat(shipment.status==='PLANNED','Cartons are locked after shipment packing');
    }
    if(resource==='production') requireThat(await tx.allocation.findFirst({where:{lineId:data.lineId,orderId:data.orderId,date:data.date}}),'Allocate this order to the line and date before entering production');
  }
}
export async function checkDelete(tx:Prisma.TransactionClient,actor:Actor,resource:Resource,id:string) {
  for(const [source,fields] of Object.entries(references)) for(const [field,target] of Object.entries(fields)) if(target===resource) {
    requireThat(!await delegate(tx,source as Resource).findFirst({where:{factoryId:actor.factoryId,[field]:id}}),`This record is used by ${source}. Remove dependent records first.`);
  }
}
