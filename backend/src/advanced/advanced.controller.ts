import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AdvancedService } from './advanced.service';
@Controller()
export class AdvancedController {
  constructor(
    @Inject(AuthService) private auth: AuthService,
    @Inject(AdvancedService) private advanced: AdvancedService,
  ) {}
  private actor(req: Request) {
    return this.auth.authenticate(req.cookies?.loom_session);
  }
  private date(date?: string) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Invalid date');
    return date;
  }
  @Get('directory') async directory(@Req() req: Request) {
    return this.advanced.directory(await this.actor(req));
  }
  @Get('advanced/insights') async insights(@Req() req: Request, @Query('date') date?: string) {
    return this.advanced.insights(await this.actor(req), this.date(date));
  }
  @Get('advanced/balance/:lineId') async balance(
    @Req() req: Request,
    @Param('lineId') id: string,
    @Query('date') date: string,
  ) {
    this.date(date);
    if (!date) throw new BadRequestException('Select a date');
    return this.advanced.balance(await this.actor(req), id, date);
  }
  @Get('advanced/trace/:code') async trace(@Req() req: Request, @Param('code') code: string) {
    return this.advanced.trace(await this.actor(req), code);
  }
  @Get('search') async search(@Req() req: Request, @Query('q') q = '') {
    return this.advanced.search(await this.actor(req), q);
  }
  @Get('advanced/shipping/:id') async document(@Req() req: Request, @Param('id') id: string) {
    return this.advanced.shippingDocument(await this.actor(req), id);
  }
  @Post('tools/import/:resource') async import(
    @Req() req: Request,
    @Param('resource') resource: string,
    @Body() body: { rows: unknown[] },
  ) {
    return this.advanced.importMasters(await this.actor(req), resource, body?.rows);
  }
}
