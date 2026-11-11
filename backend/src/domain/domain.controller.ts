import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Inject,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { DomainService } from './domain.service';
import { AuthService } from '../auth/auth.service';
@Controller('data')
export class DomainController {
  constructor(
    @Inject(DomainService) private domain: DomainService,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  private actor(req: Request) {
    return this.auth.authenticate(req.cookies?.loom_session);
  }
  @Get(':resource') async list(@Req() req: Request, @Param('resource') r: string) {
    return this.domain.list(await this.actor(req), this.domain.resource(r));
  }
  @Post(':resource') async create(
    @Req() req: Request,
    @Param('resource') r: string,
    @Body() body: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.domain.write(await this.actor(req), this.domain.resource(r), body, undefined, key);
  }
  @Patch(':resource/:id') async update(
    @Req() req: Request,
    @Param('resource') r: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.domain.write(await this.actor(req), this.domain.resource(r), body, id);
  }
  @Post(':resource/:id/actions') async action(
    @Req() req: Request,
    @Param('resource') r: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.domain.action(await this.actor(req), this.domain.resource(r), id, body || {});
  }
  @Delete(':resource/:id') async remove(
    @Req() req: Request,
    @Param('resource') r: string,
    @Param('id') id: string,
  ) {
    return this.domain.remove(await this.actor(req), this.domain.resource(r), id);
  }
}
