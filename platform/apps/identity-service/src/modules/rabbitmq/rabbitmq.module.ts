import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get('rabbitmq.url', 'amqp://guest:guest123@localhost:5672')],
            queue: 'huki-queue',
            queueOptions: {
              durable: true,
            },
            noAck: false,
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMQModule {}
