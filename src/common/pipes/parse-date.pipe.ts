import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Trả về undefined nếu giá trị không tồn tại hoặc rỗng
    if (
      !value ||
      value === '' ||
      (typeof value === 'object' && Object.keys(value).length === 0)
    ) {
      return undefined;
    }

    // Nếu đã là một đối tượng Date, trả về trực tiếp
    if (value instanceof Date) {
      return value;
    }

    // Chuyển đổi chuỗi thành Date
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date format: ${value}`);
    }

    return date;
  }
}
