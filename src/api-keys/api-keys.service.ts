// src/api-keys/api-keys.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import * as crypto from 'crypto';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { AuditLogService } from '../access-control/services/audit-log.service';
import { AuditAction } from '../access-control/schemas/audit-log.schema';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Lấy tất cả API keys của một tổ chức
   */
  async findAll(
    organizationId: string,
    filters: { active?: boolean; search?: string } = {},
  ): Promise<ApiKeyDocument[]> {
    const query: any = { organization: organizationId };

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return this.apiKeyModel
      .find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Lấy thông tin một API key theo ID
   */
  async findById(id: string, organizationId: string): Promise<ApiKeyDocument> {
    const apiKey = await this.apiKeyModel
      .findOne({ _id: id, organization: organizationId })
      .populate('createdBy', 'name email')
      .lean()
      .exec();

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    return apiKey;
  }

  /**
   * Tạo key API ngẫu nhiên an toàn
   */
  private generateApiKey(): string {
    return `ak_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Tạo API key mới
   */
  async create(
    createApiKeyDto: CreateApiKeyDto,
    organizationId: string,
    userId: string,
  ): Promise<{ apiKey: ApiKeyDocument; generatedKey: string }> {
    // Kiểm tra số lượng API key hiện có
    const keyCount = await this.apiKeyModel.countDocuments({
      organization: organizationId,
    });

    // Giới hạn số lượng API key tùy theo plan (ví dụ)
    const maxKeys = 10; // Có thể tùy chỉnh theo plan của tổ chức
    if (keyCount >= maxKeys) {
      throw new BadRequestException(
        `Maximum number of API keys (${maxKeys}) reached`,
      );
    }

    // Tạo key ngẫu nhiên
    const generatedKey = this.generateApiKey();

    // Chuẩn bị resource permissions
    const resourcePermissions = this.getDefaultResourcePermissions(
      createApiKeyDto.permissions || ['read'],
    );

    // Tạo và lưu API key
    const apiKey = new this.apiKeyModel({
      name: createApiKeyDto.name,
      description: createApiKeyDto.description,
      key: generatedKey,
      organization: organizationId,
      createdBy: userId,
      expiresAt: createApiKeyDto.expiresAt
        ? new Date(createApiKeyDto.expiresAt)
        : undefined,
      permissions: createApiKeyDto.permissions || ['read'],
      resourcePermissions,
    });

    const savedKey = await apiKey.save();

    // Ghi log
    await this.auditLogService.log({
      userId,
      action: AuditAction.API_KEY_CREATED,
      resource: 'api_key',
      resourceId: savedKey._id?.toString(),
      organizationId,
      metadata: {
        name: savedKey.name,
        permissions: savedKey.permissions,
      },
    });

    // Return both the document and the generated key
    // Note: Chỉ hiển thị key đầy đủ một lần vì lý do bảo mật
    return {
      apiKey: savedKey,
      generatedKey,
    };
  }

  /**
   * Cập nhật API key
   */
  async update(
    id: string,
    updateApiKeyDto: UpdateApiKeyDto,
    organizationId: string,
    userId: string,
  ): Promise<ApiKeyDocument> {
    // Tạo đối tượng cập nhật
    const updateData: any = { ...updateApiKeyDto };

    // Xử lý ngày hết hạn nếu có
    if (updateApiKeyDto.expiresAt) {
      updateData.expiresAt = new Date(updateApiKeyDto.expiresAt);
    }

    // Cập nhật resource permissions nếu permissions thay đổi
    if (updateApiKeyDto.permissions) {
      updateData.resourcePermissions = this.getDefaultResourcePermissions(
        updateApiKeyDto.permissions,
      );
    }

    // Thực hiện cập nhật
    const apiKey = await this.apiKeyModel
      .findOneAndUpdate({ _id: id, organization: organizationId }, updateData, {
        new: true,
        runValidators: true,
      })
      .populate('createdBy', 'name email')
      .lean();

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    // Ghi log
    await this.auditLogService.log({
      userId,
      action: AuditAction.API_KEY_UPDATED,
      resource: 'api_key',
      resourceId: id,
      organizationId,
      metadata: {
        name: apiKey.name,
        changes: Object.keys(updateApiKeyDto),
      },
    });

    return apiKey;
  }

  /**
   * Xóa API key
   */
  async remove(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    // Tìm key trước khi xóa để ghi log
    const apiKey = await this.apiKeyModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    // Xóa API key
    await apiKey.deleteOne();

    // Ghi log
    await this.auditLogService.log({
      userId,
      action: AuditAction.API_KEY_REVOKED,
      resource: 'api_key',
      resourceId: id,
      organizationId,
      metadata: {
        name: apiKey.name,
      },
    });

    return true;
  }

  /**
   * Xác thực API key
   */
  async validateApiKey(key: string): Promise<ApiKeyDocument | null> {
    // Tìm API key
    const apiKey = await this.apiKeyModel
      .findOne({ key, active: true })
      .populate('organization')
      .exec();

    // Nếu key không tồn tại hoặc không hoạt động
    if (!apiKey) {
      return null;
    }

    // Kiểm tra nếu key đã hết hạn
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Tự động hủy kích hoạt key đã hết hạn
      await this.apiKeyModel.updateOne({ _id: apiKey._id }, { active: false });
      return null;
    }

    // Cập nhật thời gian sử dụng gần nhất
    await this.apiKeyModel.updateOne(
      { _id: apiKey._id },
      { lastUsedAt: new Date() },
    );

    return apiKey;
  }

  /**
   * Tạo lại API key
   */
  async regenerateKey(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<{ apiKey: ApiKeyDocument; generatedKey: string }> {
    // Tạo key mới
    const generatedKey = this.generateApiKey();

    // Cập nhật API key
    const apiKey = await this.apiKeyModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        { key: generatedKey },
        { new: true, runValidators: true },
      )
      .populate('createdBy', 'name email');

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    // Ghi log
    await this.auditLogService.log({
      userId,
      action: AuditAction.API_KEY_UPDATED,
      resource: 'api_key',
      resourceId: id,
      organizationId,
      metadata: {
        name: apiKey.name,
        operation: 'regenerate',
      },
    });

    // Trả về cả API key và key mới tạo
    return {
      apiKey,
      generatedKey,
    };
  }

  /**
   * Kiểm tra API key có quyền truy cập vào resource và action cụ thể
   */
  async hasPermission(
    apiKey: ApiKeyDocument,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // Admin có tất cả quyền
    if (apiKey.permissions.includes('admin')) {
      return true;
    }

    // Kiểm tra quyền cụ thể theo resource
    const resourcePermission = apiKey.resourcePermissions?.find(
      (perm) => perm.resource === resource,
    );

    if (resourcePermission) {
      return (
        resourcePermission.actions.includes(action) ||
        resourcePermission.actions.includes('manage')
      );
    }

    // Kiểm tra quyền chung
    switch (action) {
      case 'read':
        return apiKey.permissions.includes('read');
      case 'create':
      case 'update':
        return apiKey.permissions.includes('write');
      case 'delete':
        return apiKey.permissions.includes('delete');
      default:
        return false;
    }
  }

  /**
   * Lấy danh sách quyền mặc định theo resource
   */
  private getDefaultResourcePermissions(permissions: string[]): Array<{
    resource: string;
    actions: string[];
  }> {
    const resources = ['customer', 'deal', 'task', 'product'];
    const result: Array<{ resource: string; actions: string[] }> = [];

    // Tính toán các action mặc định dựa trên permissions
    for (const resource of resources) {
      const actions: string[] = [];

      if (permissions.includes('admin')) {
        actions.push('manage');
      } else {
        if (permissions.includes('read')) {
          actions.push('read');
        }
        if (permissions.includes('write')) {
          actions.push('create', 'update');
        }
        if (permissions.includes('delete')) {
          actions.push('delete');
        }
      }

      if (actions.length > 0) {
        result.push({ resource, actions });
      }
    }

    return result;
  }

  /**
   * Cập nhật quyền theo resource
   */
  async updateResourcePermissions(
    id: string,
    resourcePermissions: Array<{
      resource: string;
      actions: string[];
    }>,
    organizationId: string,
    userId: string,
  ): Promise<ApiKeyDocument> {
    // Xác thực đầu vào
    if (!Array.isArray(resourcePermissions)) {
      throw new BadRequestException('resourcePermissions must be an array');
    }

    // Kiểm tra mỗi item có đúng cấu trúc không
    for (const item of resourcePermissions) {
      if (!item.resource || !Array.isArray(item.actions)) {
        throw new BadRequestException(
          'Each resource permission must have resource and actions',
        );
      }
    }

    // Cập nhật quyền
    const apiKey = await this.apiKeyModel.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { resourcePermissions },
      { new: true },
    );

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    // Ghi log
    await this.auditLogService.log({
      userId,
      action: AuditAction.API_KEY_UPDATED,
      resource: 'api_key',
      resourceId: id,
      organizationId,
      metadata: {
        name: apiKey.name,
        operation: 'update_permissions',
      },
    });

    return apiKey;
  }

  /**
   * Lấy thống kê về API key
   */
  async getApiKeyStats(organizationId: string): Promise<any> {
    const pipeline: PipelineStage[] = [
      {
        $match: { organization: organizationId },
      },
      {
        $group: {
          _id: {
            active: '$active',
          },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.apiKeyModel.aggregate(pipeline);

    // Định dạng kết quả
    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
    };

    results.forEach((result) => {
      if (result._id.active === true) {
        stats.active = result.count;
      } else {
        stats.inactive = result.count;
      }
      stats.total += result.count;
    });

    return stats;
  }

  /**
   * Lấy lịch sử sử dụng API key
   */
  async getApiKeyUsage(
    id: string,
    organizationId: string,
    days = 30,
  ): Promise<any> {
    // Kiểm tra API key có tồn tại không
    const apiKey = await this.findById(id, organizationId);

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    // Giả lập dữ liệu sử dụng (trong thực tế nên lấy từ bảng logs)
    const today = new Date();
    const result: Array<{ date: string; requests: number }> = [];

    // Tạo dữ liệu mẫu cho 30 ngày
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      result.push({
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 100), // Giả lập số lượng request
      });
    }

    return result;
  }

  /**
   * Vô hiệu hóa tất cả API key đã hết hạn
   * Có thể chạy trong cron job
   */
  async deactivateExpiredKeys(): Promise<number> {
    const result = await this.apiKeyModel.updateMany(
      {
        active: true,
        expiresAt: { $lt: new Date() },
      },
      {
        active: false,
      },
    );

    return result.modifiedCount;
  }
}
