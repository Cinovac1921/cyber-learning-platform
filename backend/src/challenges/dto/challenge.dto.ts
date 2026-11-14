import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CATEGORIES, DIFFICULTIES } from '../categories';

export class CreateChallengeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @IsIn(DIFFICULTIES)
  difficulty!: (typeof DIFFICULTIES)[number];

  @IsInt()
  @Min(1)
  @Max(10_000)
  points!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  hint?: string;

  /** The answer students must submit, for example flag{...}. Stored only as a hash. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  flag!: string;
}

export class UpdateChallengeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: (typeof DIFFICULTIES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  points?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  hint?: string;

  /** Leave it out to keep the current flag. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  flag?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class SubmitFlagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  flag!: string;
}
