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
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { AccessControl } from '../access-control/decorators/access-control.decorator';
import { AccessControlGuard } from '../access-control/guards/access-control.guard';
import { ResourceInterceptor } from '../policies/interceptors/resource.interceptor';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'create')
  @ApiOperation({ summary: 'Tạo khách hàng mới' })
  @ApiResponse({
    status: 201,
    description: 'Khách hàng đã được tạo thành công.',
  })
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
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy danh sách khách hàng' })
  @ApiResponse({ status: 200, description: 'Trả về tất cả khách hàng.' })
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
  @UseInterceptors(ResourceInterceptor)
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết khách hàng' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin khách hàng.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng.' })
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
  @UseInterceptors(ResourceInterceptor)
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'update')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng' })
  @ApiResponse({
    status: 200,
    description: 'Khách hàng đã được cập nhật thành công.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng.' })
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
  @UseInterceptors(ResourceInterceptor)
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'delete')
  @ApiOperation({ summary: 'Xóa khách hàng' })
  @ApiResponse({
    status: 200,
    description: 'Khách hàng đã được xóa thành công.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng.' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.customersService.remove(id, req.user.organization.toString());

    return {
      success: true,
      data: {},
    };
  }

  @Get('by-type/:type')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy khách hàng theo loại' })
  @ApiResponse({ status: 200, description: 'Trả về khách hàng theo loại.' })
  @ApiBearerAuth()
  async findByType(
    @Param('type') type: string,
    @Request() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const filters = { type };
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

  @Get('assigned-to/me')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy khách hàng được gán cho người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Trả về khách hàng được gán.' })
  @ApiBearerAuth()
  async findAssignedToMe(
    @Request() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const filters: any = {
      assignedTo: req.user._id?.toString(),
    };

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

  @Patch(':id/assign')
  @UseInterceptors(ResourceInterceptor)
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'assign')
  @ApiOperation({ summary: 'Gán khách hàng cho người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Khách hàng đã được gán thành công.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng.' })
  @ApiBearerAuth()
  async assignCustomer(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @Request() req: RequestWithUser,
  ) {
    const customer = await this.customersService.update(
      id,
      { assignedTo },
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: customer,
    };
  }

  @Get('stats/by-type')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy thống kê khách hàng theo loại' })
  @ApiResponse({ status: 200, description: 'Trả về thống kê khách hàng.' })
  @ApiBearerAuth()
  async getStatsByType(
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; data: any }> {
    const stats = await this.customersService.getStatsByType(
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get('recent/created')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy khách hàng được tạo gần đây' })
  @ApiResponse({ status: 200, description: 'Trả về khách hàng gần đây.' })
  @ApiBearerAuth()
  async getRecentlyCreated(
    @Request() req: RequestWithUser,
    @Query('limit') limit = 5,
  ) {
    const customers = await this.customersService.getRecentlyCreated(
      req.user.organization.toString(),
      +limit,
    );

    return {
      success: true,
      count: customers.length,
      data: customers,
    };
  }

  @Post('bulk-delete')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'delete')
  @ApiOperation({ summary: 'Xóa nhiều khách hàng' })
  @ApiResponse({
    status: 200,
    description: 'Các khách hàng đã được xóa thành công.',
  })
  @ApiBearerAuth()
  async bulkDelete(
    @Body('ids') ids: string[],
    @Request() req: RequestWithUser,
  ) {
    const result = await this.customersService.bulkDelete(
      ids,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
    };
  }

  @Post('import-validate')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'create')
  @ApiOperation({ summary: 'Kiểm tra dữ liệu nhập khẩu' })
  @ApiResponse({ status: 200, description: 'Dữ liệu hợp lệ.' })
  @ApiBearerAuth()
  async validateImportData(
    @Body() data: any[],
    @Request() req: RequestWithUser,
  ) {
    const validationResult = await this.customersService.validateImportData(
      data,
      req.user.organization.toString(),
    );

    return {
      success: validationResult.valid,
      data: validationResult,
    };
  }

  @Get(':id/deals')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy danh sách deals liên quan đến khách hàng' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách deals.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng.' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBearerAuth()
  async getRelatedDeals(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    // Kiểm tra khách hàng có tồn tại không
    await this.customersService.findById(id, req.user.organization.toString());

    const deals = await this.customersService.getRelatedDeals(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      count: deals.length,
      data: deals,
    };
  }

  @Get(':id/tasks')
  @UseGuards(AccessControlGuard)
  @AccessControl('customer', 'read')
  @ApiOperation({ summary: 'Lấy danh sách tasks liên quan đến khách hàng' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách tasks.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng.' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBearerAuth()
  async getRelatedTasks(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    // Kiểm tra khách hàng có tồn tại không
    await this.customersService.findById(id, req.user.organization.toString());

    const tasks = await this.customersService.getRelatedTasks(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      count: tasks.length,
      data: tasks,
    };
  }
}
