import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Modules
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { HealthController } from './modules/health/health.controller';
import { ServiceProxyMiddleware } from './modules/proxy/service-proxy.middleware';

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
  ],
  controllers: [HealthController],
  providers: [ServiceProxyMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware, ServiceProxyMiddleware)
      .forRoutes('*');
  }
}
