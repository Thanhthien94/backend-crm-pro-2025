import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Permission,
  PermissionDocument,
  ResourceType,
  ActionType,
} from './schemas/permission.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
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

  // Tạo role mới
  async createRole(data: {
    name: string;
    slug: string;
    organization: string;
    permissions: string[];
    description?: string;
    isDefault?: boolean;
  }): Promise<RoleDocument> {
    const role = new this.roleModel(data);
    return role.save();
  }

  // Lấy tất cả quyền
  async getAllPermissions(): Promise<PermissionDocument[]> {
    return this.permissionModel.find().sort({ resource: 1, action: 1 }).exec();
  }

  // Lấy tất cả role của organization
  async getRolesByOrganization(
    organizationId: string,
  ): Promise<RoleDocument[]> {
    return this.roleModel
      .find({ organization: organizationId })
      .populate('permissions')
      .exec();
  }
}
