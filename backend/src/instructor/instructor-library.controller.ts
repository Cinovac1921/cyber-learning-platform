import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CopyAssessmentDto, CopyCourseDto, CopyLessonDto } from './dto/copy.dto';
import { InstructorLibraryService } from './instructor-library.service';
import { InstructorGuard } from './instructor.guard';

@Controller('instructor')
@UseGuards(JwtAuthGuard, InstructorGuard)
export class InstructorLibraryController {
  constructor(private readonly library: InstructorLibraryService) {}

  @Get('library')
  list() {
    return this.library.list();
  }

  @Get('library/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.library.detail(id);
  }

  @Post('courses/:id/copy-lesson')
  copyLesson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CopyLessonDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.library.copyLesson(id, request.user!.sub, dto.lessonId);
  }

  @Post('courses/:id/copy-assessment')
  copyAssessment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CopyAssessmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.library.copyAssessment(id, request.user!.sub, dto.assessmentId);
  }

  @Post('classrooms/:id/copy-course')
  copyCourse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CopyCourseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.library.copyCourse(id, request.user!.sub, dto.courseId);
  }
}
