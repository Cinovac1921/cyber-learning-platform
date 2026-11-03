import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Lets only instructors through. It checks the database on every request
 * (not the role inside the token), so a changed role takes effect immediately.
 * Always use it after JwtAuthGuard.
 */
@Injectable()
export class InstructorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.sub;

    if (userId === undefined) {
      throw new UnauthorizedException('Sign in to continue.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Instructor access is required.');
    }
    return true;
  }
}