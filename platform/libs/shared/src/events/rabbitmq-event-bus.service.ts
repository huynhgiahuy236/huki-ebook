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
  private readonly maxRetries: number;
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
    const configuredMaxRetries = Number(
      config.get<string>('RABBITMQ_MAX_RETRIES') ??
        process.env.RABBITMQ_MAX_RETRIES ??
        2,
    );
    this.maxRetries = Number.isInteger(configuredMaxRetries)
      ? Math.max(0, Math.min(configuredMaxRetries, 10))
      : 2;
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
              const parsedRetries = Number(
                message.properties.headers?.['x-retry-count'] ?? 0,
              );
              const retries = Number.isInteger(parsedRetries)
                ? Math.max(0, parsedRetries)
                : 0;
              const retrying = retries < this.maxRetries;
              const destination = retrying ? queue : deadLetterQueue;
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              const options = {
                persistent: true,
                contentType: 'application/json',
                messageId: message.properties.messageId,
                type: message.properties.type,
                headers: {
                  ...message.properties.headers,
                  'x-retry-count': retries + 1,
                  'x-last-error': errorMessage.slice(0, 500),
                  ...(retrying ? {} : { 'x-dead-lettered-at': new Date().toISOString() }),
                },
              };

              try {
                if (retrying) {
                  const delayMs = Math.min(1_000 * 2 ** retries, 10_000);
                  await new Promise((resolve) => setTimeout(resolve, delayMs));
                }

                // ChannelWrapper uses publisher confirms. Ack the original only
                // after RabbitMQ confirms the retry/DLQ copy was accepted.
                await this.publisher.sendToQueue(
                  destination,
                  message.content,
                  options as any,
                );
                if (!retrying) {
                  this.logger.error(
                    `Event ${message.properties.messageId ?? 'unknown'} moved to ${deadLetterQueue}: ${errorMessage}`,
                    error instanceof Error ? error.stack : undefined,
                  );
                }
                rawChannel.ack(message);
              } catch (publishError) {
                this.logger.error(
                  `Could not publish ${retrying ? 'retry' : 'DLQ'} copy for event ${message.properties.messageId ?? 'unknown'}; requeueing original`,
                  publishError instanceof Error ? publishError.stack : String(publishError),
                );
                try {
                  rawChannel.nack(message, false, true);
                } catch (nackError) {
                  // A closed channel causes RabbitMQ to requeue unacked messages itself.
                  this.logger.warn(
                    `Could not nack event ${message.properties.messageId ?? 'unknown'}; broker will recover it when the channel closes: ${nackError instanceof Error ? nackError.message : String(nackError)}`,
                  );
                }
              }
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
