import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ActivitiesModule } from './activities/activities.module';
import { AppController } from './app.controller';
import { AttendancesModule } from './attendances/attendances.module';
import { AuthModule } from './auth/auth.module';
import { CommunicationsModule } from './communications/communications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MailModule } from './mail/mail.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { StudentsModule } from './students/students.module';
import { SystemUsersModule } from './system-users/system-users.module';
import { TenantContextMiddleware } from './tenants/tenant-context.middleware';
import { TenantsModule } from './tenants/tenants.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    TenantsModule,
    MailModule,
    WhatsappModule,
    AuthModule,
    ActivitiesModule,
    CommunicationsModule,
    AttendancesModule,
    DashboardModule,
    PlansModule,
    StudentsModule,
    PaymentsModule,
    SystemUsersModule
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
