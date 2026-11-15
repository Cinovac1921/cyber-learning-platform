import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest, JwtPayload } from './auth.types';

const SESSION_ENDED = 'Your session has expired. Sign in again.';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Sign in to continue.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException(SESSION_ENDED);
    }

    // A valid signature is not enough: the token must also match the account's current version.
    // Resetting a password raises the version, which cancels every token issued before it.
    // Tokens made before versions existed carry none, and count as version 0.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });
    if (!user || user.tokenVersion !== (payload.ver ?? 0)) {
      throw new UnauthorizedException(SESSION_ENDED);
    }

    request.user = payload;
    return true;
  }
}
