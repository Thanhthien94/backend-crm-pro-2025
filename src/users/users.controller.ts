import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: RequestWithUser,
  ) {
    const user = await this.usersService.create({
      ...createUserDto,
      organization: String(req.user.organization),
    });

    return {
      success: true,
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  @Get()
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Returns all users.' })
  async findAll(@Request() req: RequestWithUser) {
    const users = await this.usersService.findAll(
      req.user.organization,
    );

    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  @Get(':id')
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get a single user' })
  @ApiResponse({ status: 200, description: 'Returns user details.' })
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const user = await this.usersService.findById(id);

    // Verify user belongs to same organization
    if (String(user.organization) !== String(req.user.organization)) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: user,
    };
  }

  @Put(':id')
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);

    return {
      success: true,
      data: user,
    };
  }

  @Delete(':id')
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    // Don't allow deleting self
    if (id === String(req.user._id)) {
      return {
        success: false,
        error: 'Cannot delete your own account',
      };
    }

    await this.usersService.remove(id);

    return {
      success: true,
      data: {},
    };
  }
}
