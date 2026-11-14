import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  /** Closing joining keeps current members but stops new ones. */
  @IsOptional()
  @IsBoolean()
  joinOpen?: boolean;
}

export class JoinClassroomDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  code!: string;
}
