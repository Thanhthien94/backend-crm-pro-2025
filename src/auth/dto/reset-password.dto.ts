import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  token!: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'Password must be at least 6 characters and contain at least one number',
  })
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password!: string;
}
