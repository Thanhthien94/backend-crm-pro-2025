// src/analytics/analytics.controller.ts
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({
    status: 200,
    description: 'Returns dashboard analytics data.',
  })
  @ApiBearerAuth()
  async getDashboard(@Request() req: RequestWithUser) {
    const data = await this.analyticsService.getDashboardStats(
      req.user.organization.toString(),
    );

    return {
      success: true,
      data,
    };
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get sales analytics' })
  @ApiResponse({ status: 200, description: 'Returns sales analytics data.' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  async getSalesAnalytics(
    @Request() req: RequestWithUser,
    @Query() queryParams: QueryAnalyticsDto,
  ) {
    const data = await this.analyticsService.getSalesAnalytics(
      req.user.organization.toString(),
      queryParams,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer analytics' })
  @ApiResponse({
    status: 200,
    description: 'Returns customer analytics data.',
  })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  async getCustomerAnalytics(
    @Request() req: RequestWithUser,
    @Query() queryParams: QueryAnalyticsDto,
  ) {
    const data = await this.analyticsService.getCustomerAnalytics(
      req.user.organization.toString(),
      queryParams,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get activity analytics' })
  @ApiResponse({
    status: 200,
    description: 'Returns activity analytics data.',
  })
  @ApiBearerAuth()
  async getActivityAnalytics(
    @Request() req: RequestWithUser,
    @Query() queryParams: QueryAnalyticsDto,
  ) {
    const data = await this.analyticsService.getActivityAnalytics(
      req.user.organization.toString(),
      queryParams,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance analytics' })
  @ApiResponse({
    status: 200,
    description: 'Returns performance analytics data.',
  })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  async getPerformanceAnalytics(
    @Request() req: RequestWithUser,
    @Query() queryParams: QueryAnalyticsDto,
  ) {
    const data = await this.analyticsService.getPerformanceAnalytics(
      req.user.organization.toString(),
      queryParams,
    );

    return {
      success: true,
      data,
    };
  }
}
