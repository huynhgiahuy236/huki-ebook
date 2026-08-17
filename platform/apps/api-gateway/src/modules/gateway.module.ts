import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.registerAsync([
      {
        name: 'IDENTITY_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('services.identity.host', 'localhost'),
            port: configService.get('services.identity.port', 3001),
          },
        }),
      },
      {
        name: 'BUSINESS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('services.business.host', 'localhost'),
            port: configService.get('services.business.port', 3002),
          },
        }),
      },
      {
        name: 'COMMERCE_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('services.commerce.host', 'localhost'),
            port: configService.get('services.commerce.port', 3003),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GatewayModule {}
