import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AccessLogService } from '../services/access-log.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('access-logs')
@Controller('access-logs')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuard)
export class AccessLogController {
  constructor(private readonly accessLogService: AccessLogService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy log truy cập' })
  @ApiResponse({ status: 200, description: 'Danh sách log truy cập.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'allowed', required: false, type: Boolean })
  @ApiBearerAuth()
  async getLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('allowed') allowed?: boolean,
  ) {
    const filters = {
      userId,
      resource,
      action,
      startDate,
      endDate,
      allowed,
    };

    const { logs, total } = await this.accessLogService.getAccessLogs(
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
  @ApiOperation({ summary: 'Lấy thống kê log truy cập' })
  @ApiResponse({ status: 200, description: 'Thống kê log truy cập.' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiBearerAuth()
  async getLogsSummary(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const summary = await this.accessLogService.getAccessLogsSummary(
      startDate,
      endDate,
    );

    return {
      success: true,
      data: summary,
    };
  }

  @Get('user-activity')
  @ApiOperation({ summary: 'Lấy thống kê hoạt động người dùng' })
  @ApiResponse({ status: 200, description: 'Thống kê hoạt động người dùng.' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth()
  async getUserActivity(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('limit') limit = 10,
  ) {
    const activity = await this.accessLogService.getUserActivity(
      startDate,
      endDate,
      limit,
    );

    return {
      success: true,
      data: activity,
    };
  }

  @Get('denied-access')
  @ApiOperation({ summary: 'Lấy thống kê truy cập bị từ chối' })
  @ApiResponse({ status: 200, description: 'Thống kê truy cập bị từ chối.' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth()
  async getDeniedAccess(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('limit') limit = 10,
  ) {
    const deniedAccess = await this.accessLogService.getDeniedAccess(
      startDate,
      endDate,
      limit,
    );

    return {
      success: true,
      data: deniedAccess,
    };
  }
}
