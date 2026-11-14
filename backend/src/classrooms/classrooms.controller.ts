import {
  Body,
  Controller,
  Delete,
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
import { ClassroomsService } from './classrooms.service';
import { JoinClassroomDto } from './dto/classroom.dto';

@Controller('classrooms')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class ClassroomsController {
  constructor(private readonly classrooms: ClassroomsService) {}

  @Get()
  listMine(@Req() request: AuthenticatedRequest) {
    return this.classrooms.listMine(request.user!.sub);
  }

  /** Guessing codes is slow on purpose: 5 tries a minute. */
  @Post('join')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  join(@Body() dto: JoinClassroomDto, @Req() request: AuthenticatedRequest) {
    return this.classrooms.join(request.user!.sub, dto.code);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.classrooms.findOne(id, request.user!.sub);
  }

  @Delete(':id/membership')
  leave(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.classrooms.leave(id, request.user!.sub);
  }
}
