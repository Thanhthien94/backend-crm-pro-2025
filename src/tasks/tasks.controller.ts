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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully.' })
  @ApiBearerAuth()
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: RequestWithUser,
  ) {
    const task = await this.tasksService.create(
      createTaskDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: task,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({ status: 200, description: 'Returns all tasks.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high'],
  })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'dealId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'dueBefore', required: false, type: Date })
  @ApiQuery({ name: 'dueAfter', required: false, type: Date })
  @ApiQuery({ name: 'isOverdue', required: false, type: Boolean })
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
    @Query('search') search?: string,
    @Query('dueBefore', ParseDatePipe) dueBefore?: Date,
    @Query('dueAfter', ParseDatePipe) dueAfter?: Date,
    @Query('isOverdue') isOverdue?: boolean,
  ) {
    const filters = {
      status,
      priority,
      assignedTo,
      customerId,
      dealId,
      search,
      dueBefore,
      dueAfter,
      isOverdue: isOverdue === true || (typeof isOverdue === 'string' && isOverdue === 'true'),
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
  @ApiOperation({ summary: 'Get tasks summary' })
  @ApiResponse({ status: 200, description: 'Returns tasks summary.' })
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
  @ApiOperation({ summary: "Get current user's upcoming tasks" })
  @ApiResponse({ status: 200, description: 'Returns upcoming tasks.' })
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
  @ApiOperation({ summary: "Get current user's overdue tasks" })
  @ApiResponse({ status: 200, description: 'Returns overdue tasks.' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task' })
  @ApiResponse({ status: 200, description: 'Returns task details.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const task = await this.tasksService.findById(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: task,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: RequestWithUser,
  ) {
    const task = await this.tasksService.update(
      id,
      updateTaskDto,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: task,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.tasksService.remove(id, req.user.organization.toString());

    return {
      success: true,
      data: {},
    };
  }
}
