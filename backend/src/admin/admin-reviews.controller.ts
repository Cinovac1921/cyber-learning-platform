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
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminReviewsService } from './admin-reviews.service';
import { ReviewNoteDto } from './dto/review-note.dto';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReviewsController {
  constructor(private readonly reviews: AdminReviewsService) {}

  @Get()
  list() {
    return this.reviews.list();
  }

  /** Declared before `:id`, so "pending-count" is not read as a course id. */
  @Get('pending-count')
  pendingCount() {
    return this.reviews.pendingCount();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.reviews.detail(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.reviews.approve(id, request.user!.sub);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewNoteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.reject(id, request.user!.sub, dto.note);
  }

  @Post(':id/takedown')
  @HttpCode(200)
  takedown(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewNoteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.takedown(id, request.user!.sub, dto.note);
  }
}
