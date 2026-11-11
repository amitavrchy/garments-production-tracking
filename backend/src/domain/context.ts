import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor } from '../auth/permissions';
import { models, Resource } from './schemas';
// Dynamic resource registry stays internal; external input is parsed by strict per-resource schemas.
export type Row = Record<string, any>;
export function delegate(tx: Prisma.TransactionClient, resource: Resource): any {
  return (tx as any)[models[resource]];
}
export const scope = (actor: Actor, resource?: Resource) =>
  resource === 'factories' ? { id: actor.factoryId } : { factoryId: actor.factoryId };
export async function record(
  tx: Prisma.TransactionClient,
  actor: Actor,
  resource: Resource,
  id: string,
): Promise<Row> {
  const row = await delegate(tx, resource).findFirst({ where: { ...scope(actor, resource), id } });
  if (!row) throw new NotFoundException(`${resource} record not found`);
  return row;
}
export function requireThat(value: unknown, message: string): asserts value {
  if (!value) throw new BadRequestException(message);
}
export async function audit(
  tx: Prisma.TransactionClient,
  actor: Actor,
  resource: string,
  recordId: string,
  action: string,
  before: Row | null,
  after: Row | null,
) {
  const clean = (row: Row | null) =>
    row
      ? JSON.parse(
          JSON.stringify(
            Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'passwordHash')),
          ),
        )
      : Prisma.JsonNull;
  await tx.auditLog.create({
    data: {
      factoryId: actor.factoryId,
      actorId: actor.id,
      resource,
      recordId,
      action,
      before: clean(before),
      after: clean(after),
    },
  });
}
