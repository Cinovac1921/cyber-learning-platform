import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content!: string;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content?: string;
}

export class MoveLessonDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}