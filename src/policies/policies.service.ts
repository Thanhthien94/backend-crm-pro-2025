// src/policies/policies.service.ts
import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BasePolicyRule,
  PolicyAttributes,
} from './interfaces/policy-rule.interface';
import { OwnershipRule } from './rules/ownership-rule';
import { SameOrganizationRule } from './rules/same-organization-rule';
import { RoleBasedRule } from './rules/role-based-rule';
import { CustomJsRule } from './rules/custom-js-rule';
import { FieldValueRule } from './rules/field-value-rule';
import { RuleFactory } from './factories/rule.factory';
import {
  DynamicPolicy,
  DynamicPolicyDocument,
} from './schemas/dynamic-policy.schema';
import {
  PolicyRule,
  PolicyRuleDocument,
  RuleType,
} from './schemas/policy-rule.schema';
import { CreateDynamicPolicyDto } from './dto/create-dynamic-policy.dto';
import { UpdateDynamicPolicyDto } from './dto/update-dynamic-policy.dto';
import { CreatePolicyRuleDto } from './dto/create-policy-rule.dto';
import { UpdatePolicyRuleDto } from './dto/update-policy-rule.dto';
import { AuditLogService } from '../access-control/services/audit-log.service';
import { AuditAction } from '../access-control/schemas/audit-log.schema';
import { CacheService } from '../common/services/cache.service';
import { AccessLogService } from '../access-control/services/access-log.service';
import { Operator } from './rules/field-value-rule';

@Injectable()
export class PoliciesService implements OnModuleInit {
  private readonly logger = new Logger(PoliciesService.name);

  // Lưu trữ các policy rule
  private staticPolicyMap: Map<string, BasePolicyRule[]> = new Map();
  private dynamicPolicyMap: Map<string, BasePolicyRule[]> = new Map();

  // Flag để theo dõi trạng thái khởi tạo
  private initialized = false;

  constructor(
    @InjectModel(DynamicPolicy.name)
    private dynamicPolicyModel: Model<DynamicPolicyDocument>,
    @InjectModel(PolicyRule.name)
    private policyRuleModel: Model<PolicyRuleDocument>,
    private ruleFactory: RuleFactory,
    private auditLogService: AuditLogService,
    private cacheService: CacheService,
    private accessLogService: AccessLogService,
  ) {}

  async onModuleInit() {
    try {
      this.initializeStaticPolicies();
      await this.loadDynamicPolicies();
      this.initialized = true;
      this.logger.log('Policy service initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize policy service: ${error.message}`,
        error.stack,
      );
      // Không đặt initialized = true vì khởi tạo thất bại
    }
  }

  /**
   * Khởi tạo các policy tĩnh mặc định
   * Các policy này được định nghĩa trực tiếp trong code
   */
  private initializeStaticPolicies() {
    // Định nghĩa các policy mặc định cho khách hàng (customer)
    this.defineStaticPolicy('customer:read', [
      new SameOrganizationRule(), // Người dùng phải cùng tổ chức với khách hàng
      new RoleBasedRule(['admin', 'user']), // Người dùng phải có quyền admin hoặc user
    ]);

    this.defineStaticPolicy('customer:create', [
      new RoleBasedRule(['admin', 'user']), // Người dùng phải có quyền admin hoặc user
    ]);

    this.defineStaticPolicy('customer:update', [
      new SameOrganizationRule(), // Người dùng phải cùng tổ chức với khách hàng
      new OwnershipRule(), // Người dùng phải là người quản lý khách hàng
    ]);

    this.defineStaticPolicy('customer:delete', [
      new SameOrganizationRule(), // Người dùng phải cùng tổ chức với khách hàng
      new RoleBasedRule(['admin']), // Chỉ admin mới được xóa khách hàng
    ]);

    this.defineStaticPolicy('customer:assign', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin', 'manager']),
    ]);

