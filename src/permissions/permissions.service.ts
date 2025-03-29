import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Permission,
  PermissionDocument,
  ResourceType,
  ActionType,
} from './schemas/permission.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { User, UserDocument } from '../users/entities/user.entity';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.seedDefaultPermissions();
  }

  // Khởi tạo các quyền mặc định
  private async seedDefaultPermissions() {
    const count = await this.permissionModel.countDocuments();
    if (count > 0) return;

    const defaultPermissions: Partial<Permission>[] = [];

    // Tạo tất cả các permission cơ bản
    for (const resource of Object.values(ResourceType)) {
      for (const action of Object.values(ActionType)) {
        defaultPermissions.push({
          name: `${this.capitalizeFirstLetter(action)} ${resource}`,
          resource,
          action,
          slug: `${resource}:${action}`,
          description: `Permission to ${action} ${resource}`,
        });
      }
    }

    await this.permissionModel.insertMany(defaultPermissions);
    console.log('Default permissions seeded.');
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Kiểm tra quyền
  async hasPermission(
    user: User,
    resource: ResourceType,
    action: ActionType,
  ): Promise<boolean> {
    // Admin luôn có tất cả quyền
    if (user.role === 'admin' || user.role === 'superadmin') {
      return true;
    }

    // Lấy tất cả role của user
    const userRoles = await this.roleModel
      .find({ _id: { $in: user.roles } })
      .populate('permissions')
      .exec();

    // Kiểm tra quyền từ các role
    for (const role of userRoles) {
      const permissions = role.permissions as unknown as PermissionDocument[];

      // Kiểm tra quyền cụ thể
      const hasSpecificPermission = permissions.some(
        (perm) =>
          perm.resource === resource &&
          (perm.action === action || perm.action === ActionType.MANAGE),
      );

      if (hasSpecificPermission) {
        return true;
      }
    }

    return false;
  }

  // Lấy tất cả quyền
  async getAllPermissions(): Promise<PermissionDocument[]> {
    return this.permissionModel
      .find()
      .sort({ resource: 1, action: 1 })
      .lean()
      .exec();
  }

  // Lấy tất cả role của organization
  async getRolesByOrganization(
    organizationId: string,
  ): Promise<RoleDocument[]> {
    return this.roleModel
      .find({ organization: organizationId })
      .select('name slug description isDefault')
      .populate('permissions', 'name resource action')
      .exec();
  }

  async createRole(data: {
    name: string;
    slug: string;
    organization: string;
    permissions: string[];
    description?: string;
    isDefault?: boolean;
  }): Promise<RoleDocument> {
    // Kiểm tra slug đã tồn tại chưa
    const existingRole = await this.roleModel.findOne({
      slug: data.slug,
      organization: data.organization,
    });

    if (existingRole) {
      throw new Error(`Role with slug "${data.slug}" already exists`);
    }

    const role = new this.roleModel(data);
    return role.save();
  }

  async updateRole(
    id: string,
    updateRoleDto: UpdateRoleDto,
    organizationId: string,
  ): Promise<RoleDocument> {
    // Kiểm tra nếu slug thay đổi và đã tồn tại
    if (updateRoleDto.slug) {
      const existingRole = await this.roleModel.findOne({
        slug: updateRoleDto.slug,
        organization: organizationId,
        _id: { $ne: id },
      });

      if (existingRole) {
        throw new Error(
          `Role with slug "${updateRoleDto.slug}" already exists`,
        );
      }
    }

    const role = await this.roleModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateRoleDto,
        { new: true },
      )
      .populate('permissions');

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async deleteRole(id: string, organizationId: string): Promise<boolean> {
    // Kiểm tra nếu có người dùng đang sử dụng role này
    const usersWithRole = await this.userModel.countDocuments({
      roles: id,
    });

    if (usersWithRole > 0) {
      throw new Error(
        `Cannot delete role because it is assigned to ${usersWithRole} users`,
      );
    }

    const result = await this.roleModel.deleteOne({
      _id: id,
      organization: organizationId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return true;
  }

  async assignRoleToUser(
    roleId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Kiểm tra role có tồn tại không
    const role = await this.roleModel.findOne({
      _id: roleId,
      organization: organizationId,
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Kiểm tra user có tồn tại không
    const user = await this.userModel.findOne({
      _id: userId,
      organization: organizationId,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Thêm role vào user nếu chưa có
    if (!user.roles.some(role => role.toString() === roleId)) {
      await this.userModel.updateOne(
        { _id: userId },
        { $addToSet: { roles: roleId } },
      );
    }
  }

  async revokeRoleFromUser(
    roleId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Kiểm tra role có tồn tại không
    const role = await this.roleModel.findOne({
      _id: roleId,
      organization: organizationId,
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Kiểm tra user có tồn tại không
    const user = await this.userModel.findOne({
      _id: userId,
      organization: organizationId,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Xóa role khỏi user
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { roles: roleId } },
    );
  }
}
