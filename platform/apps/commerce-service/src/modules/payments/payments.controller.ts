import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createHmac } from 'crypto';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CartItemFormat } from '@prisma/client';

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
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook/payos')
  @HttpCode(HttpStatus.OK)
  async payosWebhook(
    @Body() body: PayOSCallback,
    @Headers('x-payos-signature') signature: string,
    @Ip() ip: string,
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
    const order = await this.prisma.order.findFirst({
      where: { code: body.orderCode },
      include: { sellerOrders: { include: { items: true } } },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Process callback in transaction
    await this.prisma.$transaction(async (tx) => {
      // Create or update payment record
      const existingPayment = await tx.payment.findUnique({
        where: { orderId: order.id },
      });

      if (existingPayment) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'SUCCEEDED',
            transactionId: body.transactionId.toString(),
            paidAt: new Date(body.transferDate),
            callbackData: body as any,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.grandTotal,
            method: order.paymentMethod,
            status: 'SUCCEEDED',
            provider: order.paymentProvider,
            transactionId: body.transactionId.toString(),
            paidAt: new Date(body.transferDate),
            callbackData: body as any,
          },
        });
      }

      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'SUCCEEDED',
          status: 'PROCESSING',
        },
      });

      // Record history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'PROCESSING',
          title: 'Payment confirmed via PayOS',
          description: `Transaction: ${body.transactionId}`,
          actorType: 'SYSTEM',
          actorId: null,
        },
      });

      // Emit event
      await tx.outboxEvent.create({
        data: {
          eventId: body.transactionId.toString(),
          type: 'payment.succeeded',
          aggregateId: order.id,
          payload: {
            orderId: order.id,
            transactionId: body.transactionId,
            amount: body.amount,
          },
          status: 'PENDING',
        },
      });

      // Grant BookAccess for digital books
      const digitalItems = order.sellerOrders
        .flatMap((so) => so.items)
        .filter((item) => item.format === CartItemFormat.DIGITAL);

      for (const item of digitalItems) {
        const existingAccess = await tx.bookAccess.findUnique({
          where: { userId_bookId: { userId: order.userId, bookId: item.bookId } },
        });

        if (!existingAccess) {
          await tx.bookAccess.create({
            data: {
              userId: order.userId,
              bookId: item.bookId,
              orderId: order.id,
              status: 'ACTIVE',
            },
          });
        }
      }
    });

    return { received: true };
  }
}
