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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { RelatedEntityType } from '../common/enums/related-entity-type.enum';
import { AccessControl } from '../access-control/decorators/access-control.decorator';
import { AccessControlGuard } from '../access-control/guards/access-control.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'create')
  @ApiOperation({ summary: 'Tạo task mới' })
  @ApiResponse({ status: 201, description: 'Task đã được tạo thành công.' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc thiếu thông tin bắt buộc.',
  })
  @ApiBearerAuth()
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      const task = await this.tasksService.create(
        createTaskDto,
        req.user.organization.toString(),
        req.user._id?.toString() || '',
      );

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'read')
  @ApiOperation({ summary: 'Lấy danh sách task' })
  @ApiResponse({ status: 200, description: 'Trả về tất cả task.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng task mỗi trang',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
    description: 'Lọc theo trạng thái',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high'],
    description: 'Lọc theo mức độ ưu tiên',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    type: String,
    description: 'Lọc theo người được gán',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: String,
    description: 'Lọc theo khách hàng',
  })
  @ApiQuery({
    name: 'dealId',
    required: false,
    type: String,
    description: 'Lọc theo thương vụ',
  })
  @ApiQuery({
    name: 'relatedTo',
    required: false,
    type: String,
    description: 'ID của đối tượng liên kết',
  })
  @ApiQuery({
    name: 'relatedType',
    required: false,
    enum: RelatedEntityType,
    description: 'Loại đối tượng liên kết',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm kiếm theo tên hoặc mô tả',
  })
  @ApiQuery({
    name: 'dueBefore',
    required: false,
    type: Date,
    description: 'Hạn chót trước ngày',
  })
  @ApiQuery({
    name: 'dueAfter',
    required: false,
    type: Date,
    description: 'Hạn chót sau ngày',
  })
  @ApiQuery({
    name: 'isOverdue',
    required: false,
    type: Boolean,
    description: 'Đã quá hạn',
  })
  @ApiBearerAuth()
  async findAll(
    @Request() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('customerId') customerId?: string,
    @Query('dealId') dealId?: string,
    @Query('relatedTo') relatedTo?: string,
    @Query('relatedType') relatedType?: RelatedEntityType,
    @Query('search') search?: string,
    @Query('dueBefore', new ParseDatePipe()) dueBefore?: Date,
    @Query('dueAfter', new ParseDatePipe()) dueAfter?: Date,
    @Query('isOverdue') isOverdue?: string | boolean,
  ) {
    // Kiểm tra tính hợp lệ của relatedTo và relatedType
    if ((relatedTo && !relatedType) || (!relatedTo && relatedType)) {
      throw new BadRequestException(
        'Cả relatedTo và relatedType phải được cung cấp cùng nhau',
      );
    }

    // Chuyển đổi isOverdue sang boolean
    const isOverdueBool =
      isOverdue === true ||
      (typeof isOverdue === 'string' && isOverdue.toLowerCase() === 'true');

    const filters = {
      status,
      priority,
      assignedTo,
      customerId,
      dealId,
      relatedTo,
      relatedType,
      search,
      dueBefore,
      dueAfter,
      isOverdue: isOverdueBool,
    };

    const { tasks, total } = await this.tasksService.findAll(
      req.user.organization.toString(),
      filters,
      +page,
      +limit,
    );

    return {
      success: true,
      count: tasks.length,
      pagination: {
        total,
        page: +page,
        pages: Math.ceil(total / +limit),
      },
      data: tasks,
    };
  }

  @Get('summary')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'read')
  @ApiOperation({ summary: 'Lấy thống kê task' })
  @ApiResponse({ status: 200, description: 'Trả về thống kê task.' })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Lọc theo người dùng cụ thể',
  })
  @ApiBearerAuth()
  async getSummary(
    @Request() req: RequestWithUser,
    @Query('userId') userId?: string,
  ) {
    const summary = await this.tasksService.getTasksSummary(
      req.user.organization.toString(),
      userId,
    );

    return {
      success: true,
      data: summary,
    };
  }

  @Get('upcoming')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'read')
  @ApiOperation({ summary: 'Lấy task sắp đến hạn của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Trả về task sắp đến hạn.' })
  @ApiBearerAuth()
  async getUpcoming(@Request() req: RequestWithUser) {
    const tasks = await this.tasksService.getUpcomingTasks(
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: tasks,
    };
  }

  @Get('overdue')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'read')
  @ApiOperation({ summary: 'Lấy task quá hạn của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Trả về task quá hạn.' })
  @ApiBearerAuth()
  async getOverdue(@Request() req: RequestWithUser) {
    const tasks = await this.tasksService.getOverdueTasks(
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: tasks,
    };
  }

  @Get('by-relation/:relatedType/:relatedId')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'read')
  @ApiOperation({ summary: 'Lấy task theo đối tượng liên kết' })
  @ApiResponse({
    status: 200,
    description: 'Trả về task theo đối tượng liên kết.',
  })
  @ApiParam({
    name: 'relatedType',
    enum: RelatedEntityType,
    description: 'Loại đối tượng liên kết',
  })
  @ApiParam({
    name: 'relatedId',
    description: 'ID của đối tượng liên kết',
  })
  @ApiBearerAuth()
  async getByRelation(
    @Param('relatedType') relatedType: RelatedEntityType,
    @Param('relatedId') relatedId: string,
    @Request() req: RequestWithUser,
  ) {
    const tasks = await this.tasksService.findByRelation(
      req.user.organization.toString(),
      relatedType,
      relatedId,
    );

    return {
      success: true,
      count: tasks.length,
      data: tasks,
    };
  }

  @Get(':id')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết task' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin task.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy task.' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      const task = await this.tasksService.findById(
        id,
        req.user.organization.toString(),
      );

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Lỗi không xác định',
      );
    }
  }

  @Patch(':id')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'update')
  @ApiOperation({ summary: 'Cập nhật task' })
  @ApiResponse({
    status: 200,
    description: 'Task đã được cập nhật thành công.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy task.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Kiểm tra tính hợp lệ của relatedTo và relatedType
      if (
        (updateTaskDto.relatedTo && !updateTaskDto.relatedType) ||
        (!updateTaskDto.relatedTo && updateTaskDto.relatedType)
      ) {
        throw new BadRequestException(
          'Cả relatedTo và relatedType phải được cung cấp cùng nhau',
        );
      }

      const task = await this.tasksService.update(
        id,
        updateTaskDto,
        req.user.organization.toString(),
      );

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Lỗi không xác định',
      );
    }
  }

  @Patch(':id/complete')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'update')
  @ApiOperation({ summary: 'Đánh dấu task hoàn thành' })
  @ApiResponse({
    status: 200,
    description: 'Task đã được đánh dấu hoàn thành.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy task.' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBearerAuth()
  async completeTask(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      const task = await this.tasksService.update(
        id,
        { status: 'completed', completedAt: new Date() },
        req.user.organization.toString(),
      );

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Lỗi không xác định',
      );
    }
  }

  @Delete(':id')
  @UseGuards(AccessControlGuard)
  @AccessControl('task', 'delete')
  @ApiOperation({ summary: 'Xóa task' })
  @ApiResponse({ status: 200, description: 'Task đã được xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy task.' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      await this.tasksService.remove(id, req.user.organization.toString());

      return {
        success: true,
        message: 'Task đã được xóa thành công',
        data: {},
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Lỗi không xác định',
      );
    }
  }

  @Post('bulk')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard, AccessControlGuard)
  @AccessControl('task', 'create')
  @ApiOperation({ summary: 'Tạo nhiều task cùng lúc' })
  @ApiResponse({ status: 201, description: 'Các task đã được tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiBearerAuth()
  async createBulk(
    @Body() createTaskDtos: CreateTaskDto[],
    @Request() req: RequestWithUser,
  ) {
    try {
      const tasks = await Promise.all(
        createTaskDtos.map((dto) =>
          this.tasksService.create(
            dto,
            req.user.organization.toString(),
            req.user._id?.toString() || '',
          ),
        ),
      );

      return {
        success: true,
        count: tasks.length,
        data: tasks,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Lỗi không xác định',
      );
    }
  }

  @Delete('bulk')
  @Roles('admin')
  @UseGuards(RolesGuard, AccessControlGuard)
  @AccessControl('task', 'delete')
  @ApiOperation({ summary: 'Xóa nhiều task cùng lúc' })
  @ApiResponse({ status: 200, description: 'Các task đã được xóa thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiBearerAuth()
  async removeBulk(
    @Body('ids') ids: string[],
    @Request() req: RequestWithUser,
  ) {
    try {
      const result = await this.tasksService.bulkDelete(
        ids,
        req.user.organization.toString(),
      );

      return {
        success: true,
        data: {
          deletedCount: result.deletedCount,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Lỗi không xác định',
      );
    }
  }
}