    // Định nghĩa các policy mặc định cho deal
    this.defineStaticPolicy('deal:read', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin', 'user']),
    ]);

    this.defineStaticPolicy('deal:create', [
      new RoleBasedRule(['admin', 'user']),
    ]);

    this.defineStaticPolicy('deal:update', [
      new SameOrganizationRule(),
      new OwnershipRule(),
    ]);

    this.defineStaticPolicy('deal:delete', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin']),
    ]);

    // Định nghĩa các policy mặc định cho task
    this.defineStaticPolicy('task:read', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin', 'user']),
    ]);

    this.defineStaticPolicy('task:create', [
      new RoleBasedRule(['admin', 'user']),
    ]);

    this.defineStaticPolicy('task:update', [
      new SameOrganizationRule(),
      new OwnershipRule(),
    ]);

    this.defineStaticPolicy('task:delete', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin']),
    ]);

    // Policy cho api key
    this.defineStaticPolicy('api_key:create', [new RoleBasedRule(['admin'])]);

    this.defineStaticPolicy('api_key:read', [new RoleBasedRule(['admin'])]);

    this.defineStaticPolicy('api_key:update', [new RoleBasedRule(['admin'])]);

    this.defineStaticPolicy('api_key:delete', [new RoleBasedRule(['admin'])]);

    // Policy cho webhook
    this.defineStaticPolicy('webhook:create', [new RoleBasedRule(['admin'])]);

    this.defineStaticPolicy('webhook:read', [new RoleBasedRule(['admin'])]);

    this.defineStaticPolicy('webhook:update', [new RoleBasedRule(['admin'])]);

    this.defineStaticPolicy('webhook:delete', [new RoleBasedRule(['admin'])]);

    // Policy cho product
    this.defineStaticPolicy('product:read', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin', 'user']),
    ]);

    this.defineStaticPolicy('product:create', [new RoleBasedRule(['admin'])]);

    this.defineStaticPolicy('product:update', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin']),
    ]);

    this.defineStaticPolicy('product:delete', [
      new SameOrganizationRule(),
      new RoleBasedRule(['admin']),
    ]);

    this.logger.debug(
      `Initialized ${this.staticPolicyMap.size} static policies`,
    );
  }

  /**
   * Load policy động từ cơ sở dữ liệu
   */
  async loadDynamicPolicies() {
    try {
      // Xóa các policy động hiện tại
      this.dynamicPolicyMap.clear();

      // Lấy tất cả policy đang active
      const dynamicPolicies = await this.dynamicPolicyModel
        .find({ active: true })
        .lean()
        .exec();

      // Thống kê số lượng policy
      const policyByOrganization = new Map<string, number>();

      // Lấy và khởi tạo rule cho mỗi policy
      for (const policy of dynamicPolicies) {
        const organizationId = policy.organization.toString();

        // Cập nhật thống kê
        policyByOrganization.set(
          organizationId,
          (policyByOrganization.get(organizationId) || 0) + 1,
        );

        // Tìm tất cả rule đang hoạt động của policy, sắp xếp theo thứ tự
        const rules = await this.policyRuleModel
          .find({ policy: policy._id, active: true })
          .sort({ order: 1 })
          .lean()
          .exec();

        const policyRules: BasePolicyRule[] = [];

        // Tạo instance cho mỗi rule
        for (const rule of rules) {
          try {
            const ruleInstance = this.ruleFactory.createRule(
              rule.type,
              rule.config,
            );
            policyRules.push(ruleInstance);
          } catch (error) {
            this.logger.error(
              `Error creating rule for policy ${policy.name}:`,
              error.message,
            );
          }
        }

        // Lưu policy rules nếu có ít nhất một rule
        if (policyRules.length > 0) {
          this.dynamicPolicyMap.set(policy.key, policyRules);
        }
      }

      // Log thống kê
      this.logger.log(
        `Loaded ${this.dynamicPolicyMap.size} dynamic policies from ${dynamicPolicies.length} records`,
      );
      for (const [orgId, count] of policyByOrganization.entries()) {
        this.logger.debug(`Organization ${orgId}: ${count} policies`);
      }

      // Lưu thời gian load gần nhất
      this.cacheService.set(
        'policies-last-reload',
        new Date().getTime(),
        3600 * 1000,
      );
    } catch (error) {
      this.logger.error(
        'Failed to load dynamic policies:',
        error.message,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Định nghĩa một policy tĩnh
   */
  defineStaticPolicy(policyKey: string, rules: BasePolicyRule[]) {
    this.staticPolicyMap.set(policyKey, rules);
  }

  /**
   * Đánh giá policy - kiểm tra quyền dựa trên các rule
   * Ưu tiên policy động trước, sau đó mới đến policy tĩnh
   */
  async evaluatePolicy(
    policyKey: string,
    user: any,
    resource: any,
    context: any = {},
  ): Promise<boolean> {
    // Kiểm tra service đã khởi tạo chưa
    if (!this.initialized) {
      this.logger.warn(
        'Policy service not initialized yet, using static policies only',
      );
      // Chỉ dùng policy tĩnh nếu chưa khởi tạo xong
      return this.evaluateStaticPolicy(policyKey, user, resource, context);
    }

    // Kiểm tra cache
    const cacheKey = `policy_${policyKey}_${user._id}_${resource?._id || 'no-resource'}`;
    if (this.cacheService.has(cacheKey)) {
      return this.cacheService.get(cacheKey);
    }

    // Thử reload policy nếu cần (kiểm tra thời gian reload)
    const lastReload = this.cacheService.get('policies-last-reload') || 0;
    const now = new Date().getTime();
    if (now - lastReload > 300000) {
      // 5 phút
      try {
        await this.loadDynamicPolicies();
      } catch (error) {
        this.logger.error(`Auto-reload policies failed: ${error.message}`);
        // Tiếp tục với dữ liệu hiện có
      }
    }

    // Kiểm tra trước tiên trong policy động
    let result = false;

    if (this.dynamicPolicyMap.has(policyKey)) {
      result = this.evaluatePolicyRules(
        this.dynamicPolicyMap.get(policyKey) || [],
        policyKey,
        user,
        resource,
        context,
      );
    } else {
      // Nếu không tìm thấy trong policy động, kiểm tra trong policy tĩnh
      result = this.evaluateStaticPolicy(policyKey, user, resource, context);
    }

    // Lưu kết quả vào cache với TTL 5 phút
    this.cacheService.set(cacheKey, result, 300000);

    // Log việc kiểm tra quyền (nếu cần)
    this.logAccessEvaluation(policyKey, user, resource, result);

    return result;
  }

  /**
   * Đánh giá policy tĩnh
   */
  private evaluateStaticPolicy(
    policyKey: string,
    user: any,
    resource: any,
    context: any = {},
  ): boolean {
    const staticRules = this.staticPolicyMap.get(policyKey);
    if (!staticRules || staticRules.length === 0) {
      this.logger.warn(`No static policy found for key: ${policyKey}`);
      return false;
    }

    return this.evaluatePolicyRules(
      staticRules,
      policyKey,
      user,
      resource,
      context,
    );
  }

  /**
   * Đánh giá một danh sách rules
   */
  private evaluatePolicyRules(
    rules: BasePolicyRule[],
    policyKey: string,
    user: any,
    resource: any,
    context: any = {},
  ): boolean {
    if (!rules || rules.length === 0) {
      return false;
    }

    const action = policyKey.split(':')[1];
    const attributes: PolicyAttributes = {
      user,
      resource,
      action,
      context,
    };

    // Tất cả rules phải pass để policy đánh giá là true
    return rules.every((rule) => {
      try {
        return rule.evaluate(attributes);
      } catch (error) {
        this.logger.error(
          `Error evaluating rule for policy ${policyKey}:`,
          error.message,
        );
        return false; // Nếu lỗi, coi như rule không pass
      }
    });
  }

  /**
   * Ghi log việc kiểm tra quyền
   */
  private async logAccessEvaluation(
    policyKey: string,
    user: any,
    resource: any,
    result: boolean,
  ): Promise<void> {
    try {
      // Bóc tách resource và action từ policyKey
      const [resourceType, action] = policyKey.split(':');

      // Lấy ID của resource nếu có
      const resourceId = resource?._id?.toString();

      // Ghi log vào access log
      await this.accessLogService.logAccess({
        userId: user._id?.toString() || 'unknown',
        resource: resourceType,
        action: action,
        resourceId: resourceId,
        allowed: result,
        metadata: {
          policyKey,
          resourceType: resource?.constructor?.name,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log access evaluation: ${error.message}`);
      // Không ảnh hưởng đến luồng chính
    }
  }

  // Tạo policy key từ resource và action
  static createPolicyKey(resource: string, action: string): string {
    return `${resource}:${action}`;
  }

  /**
   * Reload policy động
   */
  async reloadDynamicPolicies(): Promise<void> {
    // Xóa cache của policy để cập nhật các quyết định mới nhất
    this.clearPolicyCache();

    // Reload policy từ database
    await this.loadDynamicPolicies();
  }

  /**
   * Xóa cache policy
   */
  clearPolicyCache(): void {
    // Lấy tất cả key bắt đầu bằng "policy_"
    const cacheKeys = this.cacheService
      .getKeys()
      .filter((key) => key.startsWith('policy_'));

    // Xóa từng key
    for (const key of cacheKeys) {
      this.cacheService.delete(key);
    }

    this.logger.debug(`Cleared ${cacheKeys.length} policy cache entries`);
  }

  /**
   * Xóa cache cho một policy cụ thể
   */
  clearPolicyCacheForKey(policyKey: string): void {
    // Lấy tất cả key bắt đầu bằng "policy_${policyKey}"
    const cacheKeys = this.cacheService
      .getKeys()
      .filter((key) => key.startsWith(`policy_${policyKey}`));

    // Xóa từng key
    for (const key of cacheKeys) {
      this.cacheService.delete(key);
    }

    this.logger.debug(
      `Cleared ${cacheKeys.length} cache entries for policy key: ${policyKey}`,
    );
  }

  /**
   * Lấy danh sách tất cả policy động
   */
  async getAllDynamicPolicies(
    organizationId: string,
  ): Promise<DynamicPolicyDocument[]> {
    return this.dynamicPolicyModel
      .find({ organization: organizationId })
      .sort({ key: 1 })
      .lean()
      .exec();
  }

  /**
   * Lấy chi tiết một policy động theo id
   */
  async getDynamicPolicyById(
    id: string,
    organizationId: string,
  ): Promise<DynamicPolicyDocument> {
    const policy = await this.dynamicPolicyModel
      .findOne({ _id: id, organization: organizationId })
      .lean()
      .exec();

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    return policy;
  }

  /**
   * Lấy policy động theo key
   */
  async getDynamicPolicyByKey(
    key: string,
    organizationId: string,
  ): Promise<DynamicPolicyDocument> {
    const policy = await this.dynamicPolicyModel
      .findOne({ key, organization: organizationId })
      .lean()
      .exec();

    if (!policy) {
      throw new NotFoundException(`Policy with key ${key} not found`);
    }

    return policy;
  }

  /**
   * Tạo policy động mới
   */
  async createDynamicPolicy(
    data: CreateDynamicPolicyDto & {
      organization: string;
      userId: string;
      description?: string;
      active?: boolean;
    },
  ): Promise<DynamicPolicyDocument> {
    // Kiểm tra xem key đã tồn tại chưa
    const existingPolicy = await this.dynamicPolicyModel.findOne({
      key: data.key,
      organization: data.organization,
    });

    if (existingPolicy) {
      throw new BadRequestException(
        `Policy with key "${data.key}" already exists`,
      );
    }

    // Kiểm tra định dạng policy key (resource:action)
    this.validatePolicyKey(data.key);

    // Tạo policy mới
    const policy = new this.dynamicPolicyModel({
      name: data.name,
      key: data.key,
      description: data.description || `Policy for ${data.key}`,
      active: data.active !== undefined ? data.active : true,
      organization: data.organization,
    });

    const savedPolicy = await policy.save();

    // Ghi log audit
    await this.auditLogService.log({
      userId: data.userId,
      action: AuditAction.POLICY_CREATED,
      resource: 'policy',
      resourceId: savedPolicy._id?.toString(),
      organizationId: data.organization,
      metadata: {
        policy: {
          name: savedPolicy.name,
          key: savedPolicy.key,
        },
      },
    });

    // Xóa cache cho policy này
    this.clearPolicyCacheForKey(data.key);

    return savedPolicy;
  }

  /**
   * Cập nhật policy động
   */
  async updateDynamicPolicy(
    id: string,
    updatePolicyDto: UpdateDynamicPolicyDto,
    organizationId: string,
    userId: string,
  ): Promise<DynamicPolicyDocument> {
    // Kiểm tra policy tồn tại
    const existingPolicy = await this.getDynamicPolicyById(id, organizationId);

    // Kiểm tra nếu key thay đổi
    if (updatePolicyDto.key && updatePolicyDto.key !== existingPolicy.key) {
      // Kiểm tra định dạng policy key mới
      this.validatePolicyKey(updatePolicyDto.key);

      // Kiểm tra key mới đã tồn tại chưa
      const duplicatePolicy = await this.dynamicPolicyModel.findOne({
        key: updatePolicyDto.key,
        organization: organizationId,
        _id: { $ne: id },
      });

      if (duplicatePolicy) {
        throw new BadRequestException(
          `Policy with key "${updatePolicyDto.key}" already exists`,
        );
      }
    }

    // Tìm và cập nhật policy
    const policy = await this.dynamicPolicyModel.findOneAndUpdate(
      { _id: id, organization: organizationId },
      updatePolicyDto,
      { new: true },
    );

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    // Ghi log audit
    await this.auditLogService.log({
      userId: userId,
      action: AuditAction.POLICY_UPDATED,
      resource: 'policy',
      resourceId: policy._id?.toString(),
      organizationId: organizationId,
      metadata: {
        policy: {
          name: policy.name,
          key: policy.key,
          changes: Object.keys(updatePolicyDto),
        },
      },
    });

    // Xóa cache cho policy cũ và mới
    this.clearPolicyCacheForKey(existingPolicy.key);
    if (updatePolicyDto.key && updatePolicyDto.key !== existingPolicy.key) {
      this.clearPolicyCacheForKey(updatePolicyDto.key);
    }

    // Reload policy nếu cần
    if (updatePolicyDto.key || updatePolicyDto.active !== undefined) {
      await this.loadDynamicPolicies();
    }

    return policy;
  }

  /**
   * Xóa policy động
   */
  async deleteDynamicPolicy(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    // Kiểm tra xem có rule nào thuộc về policy này không
    const rulesCount = await this.policyRuleModel.countDocuments({
      policy: id,
    });

    if (rulesCount > 0) {
      throw new BadRequestException(
        `Cannot delete policy because it has ${rulesCount} rules. Delete all rules first.`,
      );
    }

    // Tìm policy trước khi xóa để có thông tin cho audit log
    const policy = await this.dynamicPolicyModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    // Xóa policy
    await policy.deleteOne();

    // Ghi log audit
    await this.auditLogService.log({
      userId: userId,
      action: AuditAction.POLICY_DELETED,
      resource: 'policy',
      resourceId: id,
      organizationId: organizationId,
      metadata: {
        policy: {
          name: policy.name,
          key: policy.key,
        },
      },
    });

    // Xóa cache cho policy này
    this.clearPolicyCacheForKey(policy.key);

    // Reload policy cache
    await this.loadDynamicPolicies();

    return true;
  }

  /**
   * Lấy tất cả rules của một policy
   */
  async getPolicyRules(
    policyId: string,
    organizationId: string,
  ): Promise<PolicyRuleDocument[]> {
    // Kiểm tra policy có tồn tại không
    const policy = await this.dynamicPolicyModel.findOne({
      _id: policyId,
      organization: organizationId,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    return this.policyRuleModel
      .find({ policy: policyId })
      .sort({ order: 1 })
      .lean()
      .exec();
  }

  /**
   * Thêm rule mới cho policy
   */
  async addPolicyRule(
    policyId: string,
    createRuleDto: CreatePolicyRuleDto,
    organizationId: string,
    userId: string,
  ): Promise<PolicyRuleDocument> {
    // Kiểm tra policy có tồn tại không
    const policy = await this.dynamicPolicyModel.findOne({
      _id: policyId,
      organization: organizationId,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    // Validate rule config dựa vào loại rule
    this.validateRuleConfig(createRuleDto.type, createRuleDto.config);

    // Tìm thứ tự cao nhất hiện tại
    const highestOrder = await this.policyRuleModel
      .findOne({ policy: policyId })
      .sort({ order: -1 })
      .select('order')
      .lean()
      .exec();

    const nextOrder = highestOrder ? highestOrder.order + 1 : 1;

    // Tạo rule mới
    const rule = new this.policyRuleModel({
      name: createRuleDto.name,
      type: createRuleDto.type,
      config: createRuleDto.config,
      policy: policyId,
      order: createRuleDto.order || nextOrder,
      active: createRuleDto.active !== undefined ? createRuleDto.active : true,
    });

    const savedRule = await rule.save();

    // Ghi log audit
    await this.auditLogService.log({
      userId: userId,
      action: AuditAction.POLICY_UPDATED,
      resource: 'policy',
      resourceId: policyId,
      organizationId: organizationId,
      metadata: {
        operation: 'add_rule',
        rule: {
          id: savedRule._id?.toString(),
          name: savedRule.name,
          type: savedRule.type,
        },
      },
    });

    // Xóa cache cho policy này
    this.clearPolicyCacheForKey(policy.key);

    // Reload policy
    await this.loadDynamicPolicies();

    return savedRule;
  }

  /**
   * Cập nhật rule của policy
   */
  async updatePolicyRule(
    policyId: string,
    ruleId: string,
    updateRuleDto: UpdatePolicyRuleDto,
    organizationId: string,
    userId: string,
  ): Promise<PolicyRuleDocument> {
    // Kiểm tra policy có tồn tại không
    const policy = await this.dynamicPolicyModel.findOne({
      _id: policyId,
      organization: organizationId,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    // Validate rule config nếu có thay đổi
    if (updateRuleDto.type && updateRuleDto.config) {
      this.validateRuleConfig(updateRuleDto.type, updateRuleDto.config);
    } else if (updateRuleDto.config) {
      // Lấy thông tin rule cũ để biết loại rule
      const existingRule = await this.policyRuleModel.findById(ruleId);
      if (existingRule) {
        this.validateRuleConfig(existingRule.type, updateRuleDto.config);
      }
    }

    // Cập nhật rule
    const rule = await this.policyRuleModel.findOneAndUpdate(
      { _id: ruleId, policy: policyId },
      updateRuleDto,
      { new: true },
    );

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }

    // Ghi log audit
    await this.auditLogService.log({
      userId: userId,
      action: AuditAction.POLICY_UPDATED,
      resource: 'policy',
      resourceId: policyId,
      organizationId: organizationId,
      metadata: {
        operation: 'update_rule',
        rule: {
          id: rule._id?.toString(),
          name: rule.name,
          type: rule.type,
          changes: Object.keys(updateRuleDto),
        },
      },
    });

    // Xóa cache cho policy này
    this.clearPolicyCacheForKey(policy.key);

    // Reload policy
    await this.loadDynamicPolicies();

    return rule;
  }

  /**
   * Xóa rule khỏi policy
   */
  async deletePolicyRule(
    policyId: string,
    ruleId: string,
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    // Kiểm tra policy có tồn tại không
    const policy = await this.dynamicPolicyModel.findOne({
      _id: policyId,
      organization: organizationId,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    // Tìm rule trước khi xóa để có thông tin cho audit log
    const rule = await this.policyRuleModel.findOne({
      _id: ruleId,
      policy: policyId,
    });

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }

    // Xóa rule
    await rule.deleteOne();

    // Ghi log audit
    await this.auditLogService.log({
      userId: userId,
      action: AuditAction.POLICY_UPDATED,
      resource: 'policy',
      resourceId: policyId,
      organizationId: organizationId,
      metadata: {
        operation: 'delete_rule',
        rule: {
          id: ruleId,
          name: rule.name,
          type: rule.type,
        },
      },
    });

    // Xóa cache cho policy này
    this.clearPolicyCacheForKey(policy.key);

    // Reload policy
    await this.loadDynamicPolicies();

    return true;
  }

  /**
   * Thay đổi thứ tự của rule
   */
  async reorderPolicyRules(
    policyId: string,
    ruleOrders: { id: string; order: number }[],
    organizationId: string,
    userId: string,
  ): Promise<PolicyRuleDocument[]> {
    // Kiểm tra policy có tồn tại không
    const policy = await this.dynamicPolicyModel.findOne({
      _id: policyId,
      organization: organizationId,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    // Kiểm tra các rule có thuộc policy không
    const ruleIds = ruleOrders.map((item) => item.id);
    const existingRules = await this.policyRuleModel.find({
      _id: { $in: ruleIds },
      policy: policyId,
    });

    if (existingRules.length !== ruleIds.length) {
      throw new BadRequestException(
        'Some rules do not exist or do not belong to this policy',
      );
    }

    // Cập nhật thứ tự của các rule
    const updatePromises = ruleOrders.map((item) => {
      return this.policyRuleModel.updateOne(
        { _id: item.id, policy: policyId },
        { order: item.order },
      );
    });

    await Promise.all(updatePromises);

    // Ghi log audit
    await this.auditLogService.log({
      userId: userId,
      action: AuditAction.POLICY_UPDATED,
      resource: 'policy',
      resourceId: policyId,
      organizationId: organizationId,
      metadata: {
        operation: 'reorder_rules',
        rules: ruleOrders,
      },
    });

    // Xóa cache cho policy này
    this.clearPolicyCacheForKey(policy.key);

    // Reload policy
    await this.loadDynamicPolicies();

    // Lấy danh sách rule đã cập nhật
    return this.policyRuleModel
      .find({ policy: policyId })
      .sort({ order: 1 })
      .lean()
      .exec();
  }

  /**
   * Kiểm tra policy với dữ liệu mẫu
   */
  async testDynamicPolicy(
    policyId: string,
    user: any,
    resource: any,
    context: any = {},
    organizationId: string,
  ): Promise<{
    result: boolean;
    policyKey: string;
    rules: Array<{
      id: string;
      name: string;
      type: string;
      result: boolean;
      error?: string;
    }>;
  }> {
    // Kiểm tra policy có tồn tại không
    const policy = await this.dynamicPolicyModel.findOne({
      _id: policyId,
      organization: organizationId,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    // Lấy tất cả rule của policy
    const rules = await this.policyRuleModel
      .find({ policy: policyId, active: true })
      .sort({ order: 1 })
      .lean()
      .exec();

    if (rules.length === 0) {
      return {
        result: false,
        policyKey: policy.key,
        rules: [],
      };
    }

    // Tạo attribute cho việc đánh giá
    const action = policy.key.split(':')[1];
    const attributes: PolicyAttributes = {
      user,
      resource,
      action,
      context,
    };

    // Khởi tạo các rule và kiểm tra
    const ruleResults: Array<{
      id: string;
      name: string;
      type: string;
      result: boolean;
      error?: string;
    }> = [];
    let finalResult = true;

    for (const ruleData of rules) {
      try {
        const rule = this.ruleFactory.createRule(
          ruleData.type,
          ruleData.config,
        );
        const ruleResult = rule.evaluate(attributes);

        ruleResults.push({
          id: ruleData._id.toString(),
          name: ruleData.name,
          type: ruleData.type,
          result: ruleResult,
        });

        if (!ruleResult) {
          finalResult = false;
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${ruleData._id}:`, error);
        ruleResults.push({
          id: ruleData._id.toString(),
          name: ruleData.name,
          type: ruleData.type,
          result: false,
          error: error.message,
        });
        finalResult = false;
      }
    }

    return {
      result: finalResult,
      policyKey: policy.key,
      rules: ruleResults,
    };
  }

  /**
   * Sao chép policy từ policy khác
   */
  async clonePolicy(
    sourcePolicyId: string,
    newPolicyData: {
      name: string;
      key: string;
      description?: string;
    },
    organizationId: string,
    userId: string,
  ): Promise<DynamicPolicyDocument> {
    // Kiểm tra policy nguồn tồn tại không
    const sourcePolicy = await this.dynamicPolicyModel.findOne({
      _id: sourcePolicyId,
      organization: organizationId,
    });

    if (!sourcePolicy) {
      throw new NotFoundException(
        `Source policy with ID ${sourcePolicyId} not found`,
      );
    }

    // Kiểm tra key mới đã tồn tại chưa
    const existingPolicy = await this.dynamicPolicyModel.findOne({
      key: newPolicyData.key,
      organization: organizationId,
    });

    if (existingPolicy) {
      throw new BadRequestException(
        `Policy with key "${newPolicyData.key}" already exists`,
      );
    }

    // Kiểm tra định dạng policy key mới
    this.validatePolicyKey(newPolicyData.key);

    // Tạo policy mới
    const newPolicy = new this.dynamicPolicyModel({
      name: newPolicyData.name,
      key: newPolicyData.key,
      description:
        newPolicyData.description || `Cloned from ${sourcePolicy.name}`,
      active: true,
      organization: organizationId,
    });

    const savedPolicy = await newPolicy.save();

    // Lấy các rule của policy nguồn
    const sourceRules = await this.policyRuleModel
      .find({ policy: sourcePolicyId })
      .sort({ order: 1 })
      .lean()
      .exec();

    // Tạo các rule mới cho policy mới
    if (sourceRules.length > 0) {
      const newRules = sourceRules.map((rule) => ({
        name: rule.name,
        type: rule.type,
        config: rule.config,
        policy: savedPolicy._id,
        order: rule.order,
        active: rule.active,
      }));

      await this.policyRuleModel.insertMany(newRules);
    }

    // Ghi log audit
    await this.auditLogService.log({
      userId,
      action: AuditAction.POLICY_CREATED,
      resource: 'policy',
      resourceId: savedPolicy._id?.toString(),
      organizationId,
      metadata: {
        policy: {
          name: savedPolicy.name,
          key: savedPolicy.key,
        },
        clonedFrom: sourcePolicyId,
      },
    });

    // Reload policy
    await this.loadDynamicPolicies();

    return savedPolicy;
  }

  /**
   * Validate cấu hình rule
   */
  private validateRuleConfig(
    type: RuleType,
    config: Record<string, any>,
  ): void {
    switch (type) {
      case RuleType.ROLE_BASED:
        if (
          !config.roles ||
          !Array.isArray(config.roles) ||
          config.roles.length === 0
        ) {
          throw new BadRequestException(
            'Role-based rule requires "roles" array with at least one role',
          );
        }
        break;

      case RuleType.CUSTOM_JS:
        if (!config.code || typeof config.code !== 'string') {
          throw new BadRequestException(
            'Custom JS rule requires "code" string',
          );
        }
        // Thử compile để kiểm tra syntax
        try {
          // eslint-disable-next-line no-new-func
          new Function('attributes', 'context', config.code);
        } catch (e) {
          throw new BadRequestException(
            `Invalid JavaScript in rule: ${e.message}`,
          );
        }
        break;

      case RuleType.FIELD_VALUE:
        if (!config.field || typeof config.field !== 'string') {
          throw new BadRequestException(
            'Field value rule requires "field" string',
          );
        }
        if (!config.operator || typeof config.operator !== 'string') {
          throw new BadRequestException(
            'Field value rule requires "operator" string',
          );
        }
        if (config.value === undefined) {
          throw new BadRequestException('Field value rule requires "value"');
        }

        // Kiểm tra operator hợp lệ
        const validOperators = Object.values(Operator);
        if (!validOperators.includes(config.operator as Operator)) {
          throw new BadRequestException(
            `Invalid operator: ${config.operator}. Valid operators are: ${validOperators.join(', ')}`,
          );
        }
        break;

      // Các rule không cần cấu hình đặc biệt
      case RuleType.OWNERSHIP:
      case RuleType.SAME_ORGANIZATION:
        break;

      default:
        throw new BadRequestException(`Unsupported rule type: ${type}`);
    }
  }

  /**
   * Validate policy key
   */
  private validatePolicyKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Policy key is required');
    }

    // Kiểm tra định dạng resource:action
    const parts = key.split(':');
    if (parts.length !== 2) {
      throw new BadRequestException(
        'Policy key must be in format "resource:action"',
      );
    }

    const [resource, action] = parts;
    if (!resource || !action) {
      throw new BadRequestException(
        'Both resource and action are required in policy key',
      );
    }

    // Kiểm tra định dạng
    const keyRegex = /^[a-z0-9_]+:[a-z0-9_]+$/;
    if (!keyRegex.test(key)) {
      throw new BadRequestException(
        'Policy key must contain only lowercase letters, numbers, and underscores in format "resource:action"',
      );
    }
  }

  /**
   * Lấy danh sách loại rule và mô tả
   */
  getRuleTypes(): Array<{
    type: RuleType;
    description: string;
    configSchema: Record<string, any>;
  }> {
    return Object.values(RuleType).map((type) => ({
      type,
      description: this.getRuleTypeDescription(type),
      configSchema: this.getRuleTypeConfigSchema(type),
    }));
  }

  /**
   * Lấy mô tả cho loại rule
   */
  private getRuleTypeDescription(type: RuleType): string {
    switch (type) {
      case RuleType.OWNERSHIP:
        return 'Kiểm tra xem người dùng có phải là chủ sở hữu của tài nguyên hay không (dựa trên trường assignedTo)';
      case RuleType.SAME_ORGANIZATION:
        return 'Kiểm tra xem người dùng và tài nguyên có thuộc cùng tổ chức hay không';
      case RuleType.ROLE_BASED:
        return 'Kiểm tra xem người dùng có vai trò cần thiết hay không';
      case RuleType.CUSTOM_JS:
        return 'Sử dụng mã JavaScript tùy chỉnh để đánh giá quyền';
      case RuleType.FIELD_VALUE:
        return 'Kiểm tra giá trị của một trường trong tài nguyên hoặc người dùng';
      default:
        return 'Loại rule không xác định';
    }
  }

  /**
   * Lấy schema cấu hình cho loại rule
   */
  private getRuleTypeConfigSchema(type: RuleType): Record<string, any> {
    switch (type) {
      case RuleType.OWNERSHIP:
        return {}; // Không cần cấu hình đặc biệt

      case RuleType.SAME_ORGANIZATION:
        return {}; // Không cần cấu hình đặc biệt

      case RuleType.ROLE_BASED:
        return {
          roles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Danh sách các vai trò được phép',
            example: ['admin', 'manager'],
            required: true,
          },
        };

      case RuleType.CUSTOM_JS:
        return {
          code: {
            type: 'string',
            description: 'Mã JavaScript để thực thi (phải trả về boolean)',
            example:
              'return attributes.user.role === "admin" || (attributes.resource && attributes.resource.createdBy === attributes.user._id);',
            required: true,
          },
        };

      case RuleType.FIELD_VALUE:
        return {
          field: {
            type: 'string',
            description:
              'Tên trường (có thể sử dụng tiền tố user. hoặc resource.)',
            example: 'resource.status',
            required: true,
          },
          operator: {
            type: 'string',
            enum: Object.values(Operator),
            description: 'Toán tử so sánh',
            example: Operator.EQUALS,
            required: true,
          },
          value: {
            type: 'any',
            description: 'Giá trị để so sánh',
            example: 'active',
            required: true,
          },
        };

      default:
        return {};
    }
  }

  /**
   * Lấy danh sách resources và actions có sẵn
   */
  getAvailableResourcesAndActions(): Array<{
    resource: string;
    actions: string[];
    description: string;
  }> {
    return [
      {
        resource: 'customer',
        actions: ['create', 'read', 'update', 'delete', 'assign'],
        description: 'Khách hàng và thông tin liên hệ',
      },
      {
        resource: 'deal',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Thương vụ bán hàng',
      },
      {
        resource: 'task',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Nhiệm vụ và lịch hẹn',
      },
      {
        resource: 'product',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Sản phẩm và dịch vụ',
      },
      {
        resource: 'webhook',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Webhook và tích hợp',
      },
      {
        resource: 'api_key',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Khóa API',
      },
      {
        resource: 'user',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Người dùng hệ thống',
      },
      {
        resource: 'role',
        actions: ['create', 'read', 'update', 'delete', 'assign'],
        description: 'Vai trò và phân quyền',
      },
      {
        resource: 'analytics',
        actions: ['read'],
        description: 'Báo cáo và phân tích',
      },
    ];
  }

  /**
   * Lấy các policy mẫu
   */
  getPolicyTemplates(): Array<{
    name: string;
    key: string;
    description: string;
    rules: Array<{
      name: string;
      type: RuleType;
      config: Record<string, any>;
    }>;
  }> {
    return [
      {
        name: 'Chỉ đọc cho khách hàng',
        key: 'customer:read',
        description:
          'Cho phép đọc thông tin khách hàng cho người dùng trong cùng tổ chức',
        rules: [
          {
            name: 'Cùng tổ chức',
            type: RuleType.SAME_ORGANIZATION,
            config: {},
          },
        ],
      },
      {
        name: 'Quản lý khách hàng cho chủ sở hữu',
        key: 'customer:update',
        description: 'Cho phép người dùng cập nhật khách hàng mà họ được gán',
        rules: [
          {
            name: 'Cùng tổ chức',
            type: RuleType.SAME_ORGANIZATION,
            config: {},
          },
          {
            name: 'Là chủ sở hữu',
            type: RuleType.OWNERSHIP,
            config: {},
          },
        ],
      },
      {
        name: 'Quản lý thương vụ cho nhóm bán hàng',
        key: 'deal:update',
        description: 'Cho phép nhóm bán hàng cập nhật thương vụ của họ',
        rules: [
          {
            name: 'Cùng tổ chức',
            type: RuleType.SAME_ORGANIZATION,
            config: {},
          },
          {
            name: 'Vai trò bán hàng',
            type: RuleType.ROLE_BASED,
            config: {
              roles: ['admin', 'sales'],
            },
          },
          {
            name: 'Là chủ sở hữu',
            type: RuleType.OWNERSHIP,
            config: {},
          },
        ],
      },
      {
        name: 'Xem báo cáo cho quản lý',
        key: 'analytics:read',
        description: 'Cho phép quản lý xem báo cáo và phân tích',
        rules: [
          {
            name: 'Vai trò quản lý',
            type: RuleType.ROLE_BASED,
            config: {
              roles: ['admin', 'manager'],
            },
          },
        ],
      },
    ];
  }
}
