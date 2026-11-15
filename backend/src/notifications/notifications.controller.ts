import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.notifications.list(request.user!.sub);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notifications.markAllRead(request.user!.sub);
  }

  @Post(':id/read')
  @HttpCode(200)
  markRead(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.notifications.markRead(id, request.user!.sub);
  }
}
