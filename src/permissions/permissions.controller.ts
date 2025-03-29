// src/permissions/permissions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('list')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy danh sách tất cả quyền' })
  @ApiResponse({ status: 200, description: 'Danh sách quyền.' })
  @ApiBearerAuth()
  async getAllPermissions() {
    const permissions = await this.permissionsService.getAllPermissions();
    return {
      success: true,
      data: permissions,
    };
  }

  @Get('roles')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy danh sách vai trò' })
  @ApiResponse({ status: 200, description: 'Danh sách vai trò.' })
  @ApiBearerAuth()
  async getRoles(@Request() req: RequestWithUser) {
    const roles = await this.permissionsService.getRolesByOrganization(
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: roles,
    };
  }

  @Post('roles')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @ApiResponse({ status: 201, description: 'Vai trò đã được tạo.' })
  @ApiBearerAuth()
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @Request() req: RequestWithUser,
  ) {
    const role = await this.permissionsService.createRole({
      ...createRoleDto,
      organization: req.user.organization.toString(),
    });
    return {
      success: true,
      data: role,
    };
  }

  @Patch('roles/:id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cập nhật vai trò' })
  @ApiResponse({ status: 200, description: 'Vai trò đã được cập nhật.' })
  @ApiBearerAuth()
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req: RequestWithUser,
  ) {
    const role = await this.permissionsService.updateRole(
      id,
      updateRoleDto,
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: role,
    };
  }

  @Delete('roles/:id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiResponse({ status: 200, description: 'Vai trò đã được xóa.' })
  @ApiBearerAuth()
  async deleteRole(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.permissionsService.deleteRole(
      id,
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: {},
    };
  }

  @Post('roles/:id/assign')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Gán vai trò cho người dùng' })
  @ApiResponse({ status: 200, description: 'Vai trò đã được gán.' })
  @ApiBearerAuth()
  async assignRoleToUser(
    @Param('id') roleId: string,
    @Body('userId') userId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.permissionsService.assignRoleToUser(
      roleId,
      userId,
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: {},
    };
  }

  @Post('roles/:id/revoke')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Thu hồi vai trò từ người dùng' })
  @ApiResponse({ status: 200, description: 'Vai trò đã được thu hồi.' })
  @ApiBearerAuth()
  async revokeRoleFromUser(
    @Param('id') roleId: string,
    @Body('userId') userId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.permissionsService.revokeRoleFromUser(
      roleId,
      userId,
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: {},
    };
  }
}
