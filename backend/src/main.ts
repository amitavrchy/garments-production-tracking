import 'reflect-metadata';
import 'dotenv/config';
import { Module, Controller, Get, Inject } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { DomainService } from './domain/domain.service';
import { DomainController } from './domain/domain.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { LiveGateway } from './live.gateway';
import { JobsService } from './jobs.service';
import { OperationsController } from './operations.controller';
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must have at least 32 characters');
for (const [key, fallback, min, max] of [
  ['DEFAULT_SHIFT_MINUTES', 480, 1, 1440],
  ['CUT_OVER_PERCENT_BPS', 300, 0, 10000],
] as const) {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
}
const origins = (process.env.CORS_ORIGINS || 'http://localhost:3300').split(',');
@Controller('health')
class HealthController {
  constructor(@Inject(PrismaService) private db: PrismaService) {}
  @Get() async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'loom-api' };
  }
}
@Module({
  imports: [JwtModule.register({ secret, signOptions: { expiresIn: '8h' } })],
  controllers: [
    HealthController,
    AuthController,
    DomainController,
    ReportsController,
    OperationsController,
  ],
  providers: [PrismaService, AuthService, LiveGateway, DomainService, ReportsService, JobsService],
})
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.use(helmet());
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers.origin && !origins.includes(req.headers.origin))
        return res.status(403).json({ message: 'Origin is not allowed' });
      if (!req.is('application/json'))
        return res.status(415).json({ message: 'Use application/json' });
    }
    next();
  });
  app.enableCors({ origin: origins, credentials: true });
  await app.listen(Number(process.env.PORT || 4400), '0.0.0.0');
}
bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
