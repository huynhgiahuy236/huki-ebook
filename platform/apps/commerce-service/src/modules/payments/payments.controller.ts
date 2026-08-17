import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { Request } from 'express';
import { createHmac } from 'crypto';
import { DataSource } from 'typeorm';
import {
  BookAccess,
  AccessStatus,
  CartItemFormat,
  HistoryActorType,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  OutboxEvent,
  OutboxStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../entities';
import { ConfigService } from '@nestjs/config';

interface PayOSCallback {
  orderCode: string;
  amount: number;
  description: string;
  transferDate: string;
  transactionId: string;
  accountNumber: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook/payos')
  @HttpCode(HttpStatus.OK)
  async payosWebhook(
    @Body() body: PayOSCallback,
    @Headers('x-payos-signature') signature: string,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    // Verify IP whitelist (PayOS IPs)
    const allowedIPs = ['103.90.224.52', '103.90.224.53'];
    if (!allowedIPs.includes(ip)) {
      throw new BadRequestException('Unauthorized IP');
    }

    // Verify signature
    const checksumKey = this.config.get('payos.checksumKey');
    if (checksumKey) {
      const expectedSignature = createHmac('sha256', checksumKey)
        .update(`${body.orderCode}|${body.amount}|${checksumKey}`)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid signature');
      }
    }

    // Find order by code
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { code: body.orderCode },
      relations: { sellerOrders: { items: true } },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Process callback in transaction
    await this.dataSource.transaction(async (manager) => {
      // Update payment record
      const payment = await manager.getRepository(Payment).findOne({
        where: { orderId: order.id },
      });

      if (payment) {
        payment.status = PaymentStatus.SUCCEEDED;
        payment.transactionId = body.transactionId.toString();
        payment.paidAt = new Date(body.transferDate);
        payment.callbackData = body as unknown as Record<string, unknown>;
        await manager.save(payment);
      }

      // Update order status
      order.paymentStatus = PaymentStatus.SUCCEEDED;
      order.status = OrderStatus.PROCESSING;
      await manager.save(order);

      // Record history
      await manager.save(manager.create(OrderStatusHistory, {
        orderId: order.id,
        sellerOrderId: null,
        fromStatus: null,
        toStatus: order.status,
        title: 'Payment confirmed via PayOS',
        description: `Transaction: ${body.transactionId}`,
        actorType: HistoryActorType.SYSTEM,
        actorId: null,
        metadata: { transactionId: body.transactionId },
      }));

      // Emit event
      await manager.save(manager.create(OutboxEvent, {
        eventId: body.transactionId.toString(),
        type: 'payment.succeeded',
        aggregateId: order.id,
        payload: {
          orderId: order.id,
          transactionId: body.transactionId,
          amount: body.amount,
        },
        status: OutboxStatus.PENDING,
        publishedAt: null,
      }));

      // Grant BookAccess for digital books
      const digitalItems = order.sellerOrders
        .flatMap((so) => so.items)
        .filter((item) => item.format === CartItemFormat.DIGITAL);

      for (const item of digitalItems) {
        const existingAccess = await manager.getRepository(BookAccess).findOne({
          where: { userId: order.userId, bookId: item.bookId },
        });

        if (!existingAccess) {
          await manager.save(manager.create(BookAccess, {
            userId: order.userId,
            bookId: item.bookId,
            orderId: order.id,
            status: AccessStatus.ACTIVE,
          }));
        }
      }
    });

    return { received: true };
  }
}
