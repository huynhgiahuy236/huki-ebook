import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import configuration from '../config/configuration';
import { CommonModule } from './common/common.module';
import { AuthorsModule } from './modules/authors/authors.module';
import { BooksModule } from './modules/books/books.module';
import { CartModule } from './modules/cart/cart.module';
import { CatalogSearchModule } from './modules/catalog-search/catalog-search.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PublishersModule } from './modules/publishers/publishers.module';
import { RedisModule } from './modules/redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommerceEventsModule } from './modules/events/events.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { PayoutModule } from './modules/payout/payout.module';
import { HealthController } from './health.controller';
import { MonitoringModule } from '@huki/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwt.secret') ||
          configService.get<string>('JWT_SECRET') ||
          process.env.JWT_SECRET ||
          'your-super-secret-jwt-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    CommonModule,
    PrismaModule,
    RedisModule,
    CategoriesModule,
    AuthorsModule,
    PublishersModule,
    CatalogSearchModule,
    BooksModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    WalletModule,
    LedgerModule,
    PayoutModule,
    ReconciliationModule,
    CommerceEventsModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
