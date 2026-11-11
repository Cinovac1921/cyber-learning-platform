import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssessmentsService } from './assessments.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Controller('assessments')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.assessments.list(request.user!.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.assessments.findOne(id, request.user!.sub);
  }

  @Post(':id/attempts')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.assessments.submit(id, request.user!.sub, dto);
  }

  @Get(':id/attempts/:attemptId')
  findAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.assessments.findAttempt(id, attemptId, request.user!.sub);
  }
}
