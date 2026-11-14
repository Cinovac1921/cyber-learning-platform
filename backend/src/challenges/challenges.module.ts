import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstructorGuard } from '../instructor/instructor.guard';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { FileStorage, uploadFolder } from './file-storage';
import { InstructorChallengesController } from './instructor-challenges.controller';
import { InstructorChallengesService } from './instructor-challenges.service';

@Module({
  imports: [AuthModule],
  controllers: [ChallengesController, InstructorChallengesController],
  providers: [
    ChallengesService,
    InstructorChallengesService,
    InstructorGuard,
    { provide: FileStorage, useFactory: () => new FileStorage(uploadFolder()) },
  ],
})
export class ChallengesModule {}
