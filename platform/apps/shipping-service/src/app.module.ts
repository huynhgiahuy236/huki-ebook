import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from './common/common.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { DeliveryStaffModule } from './modules/delivery-staff/delivery-staff.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { ShippingEventsModule } from './modules/events/events.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || process.env.JWT_SECRET || '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0',
      }),
    }),
    CommonModule,
    PrismaModule,
    AuditModule,
    AddressesModule,
    DeliveryStaffModule,
    ShippingModule,
    ShipmentsModule,
    ShippingEventsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
