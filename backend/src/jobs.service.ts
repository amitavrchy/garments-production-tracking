import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from './prisma.service';
import { ReportsService } from './reports.service';
import type { Actor } from './auth/permissions';
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue;
  private worker?: Worker;
  constructor(
    @Inject(PrismaService) private db: PrismaService,
    @Inject(ReportsService) private reports: ReportsService,
  ) {}
  async onModuleInit() {
    const url = new URL(process.env.REDIS_URL || 'redis://localhost:56379');
    const connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
      password: url.password || undefined,
      username: url.username || undefined,
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
    this.queue = new Queue('factory-aggregates', { connection });
    this.worker = new Worker(
      'factory-aggregates',
      async () => {
        for (const factory of await this.db.factory.findMany()) {
          const actor = {
            id: 'system',
            factoryId: factory.id,
            role: 'FACTORY_ADMIN',
            lineIds: [],
            name: 'Scheduler',
            email: '',
          } as Actor;
          const summary = await this.reports.overview(actor);
          const redis = await this.queue!.client;
          await redis.set(`factory:${factory.id}:nightly`, JSON.stringify(summary), { EX: 86400 });
          for (const style of await this.db.style.findMany({ where: { factoryId: factory.id } })) {
            const operations = await this.db.operation.findMany({ where: { styleId: style.id } });
            await redis.set(
              `style:${style.id}:bulletin`,
              JSON.stringify({ smv: style.smv, operations }),
              { EX: 86400 },
            );
          }
        }
      },
      { connection },
    );
    this.worker.on('error', (e) => console.error('Aggregation worker:', e.message));
    this.queue.on('error', (e) => console.error('Aggregation queue:', e.message));
    await this.queue.upsertJobScheduler(
      'nightly-dhaka',
      { pattern: '0 0 * * *', tz: 'Asia/Dhaka' },
      {
        name: 'nightly',
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 20,
          removeOnFail: 50,
        },
      },
    );
  }
  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
