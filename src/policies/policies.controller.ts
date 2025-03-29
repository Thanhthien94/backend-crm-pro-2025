// src/policies/policies.controller.ts
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
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { CreateDynamicPolicyDto } from './dto/create-dynamic-policy.dto';
import { UpdateDynamicPolicyDto } from './dto/update-dynamic-policy.dto';
import { CreatePolicyRuleDto } from './dto/create-policy-rule.dto';
import { UpdatePolicyRuleDto } from './dto/update-policy-rule.dto';
import { RuleType } from './schemas/policy-rule.schema';

@ApiTags('policies')
@Controller('policies')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả policy' })
  @ApiResponse({ status: 200, description: 'Danh sách policy.' })
  @ApiBearerAuth()
  async getAllPolicies(@Request() req: RequestWithUser) {
    const policies = await this.policiesService.getAllDynamicPolicies(
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: policies,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Tạo policy mới' })
  @ApiResponse({ status: 201, description: 'Policy đã được tạo.' })
  @ApiBearerAuth()
  async createPolicy(
    @Body() createPolicyDto: CreateDynamicPolicyDto,
    @Request() req: RequestWithUser,
  ) {
    const policy = await this.policiesService.createDynamicPolicy({
      ...createPolicyDto,
      organization: req.user.organization.toString(),
      userId: req.user._id?.toString() || '',
    });
    return {
      success: true,
      data: policy,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin policy' })
  @ApiResponse({ status: 200, description: 'Thông tin policy.' })
  @ApiBearerAuth()
  async getPolicy(@Param('id') id: string, @Request() req: RequestWithUser) {
    const policy = await this.policiesService.getDynamicPolicyById(
      id,
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: policy,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật policy' })
  @ApiResponse({ status: 200, description: 'Policy đã được cập nhật.' })
  @ApiBearerAuth()
  async updatePolicy(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdateDynamicPolicyDto,
    @Request() req: RequestWithUser,
  ) {
    const policy = await this.policiesService.updateDynamicPolicy(
      id,
      updatePolicyDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    // Reload policy sau khi cập nhật
    await this.policiesService.reloadDynamicPolicies();

    return {
      success: true,
      data: policy,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa policy' })
  @ApiResponse({ status: 200, description: 'Policy đã được xóa.' })
  @ApiBearerAuth()
  async deletePolicy(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.policiesService.deleteDynamicPolicy(
      id,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    // Reload policy sau khi xóa
    await this.policiesService.reloadDynamicPolicies();

    return {
      success: true,
      data: {},
    };
  }

  @Get('rule-types')
  @ApiOperation({ summary: 'Lấy danh sách loại rule' })
  @ApiResponse({ status: 200, description: 'Danh sách loại rule.' })
  @ApiBearerAuth()
  getRuleTypes() {
    return {
      success: true,
      data: Object.values(RuleType).map((type) => ({
        type,
        description: this.getRuleTypeDescription(type),
        configSchema: this.getRuleTypeConfigSchema(type),
      })),
    };
  }

  private getRuleTypeDescription(type: RuleType): string {
    switch (type) {
      case RuleType.OWNERSHIP:
        return 'Kiểm tra nếu user là người sở hữu tài nguyên';
      case RuleType.SAME_ORGANIZATION:
        return 'Kiểm tra nếu user và tài nguyên thuộc cùng tổ chức';
      case RuleType.ROLE_BASED:
        return 'Kiểm tra nếu user có vai trò cụ thể';
      case RuleType.CUSTOM_JS:
        return 'Sử dụng mã JavaScript tùy chỉnh để kiểm tra quyền';
      case RuleType.FIELD_VALUE:
        return 'Kiểm tra giá trị của trường trong tài nguyên hoặc user';
      default:
        return 'Unknown rule type';
    }
  }

  private getRuleTypeConfigSchema(type: RuleType): Record<string, any> {
    switch (type) {
      case RuleType.OWNERSHIP:
        return {};
      case RuleType.SAME_ORGANIZATION:
        return {};
      case RuleType.ROLE_BASED:
        return {
          roles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Danh sách các vai trò',
          },
        };
      case RuleType.CUSTOM_JS:
        return {
          code: {
            type: 'string',
            description: 'Mã JavaScript để thực thi (trả về boolean)',
          },
        };
      case RuleType.FIELD_VALUE:
        return {
          field: {
            type: 'string',
            description: 'Tên trường (có thể với tiền tố user. hoặc resource.)',
          },
          operator: {
            type: 'string',
            enum: [
              'equals',
              'not_equals',
              'greater_than',
              'less_than',
              'contains',
              'not_contains',
              'starts_with',
              'ends_with',
              'in',
              'not_in',
            ],
            description: 'Toán tử so sánh',
          },
          value: {
            type: 'any',
            description: 'Giá trị để so sánh',
          },
        };
      default:
        return {};
    }
  }

  @Get(':id/rules')
  @ApiOperation({ summary: 'Lấy danh sách rule của policy' })
  @ApiResponse({ status: 200, description: 'Danh sách rule.' })
  @ApiBearerAuth()
  async getPolicyRules(
    @Param('id') policyId: string,
    @Request() req: RequestWithUser,
  ) {
    const rules = await this.policiesService.getPolicyRules(
      policyId,
      req.user.organization.toString(),
    );
    return {
      success: true,
      data: rules,
    };
  }

  @Post(':id/rules')
  @ApiOperation({ summary: 'Thêm rule mới cho policy' })
  @ApiResponse({ status: 201, description: 'Rule đã được thêm.' })
  @ApiBearerAuth()
  async addPolicyRule(
    @Param('id') policyId: string,
    @Body() createRuleDto: CreatePolicyRuleDto,
    @Request() req: RequestWithUser,
  ) {
    const rule = await this.policiesService.addPolicyRule(
      policyId,
      createRuleDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    // Reload policy sau khi thêm rule
    await this.policiesService.reloadDynamicPolicies();

    return {
      success: true,
      data: rule,
    };
  }

  @Patch(':id/rules/:ruleId')
  @ApiOperation({ summary: 'Cập nhật rule' })
  @ApiResponse({ status: 200, description: 'Rule đã được cập nhật.' })
  @ApiBearerAuth()
  async updatePolicyRule(
    @Param('id') policyId: string,
    @Param('ruleId') ruleId: string,
    @Body() updateRuleDto: UpdatePolicyRuleDto,
    @Request() req: RequestWithUser,
  ) {
    const rule = await this.policiesService.updatePolicyRule(
      policyId,
      ruleId,
      updateRuleDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    // Reload policy sau khi cập nhật rule
    await this.policiesService.reloadDynamicPolicies();

    return {
      success: true,
      data: rule,
    };
  }

  @Delete(':id/rules/:ruleId')
  @ApiOperation({ summary: 'Xóa rule' })
  @ApiResponse({ status: 200, description: 'Rule đã được xóa.' })
  @ApiBearerAuth()
  async deletePolicyRule(
    @Param('id') policyId: string,
    @Param('ruleId') ruleId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.policiesService.deletePolicyRule(
      policyId,
      ruleId,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    // Reload policy sau khi xóa rule
    await this.policiesService.reloadDynamicPolicies();

    return {
      success: true,
      data: {},
    };
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Kiểm tra policy với dữ liệu mẫu' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra.' })
  @ApiBearerAuth()
  async testPolicy(
    @Param('id') policyId: string,
    @Body()
    testData: {
      user: any;
      resource: any;
      context?: any;
    },
    @Request() req: RequestWithUser,
  ) {
    const result = await this.policiesService.testDynamicPolicy(
      policyId,
      testData.user,
      testData.resource,
      testData.context,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: {
        allowed: result,
        policyId,
        testData,
      },
    };
  }
}
