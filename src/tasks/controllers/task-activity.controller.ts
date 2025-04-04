import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TaskActivityService } from '../services/task-activity.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ParseDatePipe } from '../../common/pipes/parse-date.pipe';
import { AccessControlGuard } from 'src/access-control/guards/access-control.guard';
import { AccessControl } from 'src/access-control/decorators/access-control.decorator';

@ApiTags('task-activities')
@Controller('task-activities')
@UseGuards(JwtAuthGuard)
export class TaskActivityController {
  constructor(private readonly taskActivityService: TaskActivityService) {}

  @Get('recent')
  @ApiOperation({ summary: 'Get recent task activities' })
  @ApiResponse({ status: 200, description: 'Returns recent task activities.' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth()
  async getRecentActivities(
    @Request() req: RequestWithUser,
    @Query('limit') limit = 10,
  ) {
    const activities = await this.taskActivityService.getRecentActivities(
      req.user.organization.toString(),
      +limit,
    );

    return {
      success: true,
      data: activities,
    };
  }

  @Get('user')
  @ApiOperation({ summary: 'Get current user activities' })
  @ApiResponse({ status: 200, description: 'Returns user activities.' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth()
  async getUserActivities(
    @Request() req: RequestWithUser,
    @Query('limit') limit = 10,
  ) {
    const activities = await this.taskActivityService.getUserActivities(
      req.user._id?.toString() || '',
      req.user.organization.toString(),
      +limit,
    );

    return {
      success: true,
      data: activities,
    };
  }

  @Get('stats/by-type')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get task activity statistics by type' })
  @ApiResponse({ status: 200, description: 'Returns activity statistics.' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiBearerAuth()
  async getActivityStatsByType(
    @Request() req: RequestWithUser,
    @Query('startDate', new ParseDatePipe()) startDate?: Date,
    @Query('endDate', new ParseDatePipe()) endDate?: Date,
  ) {
    const stats = await this.taskActivityService.getActivityStatsByType(
      req.user.organization.toString(),
      startDate,
      endDate,
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get('stats/by-user')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get task activity statistics by user' })
  @ApiResponse({ status: 200, description: 'Returns activity statistics.' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiBearerAuth()
  async getActivityStatsByUser(
    @Request() req: RequestWithUser,
    @Query('startDate', new ParseDatePipe()) startDate?: Date,
    @Query('endDate', new ParseDatePipe()) endDate?: Date,
    @Query('limit') limit = 5,
  ) {
    const stats = await this.taskActivityService.getActivityStatsByUser(
      req.user.organization.toString(),
      startDate,
      endDate,
      +limit,
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get('task/:taskId')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'read')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động của task' })
  @ApiResponse({
    status: 200,
    description: 'Trả về lịch sử hoạt động của task.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'ID của task cần lấy lịch sử hoạt động',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa',
  })
  @ApiBearerAuth()
  async getTaskActivities(
    @Param('taskId') taskId: string,
    @Request() req: RequestWithUser,
    @Query('limit') limit = 20,
  ) {
    const activities = await this.taskActivityService.getTaskActivities(
      taskId,
      req.user.organization.toString(),
      +limit,
    );

    return {
      success: true,
      count: activities.length,
      data: activities,
    };
  }
}
