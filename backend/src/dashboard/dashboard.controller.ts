import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(
    @Req() request: AuthenticatedRequest,
    @Query('tzOffset', new DefaultValuePipe(0), ParseIntPipe) tzOffset: number,
  ) {
    return this.dashboard.get(request.user!.sub, tzOffset);
  }
}