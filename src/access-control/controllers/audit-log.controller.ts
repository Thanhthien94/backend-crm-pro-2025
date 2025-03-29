import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction } from '../schemas/audit-log.schema';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy log kiểm toán' })
  @ApiResponse({ status: 200, description: 'Danh sách log kiểm toán.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiBearerAuth()
  async getLogs(
    @Request() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const filters = {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
    };

    const { logs, total } = await this.auditLogService.getAuditLogs(
      req.user.organization.toString(),
      filters,
      page,
      limit,
    );

    return {
      success: true,
      count: logs.length,
      pagination: {
        total,
        page: +page,
        pages: Math.ceil(total / +limit),
      },
      data: logs,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Lấy thống kê log kiểm toán' })
  @ApiResponse({ status: 200, description: 'Thống kê log kiểm toán.' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiBearerAuth()
  async getLogsSummary(
    @Request() req: RequestWithUser,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const summary = await this.auditLogService.getAuditSummary(
      req.user.organization.toString(),
      startDate,
      endDate,
    );

    return {
      success: true,
      data: summary,
    };
  }
}