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
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('jwt.secret'),
      }),
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
    CommerceEventsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
