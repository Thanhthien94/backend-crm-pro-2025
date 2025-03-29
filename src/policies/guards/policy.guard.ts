import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PoliciesService } from '../policies.service';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private policiesService: PoliciesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyData = this.reflector.get<{
      resource: string;
      action: string;
    }>('policy', context.getHandler());

    if (!policyData) {
      return true; // Không yêu cầu policy => cho phép
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Lấy resource từ request
    const resourceId = request.params.id;
    const resourceData = request.resourceData; // Cần setup middleware để lấy dữ liệu này

    const policyKey = PoliciesService.createPolicyKey(
      policyData.resource,
      policyData.action,
    );

    return this.policiesService.evaluatePolicy(policyKey, user, resourceData, {
      resourceId,
      body: request.body,
    });
  }
}
