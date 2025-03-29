import {
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ImportService } from './import.service';
import { ImportFileDto, ImportEntity } from './dto/import-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('import')
@Controller('import')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  @ApiOperation({ summary: 'Import data from CSV file' })
  @ApiResponse({ status: 201, description: 'Data imported successfully.' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  async importFile(
    @UploadedFile() file: any,
    @Body() importFileDto: ImportFileDto,
    @Request() req: RequestWithUser,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    // Parse CSV data
    const data = await this.importService.parseCSV(file.buffer);

    // Import the data
    const result = await this.importService.importData(
      importFileDto.entity,
      data,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('template')
  @ApiOperation({ summary: 'Get import template' })
  @ApiResponse({ status: 200, description: 'Returns import template.' })
  @ApiBearerAuth()
  async getTemplate(@Body('entity') entity: ImportEntity) {
    // Define the headers for each entity type
    const templates = {
      [ImportEntity.CUSTOMERS]: [
        'name',
        'email',
        'phone',
        'company',
        'type',
        'status',
        'source',
        'notes',
        'industry',
        'size',
        'website',
        'address',
      ],
      [ImportEntity.DEALS]: [
        'name',
        'value',
        'stage',
        'customerId',
        'customerEmail',
        'expectedCloseDate',
        'probability',
        'notes',
        'source',
        'campaign',
      ],
      [ImportEntity.TASKS]: [
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
        'assignedTo',
        'customerId',
        'customerEmail',
        'dealId',
        'dealName',
        'isRecurring',
        'recurringFrequency',
      ],
    };

    return {
      success: true,
      data: {
        headers: templates[entity] || [],
        sampleData: this.generateSampleData(templates[entity] || []),
      },
    };
  }

  private generateSampleData(headers: string[]): string {
    // Create a sample row with empty values
    const sampleRow = headers.map(() => '').join(',');
    return headers.join(',') + '\n' + sampleRow;
  }
}
