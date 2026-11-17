import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type CourseLevelValue = (typeof COURSE_LEVELS)[number];

export const COURSE_SCOPES = ['PUBLIC', 'TEMPLATE'] as const;
export type CourseScopeValue = (typeof COURSE_SCOPES)[number];

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(300)
  summary!: string;

  @IsIn(COURSE_LEVELS)
  level!: CourseLevelValue;

  /** Put the new course inside one of the instructor's classrooms. Leave out for the public library. */
  @IsOptional()
  @IsInt()
  @Min(1)
  classroomId?: number;

  /** Admins only: start the course as a template for instructors to copy from. */
  @IsOptional()
  @IsIn(['TEMPLATE'])
  scope?: 'TEMPLATE';
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(300)
  summary?: string;

  @IsOptional()
  @IsIn(COURSE_LEVELS)
  level?: CourseLevelValue;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  /** Only admins may change this. The service checks. */
  @IsOptional()
  @IsIn(COURSE_SCOPES)
  scope?: CourseScopeValue;
}