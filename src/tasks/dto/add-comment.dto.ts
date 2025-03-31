import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({
    example: 'Đã liên hệ với khách hàng. Họ sẽ gọi lại vào ngày mai.',
  })
  @IsNotEmpty()
  @IsString()
  comment!: string;
}
