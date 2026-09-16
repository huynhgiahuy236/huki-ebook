import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { FlashSalesController } from "./flash-sales.controller";
import { FlashSalesService } from "./flash-sales.service";

export const FLASH_SALE_REDIS = "FLASH_SALE_REDIS";

@Module({
  controllers: [FlashSalesController],
  providers: [
    {
      provide: FLASH_SALE_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>("REDIS_HOST") || "localhost",
          port: Number(config.get<string>("REDIS_PORT") || 6379),
          password: config.get<string>("REDIS_PASSWORD") || undefined,
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
          lazyConnect: true,
        }),
    },
    FlashSalesService,
  ],
  exports: [FlashSalesService],
})
export class FlashSalesModule {}
