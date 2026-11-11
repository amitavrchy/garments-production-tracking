import { Body, Controller, Get, Inject, Post, Req, Res, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { z } from 'zod';
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private auth: AuthService) {}
  @Post('login') async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = z
      .object({ email: z.email(), password: z.string().min(1).max(128) })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException('Enter a valid email and password');
    const result = await this.auth.login(
      parsed.data.email,
      parsed.data.password,
      req.ip || 'local',
    );
    res.cookie('loom_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 3600000,
      path: '/',
    });
    return result.user;
  }
  @Get('me') async me(@Req() req: Request) {
    return this.auth.authenticate(req.cookies?.loom_session);
  }
  @Post('logout') logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('loom_session', { path: '/' });
    return { ok: true };
  }
}
