import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { validationSchema } from './config/validation';

import { PrismaModule } from './database/prisma.module';
import { CommonModule } from './common/common.module';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

import { HealthModule } from './modules/health/health.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { NumberGeneratorModule } from './modules/number-generator/number-generator.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LoanProductsModule } from './modules/loan-products/loan-products.module';
import { InterestEngineModule } from './modules/interest-engine/interest-engine.module';
import { LoansModule } from './modules/loans/loans.module';
import { PublicModule } from './modules/public/public.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { VaultModule } from './modules/vault/vault.module';
import { SupportModule } from './modules/support/support.module';
import { RiskAlertsModule } from './modules/risk-alerts/risk-alerts.module';
import { CashManagementModule } from './modules/cash-management/cash-management.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttlSeconds')! * 1000,
            limit: config.get<number>('throttle.limit')!,
          },
        ],
      }),
    }),

    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,

    HealthModule,
    AuditLogModule,
    NumberGeneratorModule,
    RbacModule,
    AuthModule,
    BranchesModule,
    OrganizationsModule,
    EmployeesModule,
    CustomersModule,
    SettingsModule,
    LoanProductsModule,
    InterestEngineModule,
    LoansModule,
    PublicModule,
    CollectionsModule,
    ReportsModule,
    DocumentsModule,
    AuctionsModule,
    VaultModule,
    SupportModule,
    RiskAlertsModule,
    CashManagementModule,
    ReconciliationModule,
  ],
  providers: [
    // Order matters: exceptions -> correlation id -> auth -> permissions -> audit.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
