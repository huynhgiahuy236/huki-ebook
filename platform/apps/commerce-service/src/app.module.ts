import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import configuration from '../config/configuration';
import {
  Author,
  Category,
  Publisher,
  Book,
  Cart,
  CartItem,
  Order,
  SellerOrder,
  OrderItem,
  Payment,
  BookAccess,
} from './entities';
import { CategoriesModule } from './modules/categories/categories.module';
import { AuthorsModule } from './modules/authors/authors.module';
import { PublishersModule } from './modules/publishers/publishers.module';
import { CatalogSearchModule } from './modules/catalog-search/catalog-search.module';
import { CartModule } from './modules/cart/cart.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        database: configService.get('database.name'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
      }),
    }),
    TypeOrmModule.forFeature([
      Category,
      Author,
      Publisher,
      Book,
      Cart,
      CartItem,
      Order,
      SellerOrder,
      OrderItem,
      Payment,
      BookAccess,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('jwt.secret'),
      }),
    }),
    RedisModule,
    CategoriesModule,
    AuthorsModule,
    PublishersModule,
    CatalogSearchModule,
    CartModule,
  ],
})
export class AppModule {}
