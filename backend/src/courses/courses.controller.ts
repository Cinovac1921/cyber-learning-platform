import {
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
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.courses.list(request.user!.sub);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string, @Req() request: AuthenticatedRequest) {
    return this.courses.findBySlug(slug, request.user!.sub);
  }

  @Get(':slug/lessons/:position')
  findLesson(
    @Param('slug') slug: string,
    @Param('position', ParseIntPipe) position: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courses.findLesson(slug, position, request.user!.sub);
  }

  @Post(':slug/lessons/:position/complete')
  @HttpCode(200)
  complete(
    @Param('slug') slug: string,
    @Param('position', ParseIntPipe) position: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courses.setLessonCompleted(slug, position, request.user!.sub, true);
  }

  @Delete(':slug/lessons/:position/complete')
  uncomplete(
    @Param('slug') slug: string,
    @Param('position', ParseIntPipe) position: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courses.setLessonCompleted(slug, position, request.user!.sub, false);
  }
}