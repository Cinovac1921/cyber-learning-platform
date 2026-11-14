import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;

  /** The same rules as when registering. */
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}
