import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  buildResetLink,
  generateResetToken,
  hashResetToken,
  RESET_COOLDOWN_SECONDS,
  RESET_LINK_INVALID_MESSAGE,
  RESET_TOKEN_TTL_MINUTES,
  resetEmailText,
} from './password-reset';

export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password);
    // New accounts are always students. Instructors are promoted by an admin.
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName: dto.displayName.trim() },
    });

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const passwordMatches = user
      ? await argon2.verify(user.passwordHash, dto.password)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    return this.createSession(user);
  }

  /**
   * Emails a reset link if the address belongs to an account. It never fails and never says whether
   * the account exists: the caller answers the same either way, without waiting for this to finish.
   */
  async requestPasswordReset(rawEmail: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: rawEmail.toLowerCase() },
        select: { id: true, email: true },
      });
      if (!user) return;

      const justAsked = await this.prisma.passwordResetToken.findFirst({
        where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESET_COOLDOWN_SECONDS * 1000) } },
        select: { id: true },
      });
      if (justAsked) return;

      const { token, tokenHash } = generateResetToken();
      // One live link at a time: asking again cancels the earlier one.
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
          },
        }),
      ]);

      await this.mail.send({
        to: user.email,
        subject: 'Reset your Cyber Learning password',
        text: resetEmailText(buildResetLink(this.mail.appUrl, token)),
      });
    } catch (error) {
      this.logger.error('Could not send a password reset email.', error instanceof Error ? error.stack : String(error));
    }
  }

  /** Sets a new password from a reset link. A link works once. */
  async resetPassword(token: string, password: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      select: { id: true, userId: true },
    });
    if (!record) {
      throw new BadRequestException(RESET_LINK_INVALID_MESSAGE);
    }

    // Spending the token is one database step that only one request can win, so a link can't be used twice
    // even if it is submitted twice at the same moment. The expiry is checked in that same step.
    const spent = await this.prisma.passwordResetToken.deleteMany({
      where: { id: record.id, expiresAt: { gt: new Date() } },
    });
    if (spent.count !== 1) {
      throw new BadRequestException(RESET_LINK_INVALID_MESSAGE);
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction([
      // Raising the token version signs the account out everywhere, including a thief who already had a session.
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    return { message: 'Your password has been changed. You can sign in now.' };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('This account no longer exists.');
    }
    return this.toPublicUser(user);
  }

  private async createSession(user: PublicUser & { tokenVersion: number }) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      ver: user.tokenVersion,
    });
    return { accessToken, user: this.toPublicUser(user) };
  }

  private toPublicUser(user: PublicUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}