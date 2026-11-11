import { Injectable, Inject, UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { Actor } from './permissions';

@Injectable()
export class AuthService {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(
    @Inject(PrismaService) private db: PrismaService,
    @Inject(JwtService) private jwt: JwtService,
  ) {}
  async login(email: string, password: string, ip: string) {
    const key = `${ip}:${email.toLowerCase()}`;
    const now = Date.now();
    for (const [k, v] of this.attempts) if (v.until < now) this.attempts.delete(k);
    const hit = this.attempts.get(key);
    if (hit && hit.count >= 8)
      throw new HttpException('Too many attempts. Try again in 15 minutes.', 429);
    this.attempts.set(key, { count: (hit?.count || 0) + 1, until: hit?.until || now + 900000 });
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user?.active || !(await compare(password, user.passwordHash)))
      throw new UnauthorizedException('Email or password is incorrect');
    this.attempts.delete(key);
    return { token: await this.jwt.signAsync({ sub: user.id }), user: this.publicUser(user) };
  }
  publicUser(user: { passwordHash: string; [key: string]: unknown }) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
  async authenticate(token?: string): Promise<Actor> {
    try {
      const claim = await this.jwt.verifyAsync<{ sub: string }>(token || '');
      const user = await this.db.user.findUnique({ where: { id: claim.sub } });
      if (!user?.active) throw new Error();
      return this.publicUser(user) as Actor;
    } catch {
      throw new UnauthorizedException('Please sign in to continue');
    }
  }
}
