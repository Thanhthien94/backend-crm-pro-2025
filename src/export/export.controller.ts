import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExportService, ExportFormat, ExportEntity } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import * as ExcelJS from 'exceljs';

@ApiTags('export')
@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  @ApiOperation({ summary: 'Export data' })
  @ApiResponse({ status: 200, description: 'Data exported successfully.' })
  @ApiQuery({
    name: 'entity',
    enum: ExportEntity,
    required: true,
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormat,
    required: true,
  })
  @ApiQuery({
    name: 'filters',
    type: String,
    required: false,
    description: 'JSON encoded filters object',
  })
  @ApiBearerAuth()
  async exportData(
    @Query('entity') entity: ExportEntity,
    @Query('format') format: ExportFormat,
    @Query('filters') filtersJson: string,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ) {
    // Parse filters if provided
    const filters = filtersJson ? JSON.parse(filtersJson) : {};

    const { data, filename } = await this.exportService.exportData(
      entity,
      format,
      req.user.organization.toString(),
      filters,
    );

    // Set appropriate headers based on format
    if (format === ExportFormat.CSV) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(data);
    }

    if (format === ExportFormat.JSON) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(data);
    }

    if (format === ExportFormat.EXCEL) {
      // Create Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      // Add column headers
      if (data.length > 0) {
        worksheet.columns = Object.keys(data[0]).map((key) => ({
          header: key,
          key,
          width: 20,
        }));
      }

      // Add rows
      worksheet.addRows(data);

      // Style the header row
      worksheet.getRow(1).font = { bold: true };

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      // Write to response
      await workbook.xlsx.write(res);
      return res.end();
    }
  }
}
