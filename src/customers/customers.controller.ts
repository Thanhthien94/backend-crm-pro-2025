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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully.' })
  @ApiBearerAuth()
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Request() req: RequestWithUser,
  ) {
    const customer = await this.customersService.create(
      createCustomerDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: customer,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Returns all customers.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['lead', 'prospect', 'customer', 'churned'],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiBearerAuth()
  async findAll(
    @Request() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filters: { type?: string; status?: string; search?: string } = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const { customers, total } = await this.customersService.findAll(
      req.user.organization.toString(),
      filters,
      +page,
      +limit,
    );

    return {
      success: true,
      count: customers.length,
      pagination: {
        total,
        page: +page,
        pages: Math.ceil(total / +limit),
      },
      data: customers,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer' })
  @ApiResponse({ status: 200, description: 'Returns customer details.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const customer = await this.customersService.findById(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: customer,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req: RequestWithUser,
  ) {
    const customer = await this.customersService.update(
      id,
      updateCustomerDto,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: customer,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.customersService.remove(id, req.user.organization.toString());

    return {
      success: true,
      data: {},
    };
  }
}
