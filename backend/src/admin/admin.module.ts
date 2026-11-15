import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReviewsService } from './admin-reviews.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, AdminReviewsController],
  providers: [AdminService, AdminReviewsService, AdminGuard],
})
export class AdminModule {}
