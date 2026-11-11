import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
  async atomic<T>(factoryId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    // Factory-scoped lock also protects aggregate WIP and payroll checks from write skew.
    return this.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${factoryId}))`;
      return work(tx);
    }, { maxWait: 10000, timeout: 20000 });
  }
}
