import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstructorAssessmentsController } from './instructor-assessments.controller';
import { InstructorAssessmentsService } from './instructor-assessments.service';
import { InstructorController } from './instructor.controller';
import { InstructorGuard } from './instructor.guard';
import { InstructorService } from './instructor.service';

@Module({
  imports: [AuthModule],
  controllers: [InstructorController, InstructorAssessmentsController],
  providers: [InstructorService, InstructorAssessmentsService, InstructorGuard],
})
export class InstructorModule {}
