import { Prisma } from '@prisma/client';
import { Actor } from '../auth/permissions';
import { record, requireThat, Row } from './context';
import { earnings, sum } from './math';
export async function preparePieceEntry(tx:Prisma.TransactionClient,actor:Actor,data:Row) {
  const operation=await record(tx,actor,'operations',data.operationId);
  requireThat(!await tx.payrollRun.findFirst({where:{factoryId:actor.factoryId,status:{in:['CALCULATED','APPROVED','EXPORTED']},periodStart:{lte:data.date},periodEnd:{gte:data.date}}}), 'Payroll period is locked. Create entries before calculating the run.');
  return {...data,rateMinor:operation.pieceRateMinor,amountMinor:earnings(data.pcs,operation.pieceRateMinor)};
}
export async function validateAssignments(tx:Prisma.TransactionClient,actor:Actor,data:Row) {
  const assignments=await tx.lineAssignment.findMany({where:{factoryId:actor.factoryId,workerId:data.workerId,date:data.date}});
  requireThat(sum(assignments,r=>r.hours)<=24,'Worker assignments exceed 24 hours in one day');
}
export async function payrollBreakdown(tx:Prisma.TransactionClient,actor:Actor,run:Row) {
  const entries=await tx.pieceRateEntry.findMany({where:{factoryId:actor.factoryId,date:{gte:run.periodStart,lte:run.periodEnd}}});
  const workers=await tx.worker.findMany({where:{factoryId:actor.factoryId}});
  return workers.map(w=>({workerId:w.id,employeeCode:w.employeeCode,name:w.name,pcs:sum(entries.filter(e=>e.workerId===w.id),e=>e.pcs),amountMinor:sum(entries.filter(e=>e.workerId===w.id),e=>e.amountMinor)})).filter(w=>w.pcs>0);
}
