import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
            urls: [configService.get<string>('rabbitmq.url') ?? 'amqp://guest:guest123@localhost:5672'],
            queue: 'huki-queue',
            queueOptions: {
              durable: true,
            },
            // This module is an RMQ client. Nest creates a temporary reply
            // consumer for request/response calls (health.check); RabbitMQ
            // requires that reply consumer to use automatic acknowledgements.
            noAck: true,
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMQModule {}
