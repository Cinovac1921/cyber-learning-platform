import { IsString, MaxLength, MinLength } from 'class-validator';

/** The reason shown to the instructor when a course is rejected or taken down. */
export class ReviewNoteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
