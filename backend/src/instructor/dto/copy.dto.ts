import { IsInt, Min } from 'class-validator';

export class CopyLessonDto {
  @IsInt()
  @Min(1)
  lessonId!: number;
}

export class CopyAssessmentDto {
  @IsInt()
  @Min(1)
  assessmentId!: number;
}

export class CopyCourseDto {
  @IsInt()
  @Min(1)
  courseId!: number;
}
