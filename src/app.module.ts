import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { CustomersModule } from './customers/customers.module';
import { DealsModule } from './deals/deals.module';
import { TasksModule } from './tasks/tasks.module';
import { ProductsModule } from './products/products.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { WebhookModule } from './webhook/webhook.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggerService } from './common/services/logger.service';
import { PermissionsModule } from './permissions/permissions.module';
import { PoliciesModule } from './policies/policies.module';
import { AccessControlModule } from './access-control/access-control.module';

import configuration from './config/configuration';
import { ApiKeyPermissionGuard } from './common/guards';
import { AccessControlGuard } from './access-control/guards/access-control.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isDevMode =
          configService.get<string>('app.env') === 'development';
        const isMongoDebug =
          configService.get<string>('mongoose.debug') === 'true';

        // Bật debug cho mongoose trong môi trường development
        if (isDevMode) {
          mongoose.set('debug', isMongoDebug);
        }

        return {
          uri: configService.get<string>('database.uri'),
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('MongoDB connection established successfully');
            });
            connection.on('disconnected', () => {
              console.log('MongoDB connection disconnected');
            });
            connection.on('error', (error) => {
              console.error('MongoDB connection error:', error);
            });
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CustomersModule,
    DealsModule,
    TasksModule,
    CustomFieldsModule,
    ApiKeysModule,
    AnalyticsModule,
    ExportModule,
    ImportModule,
    WebhookModule,
    ProductsModule,
    PermissionsModule,
    PoliciesModule,
    AccessControlModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyPermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccessControlGuard,
    },
  ],
})
export class AppModule {}
