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
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateAssessmentDto,
  QuestionInputDto,
  UpdateAssessmentDto,
} from './dto/assessment.dto';
import { MoveLessonDto } from './dto/lesson.dto';
import { InstructorAssessmentsService } from './instructor-assessments.service';
import { InstructorGuard } from './instructor.guard';

@Controller('instructor')
@UseGuards(JwtAuthGuard, InstructorGuard)
export class InstructorAssessmentsController {
  constructor(private readonly assessments: InstructorAssessmentsService) {}

  @Get('courses/:id/assessments')
  listForCourse(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.assessments.listForCourse(id, request.user!.sub);
  }

  @Post('courses/:id/assessments')
  create(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessments.create(id, request.user!.sub, dto);
  }

  @Get('assessments/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.assessments.findOne(id, request.user!.sub);
  }

  @Patch('assessments/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.assessments.update(id, request.user!.sub, dto);
  }

  @Delete('assessments/:id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.assessments.remove(id, request.user!.sub);
  }

  @Post('assessments/:id/questions')
  addQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: QuestionInputDto,
  ) {
    return this.assessments.addQuestion(id, request.user!.sub, dto);
  }

  @Put('questions/:id')
  updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: QuestionInputDto,
  ) {
    return this.assessments.updateQuestion(id, request.user!.sub, dto);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.assessments.deleteQuestion(id, request.user!.sub);
  }

  @Post('questions/:id/move')
  @HttpCode(200)
  moveQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: MoveLessonDto,
  ) {
    return this.assessments.moveQuestion(id, request.user!.sub, dto.direction);
  }
}
