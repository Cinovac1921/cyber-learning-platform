import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstructorAssessmentsController } from './instructor-assessments.controller';
import { InstructorAssessmentsService } from './instructor-assessments.service';
import { InstructorLibraryController } from './instructor-library.controller';
import { InstructorLibraryService } from './instructor-library.service';
import { InstructorController } from './instructor.controller';
import { InstructorGuard } from './instructor.guard';
import { InstructorService } from './instructor.service';

@Module({
  imports: [AuthModule],
  controllers: [InstructorController, InstructorAssessmentsController, InstructorLibraryController],
  providers: [InstructorService, InstructorAssessmentsService, InstructorLibraryService, InstructorGuard],
})
export class InstructorModule {}
