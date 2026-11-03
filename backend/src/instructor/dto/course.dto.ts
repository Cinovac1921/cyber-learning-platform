import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type CourseLevelValue = (typeof COURSE_LEVELS)[number];

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
}