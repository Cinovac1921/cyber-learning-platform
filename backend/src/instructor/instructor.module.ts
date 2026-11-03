import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstructorController } from './instructor.controller';
import { InstructorGuard } from './instructor.guard';
import { InstructorService } from './instructor.service';

@Module({
  imports: [AuthModule],
  controllers: [InstructorController],
  providers: [InstructorService, InstructorGuard],
})
export class InstructorModule {}