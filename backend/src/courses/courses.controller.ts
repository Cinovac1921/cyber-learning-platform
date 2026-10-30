import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list() {
    return this.courses.list();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.courses.findBySlug(slug);
  }

  @Get(':slug/lessons/:position')
  findLesson(
    @Param('slug') slug: string,
    @Param('position', ParseIntPipe) position: number,
  ) {
    return this.courses.findLesson(slug, position);
  }
}