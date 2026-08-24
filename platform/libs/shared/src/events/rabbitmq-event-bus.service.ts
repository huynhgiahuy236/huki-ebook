import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { DomainEvent } from './domain-event';

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

@Injectable()
export class RabbitMqEventBus implements OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqEventBus.name);
  private readonly exchange: string;
  private readonly connection: AmqpConnectionManager;
  private readonly publisher: ChannelWrapper;
  private readonly consumers: ChannelWrapper[] = [];

  constructor(config: ConfigService) {
    const url =
      config.get<string>('RABBITMQ_URL') ??
      process.env.RABBITMQ_URL ??
      'amqp://guest:guest123@localhost:5672';
    this.exchange =
      config.get<string>('RABBITMQ_EXCHANGE') ??
      process.env.RABBITMQ_EXCHANGE ??
      'huki.events';
    this.connection = connect([url], { reconnectTimeInSeconds: 5 });
    this.connection.on('connect', () =>
      this.logger.log(`Connected to RabbitMQ exchange ${this.exchange}`),
    );
    this.connection.on('disconnect', ({ err }) =>
      this.logger.warn(`RabbitMQ disconnected: ${err.message}`),
    );
    this.publisher = this.connection.createChannel({
      name: 'domain-event-publisher',
      setup: async (channel: any) => {
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
      },
    });
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.publisher.publish(
      this.exchange,
      event.eventType,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId,
        type: event.eventType,
        timeout: 10_000,
      } as any,
    );
  }

  subscribe(
    queue: string,
    patterns: string[],
    handler: DomainEventHandler,
  ): void {
    const deadLetterQueue = `${queue}.dlq`;
    const channel = this.connection.createChannel({
      name: queue,
      setup: async (rawChannel: any) => {
        await rawChannel.assertExchange(this.exchange, 'topic', {
          durable: true,
        });
        await rawChannel.assertQueue(deadLetterQueue, { durable: true });
        await rawChannel.assertQueue(queue, { durable: true });
        for (const pattern of patterns) {
          await rawChannel.bindQueue(queue, this.exchange, pattern);
        }
        await rawChannel.prefetch(10);
        await rawChannel.consume(
          queue,
          async (message: any) => {
            if (!message) return;
            try {
              const event = JSON.parse(
                message.content.toString(),
              ) as DomainEvent;
              await handler(event);
              rawChannel.ack(message);
            } catch (error) {
              const retries = Number(
                message.properties.headers?.['x-retry-count'] ?? 0,
              );
              const options = {
                persistent: true,
                contentType: 'application/json',
                messageId: message.properties.messageId,
                type: message.properties.type,
                headers: {
                  ...message.properties.headers,
                  'x-retry-count': retries + 1,
                },
              };
              if (retries < 2) {
                rawChannel.sendToQueue(queue, message.content, options);
              } else {
                rawChannel.sendToQueue(
                  deadLetterQueue,
                  message.content,
                  options,
                );
                this.logger.error(
                  `Event ${message.properties.messageId ?? 'unknown'} moved to ${deadLetterQueue}`,
                  error instanceof Error ? error.stack : String(error),
                );
              }
              rawChannel.ack(message);
            }
          },
          { noAck: false },
        );
      },
    });
    this.consumers.push(channel);
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.consumers.map((channel) => channel.close()));
    await this.publisher.close();
    await this.connection.close();
  }
}
