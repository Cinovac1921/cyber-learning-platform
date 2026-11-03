import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InstructorModule } from './instructor/instructor.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    CoursesModule,
    DashboardModule,
    InstructorModule,
    HealthModule,
  ],
})
export class AppModule {}