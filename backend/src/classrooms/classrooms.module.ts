import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstructorGuard } from '../instructor/instructor.guard';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomsService } from './classrooms.service';
import { InstructorClassroomsController } from './instructor-classrooms.controller';
import { InstructorClassroomsService } from './instructor-classrooms.service';

@Module({
  imports: [AuthModule],
  controllers: [ClassroomsController, InstructorClassroomsController],
  providers: [ClassroomsService, InstructorClassroomsService, InstructorGuard],
})
export class ClassroomsModule {}
