import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsModule } from '../permissions/permissions.module';
import { PoliciesModule } from '../policies/policies.module';
import { AccessControlService } from './access-control.service';
import { CacheService } from '../common/services/cache.service';
import { AccessLogService } from './services/access-log.service';
import { AuditLogService } from './services/audit-log.service';
import { AccessLog, AccessLogSchema } from './schemas/access-log.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AccessControlGuard } from './guards/access-control.guard';
import { AccessLogController } from './controllers/access-log.controller';
import { AuditLogController } from './controllers/audit-log.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccessLog.name, schema: AccessLogSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PermissionsModule,
    forwardRef(() => PoliciesModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [AccessLogController, AuditLogController],
  providers: [
    AccessControlService,
    CacheService,
    AccessLogService,
    AuditLogService,
    AccessControlGuard,
  ],
  exports: [
    AccessControlService,
    CacheService,
    AccessLogService,
    AuditLogService,
    AccessControlGuard,
  ],
})
export class AccessControlModule {}
