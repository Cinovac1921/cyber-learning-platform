import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CreateLessonDto, MoveLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { InstructorGuard } from './instructor.guard';
import { InstructorService } from './instructor.service';

@Controller('instructor')
@UseGuards(JwtAuthGuard, InstructorGuard)
export class InstructorController {
  constructor(private readonly instructor: InstructorService) {}

  @Get('courses')
  listCourses(@Req() request: AuthenticatedRequest) {
    return this.instructor.listCourses(request.user!.sub);
  }

  @Post('courses')
  createCourse(@Req() request: AuthenticatedRequest, @Body() dto: CreateCourseDto) {
    return this.instructor.createCourse(request.user!.sub, dto);
  }

  @Get('courses/:id')
  getCourse(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.instructor.getCourse(id, request.user!.sub);
  }

  @Patch('courses/:id')
  updateCourse(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.instructor.updateCourse(id, request.user!.sub, dto);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.instructor.deleteCourse(id, request.user!.sub);
  }

  @Post('courses/:id/lessons')
  createLesson(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateLessonDto,
  ) {
    return this.instructor.createLesson(id, request.user!.sub, dto);
  }

  @Patch('lessons/:id')
  updateLesson(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.instructor.updateLesson(id, request.user!.sub, dto);
  }

  @Delete('lessons/:id')
  deleteLesson(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.instructor.deleteLesson(id, request.user!.sub);
  }

  @Post('lessons/:id/move')
  @HttpCode(200)
  moveLesson(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: MoveLessonDto,
  ) {
    return this.instructor.moveLesson(id, request.user!.sub, dto.direction);
  }
}