import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InstructorGuard } from '../instructor/instructor.guard';
import { CreateClassroomDto, UpdateClassroomDto } from './dto/classroom.dto';
import { InstructorClassroomsService } from './instructor-classrooms.service';

@Controller('instructor/classrooms')
@UseGuards(JwtAuthGuard, InstructorGuard)
export class InstructorClassroomsController {
  constructor(private readonly classrooms: InstructorClassroomsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.classrooms.list(request.user!.sub);
  }

  @Post()
  create(@Body() dto: CreateClassroomDto, @Req() request: AuthenticatedRequest) {
    return this.classrooms.create(request.user!.sub, dto);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.classrooms.get(id, request.user!.sub);
  }

  /** How every student is doing in this classroom's courses and quizzes. */
  @Get(':id/progress')
  progress(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.classrooms.progress(id, request.user!.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassroomDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.classrooms.update(id, request.user!.sub, dto);
  }

  @Post(':id/join-code')
  regenerateJoinCode(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.classrooms.regenerateJoinCode(id, request.user!.sub);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) memberUserId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.classrooms.removeMember(id, request.user!.sub, memberUserId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.classrooms.remove(id, request.user!.sub);
  }
}
