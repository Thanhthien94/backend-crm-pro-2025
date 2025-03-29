import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { CustomersService } from '../../customers/customers.service';
import { DealsService } from '../../deals/deals.service';
import { TasksService } from '../../tasks/tasks.service';

@Injectable()
export class ResourceInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private customersService: CustomersService,
    private dealsService: DealsService,
    private tasksService: TasksService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const policyData = this.reflector.get<{
      resource: string;
      action: string;
    }>('policy', context.getHandler());

    if (!policyData) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const resourceId = request.params.id;
    const user = request.user;

    if (!resourceId || !user) {
      return next.handle();
    }

    // Lấy dữ liệu tài nguyên dựa trên loại
    try {
      let resourceData;

      switch (policyData.resource) {
        case 'customer':
          resourceData = await this.customersService.findById(
            resourceId,
            user.organization.toString(),
          );
          break;
        case 'deal':
          resourceData = await this.dealsService.findById(
            resourceId,
            user.organization.toString(),
          );
          break;
        case 'task':
          resourceData = await this.tasksService.findById(
            resourceId,
            user.organization.toString(),
          );
          break;
        default:
          resourceData = null;
      }

      request.resourceData = resourceData;
    } catch (error) {
      // Không tìm thấy tài nguyên
      request.resourceData = null;
    }

    return next.handle();
  }
}
