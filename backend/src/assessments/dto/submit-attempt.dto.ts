import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';

export class AnswerDto {
  @IsInt()
  @Min(1)
  questionId!: number;

  @IsInt()
  @Min(1)
  optionId!: number;
}

export class SubmitAttemptDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
