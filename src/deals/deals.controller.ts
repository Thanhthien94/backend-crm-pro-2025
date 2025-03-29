import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('deals')
@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ status: 201, description: 'Deal created successfully.' })
  @ApiBearerAuth()
  async create(
    @Body() createDealDto: CreateDealDto,
    @Request() req: RequestWithUser,
  ) {
    const deal = await this.dealsService.create(
      createDealDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: deal,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all deals' })
  @ApiResponse({ status: 200, description: 'Returns all deals.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'stage',
    required: false,
    enum: [
      'lead',
      'qualified',
      'proposal',
      'negotiation',
      'closed-won',
      'closed-lost',
    ],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiBearerAuth()
  async findAll(
    @Request() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('stage') stage?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    const filters: {
      stage?: string;
      status?: string;
      search?: string;
      customerId?: string;
    } = {};
    if (stage) filters.stage = stage;
    if (status) filters.status = status;
    if (search) filters.search = search;
    if (customerId) filters.customerId = customerId;

    const { deals, total } = await this.dealsService.findAll(
      req.user.organization.toString(),
      filters,
      +page,
      +limit,
    );

    return {
      success: true,
      count: deals.length,
      pagination: {
        total,
        page: +page,
        pages: Math.ceil(total / +limit),
      },
      data: deals,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get deals summary' })
  @ApiResponse({ status: 200, description: 'Returns deals summary.' })
  @ApiBearerAuth()
  async getSummary(@Request() req: RequestWithUser) {
    const summary = await this.dealsService.getDealsSummary(
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: summary,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single deal' })
  @ApiResponse({ status: 200, description: 'Returns deal details.' })
  @ApiResponse({ status: 404, description: 'Deal not found.' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const deal = await this.dealsService.findById(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: deal,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a deal' })
  @ApiResponse({ status: 200, description: 'Deal updated successfully.' })
  @ApiResponse({ status: 404, description: 'Deal not found.' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateDealDto: UpdateDealDto,
    @Request() req: RequestWithUser,
  ) {
    const deal = await this.dealsService.update(
      id,
      updateDealDto,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: deal,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deal' })
  @ApiResponse({ status: 200, description: 'Deal deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Deal not found.' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.dealsService.remove(id, req.user.organization.toString());

    return {
      success: true,
      data: {},
    };
  }
}
