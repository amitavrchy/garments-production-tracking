import { Injectable, Inject, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { Actor, allowed, scopedLineRoles } from '../auth/permissions';
import { schemas, Resource, models } from './schemas';
import { delegate, scope, record, requireThat, audit, Row } from './context';
import { checkReferences, checkDelete } from './relations';
import { validateBalances } from './balance';
import { validateMaterials } from './materials';
import { preparePieceEntry, validateAssignments } from './workforce';
import { transition } from './lifecycle';
import { LiveGateway } from '../live.gateway';

@Injectable()
export class DomainService {
  constructor(@Inject(PrismaService) readonly db:PrismaService,@Inject(LiveGateway) private live:LiveGateway) {}
  resource(value:string):Resource { if(!(value in models)) throw new BadRequestException('Unknown resource'); return value as Resource; }
  authorize(actor:Actor,resource:Resource) { if(!allowed(actor.role,resource)) throw new ForbiddenException('Your role cannot change this module'); }
  async list(actor:Actor,resource:Resource) {
    if(['payroll','pieceEntries'].includes(resource) && !['FACTORY_ADMIN','ACCOUNTS','IE'].includes(actor.role)) throw new ForbiddenException('Payroll data is restricted');
    if(resource==='users' && actor.role!=='FACTORY_ADMIN') throw new ForbiddenException();
    const rows=await delegate(this.db,resource).findMany({where:scope(actor,resource),take:10000});
    return rows.map((r:Row)=>{const {passwordHash,...safe}=r;return safe;});
  }
  async write(actor:Actor,resource:Resource,body:unknown,id?:string) {
    this.authorize(actor,resource);
    requireThat(resource!=='factories'||!!id,'Factories are provisioned by the seed or deployment administrator');
    const parsed=schemas[resource].safeParse(body);
    if(!parsed.success) throw new BadRequestException(parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));
    try {
      const result=await this.db.atomic(actor.factoryId,async tx=>{
        const before=id?await record(tx,actor,resource,id):null;
        let data:Row={...parsed.data};
        await checkReferences(tx,actor,resource,data);
        if(before) await this.assertEditable(tx,actor,resource,before,data);
        if(resource==='users') {
          data.passwordHash=await hash(data.password,12);delete data.password;
          if(id===actor.id) requireThat(data.role==='FACTORY_ADMIN','You cannot demote your own administrator account');
        }
        if(resource==='pieceEntries') data=await preparePieceEntry(tx,actor,data);
        if(resource==='production') {data.enteredBy=actor.id;if(before)data.version=before.version+1;}
        if(resource==='qc') {
          requireThat(data.reworkPcs+data.rejectedPcs<=data.inspectedPcs,'Rework and rejects cannot exceed inspected pieces');
          requireThat(data.defectCode==='NONE'?data.defectCount===0:data.defectCount>0,'Defect code and count must agree');
          requireThat(data.defectCount>0||data.reworkPcs+data.rejectedPcs===0,'Defective pieces require defects');
        }
        const after=await delegate(tx,resource)[id?'update':'create']({...(id?{where:{id}}:{}),data:{...data,...(resource==='factories'?{}:{factoryId:actor.factoryId})}});
        if(resource==='assignments')await validateAssignments(tx,actor,data);
        if(resource==='materials')await validateMaterials(tx,actor,data.orderId);
        const warnings=await validateBalances(tx,actor);
        await audit(tx,actor,resource,after.id,id?'UPDATE':'CREATE',before,after);
        const {passwordHash,...safe}=after;
        return {record:safe,warnings};
      });
      this.live.changed(actor.factoryId,resource,result.record.lineId);return result;
    } catch(e) { return this.translate(e); }
  }
  private async assertEditable(tx:Prisma.TransactionClient,actor:Actor,resource:Resource,before:Row,data:Row) {
    if(before.status) requireThat(['DRAFT','PLANNED'].includes(before.status),'Only draft or planned records can be edited');
    if(resource==='production' && scopedLineRoles.includes(actor.role)) requireThat(actor.lineIds.includes(before.lineId),'Entry belongs to another line');
    if(resource==='pieceEntries') await preparePieceEntry(tx,actor,before);
    if(resource==='qc') requireThat(before.resolvedPcs===0,'Resolved inspections are immutable');
    if(resource==='operations') requireThat(!await tx.pieceRateEntry.count({where:{operationId:before.id}}),'Operation is in use; create a new style revision to change rates');
    if(resource==='quantities') { const order=await record(tx,actor,'orders',before.orderId);requireThat(!['CANCELLED','CLOSED','SHIPPED'].includes(order.status),'Order is closed'); }
    if(['production','cutting','qc','finishing','cartons','pieceEntries','quantities'].includes(resource)) for(const key of ['orderId','color','size','shipmentId','workerId','operationId']) if(before[key]) requireThat(before[key]===data[key],`Cannot change ${key} on an existing record`);
  }
  async action(actor:Actor,resource:Resource,id:string,body:Row) {
    this.authorize(actor,resource);
    try {
      const result=await this.db.atomic(actor.factoryId,async tx=>{
        const before=await record(tx,actor,resource,id);
        if(before.lineId && scopedLineRoles.includes(actor.role)) requireThat(actor.lineIds.includes(before.lineId),'Record belongs to another line');
        let after:Row;
        if(resource==='qc' && body.action==='resolve') {
          const pcs=Number(body.pcs);
          requireThat(Number.isInteger(pcs)&&pcs>0&&pcs<=before.reworkPcs-before.resolvedPcs,'Enter a valid remaining rework quantity');
          after=await tx.qcInspection.update({where:{id},data:{resolvedPcs:{increment:pcs}}});
        } else {requireThat(typeof body.status==='string','Choose a target status');after=await transition(tx,actor,resource,id,body.status);}
        const warnings=await validateBalances(tx,actor);
        await audit(tx,actor,resource,id,'ACTION',before,after);
        return {record:after,warnings};
      });
      this.live.changed(actor.factoryId,resource,result.record.lineId);return result;
    }catch(e){return this.translate(e);}
  }
  async remove(actor:Actor,resource:Resource,id:string) {
    this.authorize(actor,resource);
    requireThat(!['factories','users','pieceEntries','production','qc','finishing','cartons','materials'].includes(resource),'Operational records are retained for audit. Correct entries through edits.');
    try {
      return await this.db.atomic(actor.factoryId,async tx=>{
        const before=await record(tx,actor,resource,id);
        if(before.status)requireThat(['DRAFT','PLANNED'].includes(before.status),'Only drafts can be deleted');
        await checkDelete(tx,actor,resource,id);
        await delegate(tx,resource).delete({where:{id}});
        await validateBalances(tx,actor);
        await audit(tx,actor,resource,id,'DELETE',before,null);
        this.live.changed(actor.factoryId,resource);return {ok:true};
      });
    }catch(e){return this.translate(e);}
  }
  private translate(e:unknown):never {
    if(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2002') throw new ConflictException('Duplicate record: this code, hour slot or reference already exists');
    throw e;
  }
}
