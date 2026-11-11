import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  Req,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth/auth.service';
import { DomainService } from './domain/domain.service';
import { ReportsService } from './reports.service';
import { Resource } from './domain/schemas';
const roots = ['buyers', 'orders', 'styles', 'bom', 'bulletin', 'cutting', 'packing', 'shipments'];
const resourceMap: Record<string, Resource> = {
  buyers: 'buyers',
  orders: 'orders',
  styles: 'styles',
  bom: 'bom',
  bulletin: 'operations',
  cutting: 'cutting',
  packing: 'cartons',
  shipments: 'shipments',
};
@Controller()
export class OperationsController {
  constructor(
    @Inject(AuthService) private auth: AuthService,
    @Inject(DomainService) private domain: DomainService,
    @Inject(ReportsService) private reports: ReportsService,
  ) {}
  private actor(req: Request) {
    return this.auth.authenticate(req.cookies?.loom_session);
  }
  private resource(req: Request) {
    return resourceMap[req.path.split('/').filter(Boolean)[1]];
  }
  @Get(roots) async list(@Req() req: Request) {
    return this.domain.list(await this.actor(req), this.resource(req));
  }
  @Post(roots) async create(@Req() req: Request, @Body() body: unknown) {
    return this.domain.write(await this.actor(req), this.resource(req), body);
  }
  @Patch(roots.map((r) => `${r}/:id`)) async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.domain.write(await this.actor(req), this.resource(req), body, id);
  }
  @Delete(roots.map((r) => `${r}/:id`)) async remove(@Req() req: Request, @Param('id') id: string) {
    return this.domain.remove(await this.actor(req), this.resource(req), id);
  }
  @Post('production/hourly') async hourly(
    @Req() req: Request,
    @Body() body: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.domain.write(await this.actor(req), 'production', body, undefined, key);
  }
  @Get('production/efficiency') async efficiency(
    @Req() req: Request,
    @Query('date') date?: string,
  ) {
    return (await this.reports.overview(await this.actor(req), date)).lines;
  }
  @Post('qc/inspections') async qc(@Req() req: Request, @Body() body: unknown) {
    return this.domain.write(await this.actor(req), 'qc', body);
  }
  @Post('payroll/runs/:id/calculate') async calculate(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.domain.action(await this.actor(req), 'payroll', id, { status: 'CALCULATED' });
  }
}
