import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { AuthService } from './auth/auth.service';
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private reports: ReportsService,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  private actor(req: Request) {
    return this.auth.authenticate(req.cookies?.loom_session);
  }
  @Get('overview') async overview(@Req() req: Request, @Query('date') date?: string) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Invalid date');
    return this.reports.overview(await this.actor(req), date);
  }
  @Get('wip') async wip(@Req() req: Request) {
    return (await this.reports.overview(await this.actor(req))).wip;
  }
  @Get('dhu') async dhu(@Req() req: Request) {
    const r = await this.reports.overview(await this.actor(req));
    return { dhu: r.dhu, defects: r.defects, inspected: r.inspected };
  }
  @Get('efficiency') async efficiency(@Req() req: Request) {
    return (await this.reports.overview(await this.actor(req))).lines;
  }
  @Get('materials/:orderId') async materials(@Req() req: Request, @Param('orderId') id: string) {
    return this.reports.materials(await this.actor(req), id);
  }
  @Get('audit') async audit(@Req() req: Request) {
    return this.reports.audit(await this.actor(req));
  }
  @Get('payroll/:id.csv') async payroll(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    res
      .type('text/csv')
      .attachment('payroll.csv')
      .send(await this.reports.payrollCsv(await this.actor(req), id));
  }
  @Get('packing/:id.csv') async packing(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    res
      .type('text/csv')
      .attachment('packing-list.csv')
      .send(await this.reports.packingCsv(await this.actor(req), id));
  }
}
