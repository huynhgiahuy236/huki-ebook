import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

// Modules
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { HealthController } from './modules/health/health.controller';

// Config
const configuration = () => ({
  port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
  services: {
    identity: {
      host: process.env.IDENTITY_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.IDENTITY_SERVICE_PORT || '3001', 10),
    },
    business: {
      host: process.env.BUSINESS_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.BUSINESS_SERVICE_PORT || '3002', 10),
    },
    commerce: {
      host: process.env.COMMERCE_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.COMMERCE_SERVICE_PORT || '3003', 10),
    },
    shipping: {
      host: process.env.SHIPPING_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.SHIPPING_SERVICE_PORT || '3004', 10),
    },
    community: {
      host: process.env.COMMUNITY_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.COMMUNITY_SERVICE_PORT || '3005', 10),
    },
    promotion: {
      host: process.env.PROMOTION_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.PROMOTION_SERVICE_PORT || '3007', 10),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  },
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Microservices clients
    ClientsModule.registerAsync([
      {
        name: 'IDENTITY_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('services.identity.host'),
            port: configService.get('services.identity.port'),
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
            host: configService.get('services.business.host'),
            port: configService.get('services.business.port'),
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
            host: configService.get('services.commerce.host'),
            port: configService.get('services.commerce.port'),
          },
        }),
      },
      {
        name: 'SHIPPING_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('services.shipping.host'),
            port: configService.get('services.shipping.port'),
          },
        }),
      },
      {
        name: 'COMMUNITY_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('services.community.host'),
            port: configService.get('services.community.port'),
          },
        }),
      },
      {
        name: 'PROMOTION_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('services.promotion.host'),
            port: configService.get('services.promotion.port'),
          },
        }),
      },
    ]),
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply auth middleware to all routes
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
