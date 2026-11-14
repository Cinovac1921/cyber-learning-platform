import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { SubmitFlagDto } from './dto/challenge.dto';
import { attachmentHeader } from './file-storage';

@Controller('challenges')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.challenges.list(request.user!.sub);
  }

  // Declared before ':id' so "leaderboard" is not read as an id.
  @Get('leaderboard')
  leaderboard(@Req() request: AuthenticatedRequest) {
    return this.challenges.leaderboard(request.user!.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.challenges.findOne(id, request.user!.sub);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: SubmitFlagDto,
  ) {
    return this.challenges.submit(id, request.user!.sub, dto.flag);
  }

  @Get(':id/file')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(@Param('id', ParseIntPipe) id: number) {
    const { stream, name } = await this.challenges.fileFor(id);
    return new StreamableFile(stream, {
      type: 'application/octet-stream',
      disposition: attachmentHeader(name),
    });
  }
}
