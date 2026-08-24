import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from './common/common.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { DeliveryStaffModule } from './modules/delivery-staff/delivery-staff.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { PrismaModule } from './prisma/prisma.module';
import { ShippingEventsModule } from './modules/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        global: true,
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
    CommonModule,
    PrismaModule,
    AddressesModule,
    DeliveryStaffModule,
    ShippingModule,
    ShipmentsModule,
    ShippingEventsModule,
  ],
})
export class AppModule {}
