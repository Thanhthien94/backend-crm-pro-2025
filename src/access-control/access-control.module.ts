import { Module, forwardRef } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PoliciesModule } from '../policies/policies.module';
import { AccessControlService } from './access-control.service';

@Module({
  imports: [PermissionsModule, forwardRef(() => PoliciesModule)],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
