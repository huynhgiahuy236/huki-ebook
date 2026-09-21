import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { CheckoutConfirmDto, CheckoutPreviewDto } from "./dto/checkout.dto";
import { InventoryReservationService } from "./inventory-reservation.service";
import {
  BookFormat,
  BookStatus,
  CartItemFormat,
  PaymentMethod,
  PaymentStatus,
  SellerOrderStatus,
  Prisma,
} from "../../../prisma/generated/client";
import { ORDER_EVENTS } from "../../../../../libs/shared/src";
import {
  throwBadRequest,
  throwNotFound,
  throwConflict,
} from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";
import { FlashSaleClientService } from "./flash-sale-client.service";
import { ShippingClientService } from "../shipping/shipping-client.service";
import { VoucherClientService } from "../voucher/voucher-client.service";
import { PricingCalculatorService, PricingItem, VoucherSelection } from "../voucher/pricing-calculator.service";
import { SanctionsService } from "../sanctions/sanctions.service";

export interface CheckoutSnapshotItem {
  cartItemId: string;
  bookId: string;
  storeId: string;
  ownerUserId: string;
  title: string;
  coverUrl: string | null;
  isbn: string | null;
  format: CartItemFormat;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  weight: number;
  isFlashSale: boolean;
  flashSaleId?: string;
  flashSaleName?: string;
  maxPerUser?: number;
}

export interface CheckoutSnapshotGroup {
  storeId: string;
  ownerUserId: string;
  requiresShipping: boolean;
  itemSubtotal: number;
  shippingFee: number;
  storeVoucherDiscount: number;
  storeVoucherCode?: string;
  grandTotal: number;
  items: CheckoutSnapshotItem[];
}

export interface CheckoutSnapshot {
  groups: CheckoutSnapshotGroup[];
  itemSubtotal: number;
  shippingTotal: number;
  storeDiscountTotal: number;
  platformDiscountTotal: number;
  shippingDiscountTotal: number;
  discountTotal: number;
  grandTotal: number;
  vouchers: {
    platform?: { code: string; discount: number };
    stores: Array<{ storeId: string; code: string; discount: number }>;
    shipping?: { code: string; discount: number };
  };
  shippingAddress: {
    id?: string;
    recipientName: string;
    phone: string;
    line1: string;
    ward: string;
    district: string;
    province: string;
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
    communeType?: string;
  } | null;
  note: string | null;
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly config: ConfigService,
    private readonly reservations: InventoryReservationService,
    private readonly flashSales: FlashSaleClientService,
    private readonly shippingClient: ShippingClientService,
    private readonly voucherClient: VoucherClientService,
    private readonly pricingCalculator: PricingCalculatorService,
    @Optional() private readonly sanctionsService?: SanctionsService,
  ) {}

  async preview(userId: string, dto: CheckoutPreviewDto) {
    const cart = await this.cartService.getCartEntity(userId);
    if (!cart!.items.length) throwBadRequest(ErrorCode.CART_EMPTY);

    // Step 1: Build items from cart
    const items: CheckoutSnapshotItem[] = await Promise.all(
      cart!.items.map(async (item) => {
        const book = item.book as any;
        if (book.status !== BookStatus.PUBLISHED) {
          throwConflict(ErrorCode.BOOK_NOT_FOUND);
        }

        if (item.format === CartItemFormat.PHYSICAL) {
          if (
            ![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format) ||
            !book.physicalDetails?.physicalEnabled
          ) {
            throwConflict(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
          }
          if (
            book.physicalDetails.stock - book.physicalDetails.reserved <
            item.quantity
          ) {
            throwConflict(ErrorCode.INVENTORY_INSUFFICIENT);
          }
        } else {
          if (
            ![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format) ||
            !book.digitalDetails?.digitalEnabled
          ) {
            throwConflict(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
          }
        }

        const basePrice = Number(book.price);
        const flashSale = await this.flashSales.quote(
          userId,
          book.id,
          item.quantity,
        );
        const unitPrice =
          flashSale.isFlashSale && flashSale.salePrice
            ? Number(flashSale.salePrice)
            : basePrice;
        return {
          cartItemId: item.id,
          bookId: book.id,
          storeId: book.storeId,
          ownerUserId: book.ownerUserId,
          title: book.title,
          coverUrl: book.coverUrl,
          isbn: book.isbn,
          format: item.format,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
          weight:
            item.format === CartItemFormat.PHYSICAL && book.physicalDetails
              ? book.physicalDetails.weight * item.quantity
              : 0,
          isFlashSale: flashSale.isFlashSale,
          flashSaleId: flashSale.flashSaleId,
          flashSaleName: flashSale.flashSaleName,
          maxPerUser: flashSale.maxPerUser,
        };
      }),
    );

    if (this.sanctionsService) {
      const distinctStoreIds = Array.from(new Set(items.map((item) => item.storeId)));
      for (const storeId of distinctStoreIds) {
        await this.sanctionsService.assertCanReceiveOrders(storeId);
      }
    }

    const hasPhysicalItems = items.some(
      (item) => item.format === CartItemFormat.PHYSICAL,
    );

    // Step 2: Resolve address
    let resolvedAddress: CheckoutSnapshot['shippingAddress'] = null;
    if (hasPhysicalItems) {
      if (dto.addressId) {
        // Validate address ownership via Shipping Service
        const addr = await this.shippingClient.getAddress(dto.addressId, userId);
        resolvedAddress = {
          id: addr.id,
          recipientName: addr.name,
          phone: addr.phone,
          line1: addr.address,
          ward: addr.ward,
          district: addr.district,
          province: addr.province,
          provinceCode: addr.provinceCode,
          districtCode: addr.districtCode,
          wardCode: addr.wardCode,
          communeType: addr.communeType,
        };
      } else if (dto.shippingAddress) {
        // Fallback: use embedded address (deprecated but still supported)
        resolvedAddress = {
          recipientName: dto.shippingAddress.recipientName,
          phone: dto.shippingAddress.phone,
          line1: dto.shippingAddress.line1,
          ward: dto.shippingAddress.ward,
          district: dto.shippingAddress.district,
          province: dto.shippingAddress.province,
        };
      } else {
        throwBadRequest(ErrorCode.SHIPPING_ADDRESS_REQUIRED);
      }
    }

    // Step 3: Build voucher selection
    const voucherSelection: VoucherSelection = {
      platformVoucherCode: dto.platformVoucherCode,
      storeVoucherCodes: dto.storeVoucherCodes,
      shippingVoucherCode: dto.shippingVoucherCode,
    };

    // Step 4: Convert to pricing items
    const pricingItems: PricingItem[] = items.map((item) => ({
      cartItemId: item.cartItemId,
      bookId: item.bookId,
      storeId: item.storeId,
      ownerUserId: item.ownerUserId,
      title: item.title,
      format: item.format as 'PHYSICAL' | 'DIGITAL',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      weight: item.weight,
    }));

    // Step 5: Calculate pricing with vouchers and shipping
    const pricingResult = await this.pricingCalculator.calculate(
      userId,
      pricingItems,
      voucherSelection,
      resolvedAddress
        ? {
            province: resolvedAddress.province,
            district: resolvedAddress.district,
            ward: resolvedAddress.ward,
            address: resolvedAddress.line1,
          }
        : undefined,
    );

    // Step 6: Build snapshot groups
    const groups: CheckoutSnapshotGroup[] = pricingResult.groups.map((group) => ({
      storeId: group.storeId,
      ownerUserId: group.ownerUserId,
      requiresShipping: group.requiresShipping,
      itemSubtotal: group.itemSubtotal,
      shippingFee: group.shippingFee,
      storeVoucherDiscount: group.storeVoucherDiscount,
      storeVoucherCode: group.storeVoucherCode,
      grandTotal: group.grandTotal,
      items: items.filter((item) => item.storeId === group.storeId),
    }));

    // Step 7: Build voucher snapshot
    const voucherSnapshot: CheckoutSnapshot['vouchers'] = {
      stores: [],
    };

    if (pricingResult.vouchers.platform) {
      voucherSnapshot.platform = {
        code: pricingResult.vouchers.platform.code,
        discount: pricingResult.vouchers.platform.discount,
      };
    }

    for (const storeV of pricingResult.vouchers.stores) {
      voucherSnapshot.stores.push({
        storeId: storeV.storeId,
        code: storeV.code,
        discount: storeV.discount,
      });
    }

    if (pricingResult.vouchers.shipping) {
      voucherSnapshot.shipping = {
        code: pricingResult.vouchers.shipping.code,
        discount: pricingResult.vouchers.shipping.discount,
      };
    }

    const snapshot: CheckoutSnapshot = {
      groups,
      itemSubtotal: pricingResult.itemSubtotal,
      shippingTotal: pricingResult.shippingTotal,
      storeDiscountTotal: pricingResult.storeDiscountTotal,
      platformDiscountTotal: pricingResult.platformDiscountTotal,
      shippingDiscountTotal: pricingResult.shippingDiscountTotal,
      discountTotal: pricingResult.discountTotal,
      grandTotal: pricingResult.grandTotal,
      vouchers: voucherSnapshot,
      shippingAddress: resolvedAddress,
      note: dto.note ?? null,
    };

    // Step 8: Create session
    const hasFlashSale = items.some((item) => item.isFlashSale);
    const ttlMinutes = hasFlashSale
      ? 1
      : Number(
          this.config.get("checkout.sessionTtlMinutes") ??
            process.env.CHECKOUT_SESSION_TTL_MINUTES ??
            15,
        );

    const session = await this.prisma.checkoutSession.create({
      data: {
        userId,
        cartId: cart!.id,
        cartUpdatedAt: cart!.updatedAt as Date,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });

    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      ...snapshot,
      requiresShipping: hasPhysicalItems,
    };
  }

  async confirm(
    userId: string,
    idempotencyKey: string,
    dto: CheckoutConfirmDto,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 100) {
      throwBadRequest(ErrorCode.IDEMPOTENCY_KEY_REQUIRED);
    }

    // Check for existing order (idempotency)
    const existing = await this.prisma.order.findFirst({
      where: { userId, idempotencyKey },
      include: { sellerOrders: { include: { items: true } } },
    });
    if (existing) return this.confirmResponse(existing, true);

    let flashSaleReservationOrderId: string | undefined;
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const rawSession = await tx.checkoutSession.findUnique({
          where: { id: dto.sessionId },
        });

        if (!rawSession || rawSession.userId !== userId) {
          throwNotFound(ErrorCode.CHECKOUT_SESSION_NOT_FOUND);
        }
        const session = rawSession!;
        if (session.consumedAt) {
          throwConflict(ErrorCode.CHECKOUT_SESSION_CONSUMED);
        }
        if (session.expiresAt < new Date()) {
          throwConflict(ErrorCode.CHECKOUT_SESSION_EXPIRED);
        }

        const snapshot = session.snapshot as unknown as CheckoutSnapshot;

        // Re-validate address if addressId provided
        let shippingAddress = snapshot.shippingAddress;
        if (dto.addressId) {
          const addr = await this.shippingClient.getAddress(dto.addressId, userId);
          shippingAddress = {
            id: addr.id,
            recipientName: addr.name,
            phone: addr.phone,
            line1: addr.address,
            ward: addr.ward,
            district: addr.district,
            province: addr.province,
            provinceCode: addr.provinceCode,
            districtCode: addr.districtCode,
            wardCode: addr.wardCode,
            communeType: addr.communeType,
          };
        }

        // Re-validate vouchers if provided in confirm (CRITICAL: don't trust frontend)
        const voucherSelection: VoucherSelection = {
          platformVoucherCode: dto.platformVoucherCode,
          storeVoucherCodes: dto.storeVoucherCodes,
          shippingVoucherCode: dto.shippingVoucherCode,
        };

        // If vouchers provided in confirm, re-validate and recalculate
        let finalSnapshot = snapshot;
        if (voucherSelection.platformVoucherCode || voucherSelection.storeVoucherCodes || voucherSelection.shippingVoucherCode) {
          const pricingItems: PricingItem[] = snapshot.groups.flatMap((group) =>
            group.items.map((item) => ({
              cartItemId: item.cartItemId,
              bookId: item.bookId,
              storeId: item.storeId,
              ownerUserId: item.ownerUserId,
              title: item.title,
              format: item.format as 'PHYSICAL' | 'DIGITAL',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              weight: item.weight,
            })),
          );

          // Recalculate with new voucher selection
          const recalculated = await this.pricingCalculator.calculate(
            userId,
            pricingItems,
            voucherSelection,
            shippingAddress
              ? {
                  province: shippingAddress.province,
                  district: shippingAddress.district,
                  ward: shippingAddress.ward,
                  address: shippingAddress.line1,
                }
              : undefined,
          );

          // Update snapshot with new pricing
          finalSnapshot = {
            ...snapshot,
            shippingAddress,
            platformDiscountTotal: recalculated.platformDiscountTotal,
            shippingDiscountTotal: recalculated.shippingDiscountTotal,
            discountTotal: recalculated.discountTotal,
            grandTotal: recalculated.grandTotal,
            vouchers: recalculated.vouchers as any,
            groups: recalculated.groups.map((g) => ({
              ...g,
              items: snapshot.groups.find((sg) => sg.storeId === g.storeId)?.items || [],
            })) as CheckoutSnapshotGroup[],
          };
        } else if (dto.addressId) {
          finalSnapshot = {
            ...snapshot,
            shippingAddress,
          };
        }

        if (
          dto.paymentMethod === PaymentMethod.ONLINE_PAYMENT &&
          dto.paymentProvider &&
          dto.paymentProvider.toUpperCase() !== "PAYOS"
        ) {
          throwBadRequest(ErrorCode.PAYMENT_PROVIDER_INVALID);
        }

        if (this.sanctionsService) {
          const distinctStoreIds = Array.from(new Set(finalSnapshot.groups.map((group) => group.storeId)));
          for (const storeId of distinctStoreIds) {
            await this.sanctionsService.assertCanReceiveOrders(storeId);
          }
        }

        // Create order
        const order = await tx.order.create({
          data: {
            code: this.code("ORD"),
            userId,
            idempotencyKey,
            itemSubtotal: finalSnapshot.itemSubtotal,
            shippingTotal: finalSnapshot.shippingTotal,
            discountTotal: finalSnapshot.discountTotal,
            grandTotal: finalSnapshot.grandTotal,
            paymentMethod: dto.paymentMethod,
            paymentProvider:
              dto.paymentMethod === PaymentMethod.ONLINE_PAYMENT
                ? "PAYOS"
                : "COD",
            paymentStatus: PaymentStatus.PENDING,
            status:
              dto.paymentMethod === PaymentMethod.COD
                ? "PROCESSING"
                : "PENDING_PAYMENT",
            shippingAddress: finalSnapshot.shippingAddress as any,
            note: finalSnapshot.note,
          },
        });

        const flashSaleItems = finalSnapshot.groups
          .flatMap((group) => group.items)
          .filter((item) => item.isFlashSale);
        if (flashSaleItems.length) {
          await this.flashSales.reserveOrder(order.id, userId, flashSaleItems);
          flashSaleReservationOrderId = order.id;
        }

        if (dto.paymentMethod === PaymentMethod.COD) {
          await tx.payment.create({
            data: {
              orderId: order.id,
              amount: order.grandTotal,
              method: PaymentMethod.COD,
              status: PaymentStatus.PENDING,
              provider: "COD",
            },
          });
        }

        const shipmentSellerOrders: Array<{
          sellerOrderId: string;
          storeId: string;
          ownerUserId: string;
          requiresShipping: boolean;
          weight: number;
          codAmount: number;
        }> = [];

        // Create seller orders and items
        for (let i = 0; i < finalSnapshot.groups.length; i++) {
          const group = finalSnapshot.groups[i];
          const sellerOrder = await tx.sellerOrder.create({
            data: {
              orderId: order.id,
              code: `${order.code}-S${i + 1}`,
              storeId: group.storeId,
              ownerUserId: group.ownerUserId,
              requiresShipping: group.requiresShipping,
              itemSubtotal: group.itemSubtotal,
              shippingFee: group.shippingFee,
              grandTotal: group.grandTotal,
              status:
                dto.paymentMethod === PaymentMethod.COD
                  ? SellerOrderStatus.PENDING_CONFIRMATION
                  : SellerOrderStatus.PENDING_PAYMENT,
            },
          });

          // Grant digital book access for items in this group
          const digitalItems = group.items.filter(
            (item) => item.format === CartItemFormat.DIGITAL,
          );
          for (const item of digitalItems) {
            await tx.bookAccess.upsert({
              where: {
                userId_bookId: { userId, bookId: item.bookId },
              },
              create: {
                userId,
                bookId: item.bookId,
                orderId: order.id,
                sellerOrderId: sellerOrder.id,
              },
              update: {
                status: "ACTIVE",
                orderId: order.id,
                sellerOrderId: sellerOrder.id,
              },
            });
          }

          const orderItems = await Promise.all(
            group.items.map((item) =>
              tx.orderItem.create({
                data: {
                  sellerOrderId: sellerOrder.id,
                  bookId: item.bookId,
                  bookTitle: item.title,
                  bookCoverUrl: item.coverUrl,
                  bookIsbn: item.isbn,
                  format: item.format,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: item.subtotal,
                },
              }),
            ),
          );

          shipmentSellerOrders.push({
            sellerOrderId: sellerOrder.id,
            storeId: group.storeId,
            ownerUserId: group.ownerUserId,
            requiresShipping: group.requiresShipping,
            weight: group.items.reduce(
              (total: number, item) => total + item.weight,
              0,
            ),
            codAmount:
              dto.paymentMethod === PaymentMethod.COD ? group.grandTotal : 0,
          });

          // Reserve inventory for physical books
          await this.reservations.reserve(tx, order.id, orderItems);
        }

        // Create order status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: order.status,
            title: "Order created",
            actorType: "USER",
            actorId: userId,
          },
        });

        // Create outbox event
        await tx.outboxEvent.create({
          data: {
            eventId: randomBytes(16).toString("hex"),
            type: ORDER_EVENTS.CREATED,
            aggregateId: order.id,
            payload: {
              orderId: order.id,
              orderCode: order.code,
              userId,
              total: order.grandTotal,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              shippingAddress: shippingAddress
                ? {
                    receiverName: shippingAddress.recipientName,
                    receiverPhone: shippingAddress.phone,
                    address: shippingAddress.line1,
                    province: shippingAddress.province,
                    district: shippingAddress.district,
                    ward: shippingAddress.ward,
                  }
                : null,
              sellerOrders: shipmentSellerOrders,
            },
            status: "PENDING",
          },
        });

        // Mark session as consumed
        await tx.checkoutSession.update({
          where: { id: session.id },
          data: { consumedAt: new Date() },
        });

        // Clear cart items
        await tx.cartItem.deleteMany({ where: { cartId: session.cartId } });

        return order;
      });

      return this.confirmResponse(order, false);
    } catch (error) {
      if (flashSaleReservationOrderId) {
        await this.flashSales
          .releaseOrder(flashSaleReservationOrderId)
          .catch(() => undefined);
      }
      if ((error as any).code === "P2002") {
        const duplicate = await this.prisma.order.findFirst({
          where: { userId, idempotencyKey },
          include: { sellerOrders: { include: { items: true } } },
        });
        if (duplicate) return this.confirmResponse(duplicate, true);
      }
      throw error;
    }
  }

  /**
   * Consume voucher usage within the order transaction
   */
  private async consumeVouchers(
    tx: any,
    userId: string,
    orderId: string,
    snapshot: CheckoutSnapshot,
  ): Promise<void> {
    // Consume platform voucher
    if (snapshot.vouchers.platform) {
      try {
        await this.voucherClient.apply(userId, {
          voucherId: '', // Will be resolved by voucher service
          orderId,
          discountAmount: snapshot.platformDiscountTotal,
        });
      } catch (error) {
        // Log but don't fail - voucher may already be consumed or invalid
        console.error('Failed to consume platform voucher:', error);
      }
    }

    // Consume store vouchers
    for (const storeVoucher of snapshot.vouchers.stores) {
      try {
        await this.voucherClient.apply(userId, {
          voucherId: '', // Will be resolved by voucher service
          orderId,
          discountAmount: storeVoucher.discount,
        });
      } catch (error) {
        console.error('Failed to consume store voucher:', error);
      }
    }

    // Note: Shipping voucher is consumed differently - it reduces the shipping fee
    // No separate voucher usage record needed
  }

  private code(prefix: string) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private confirmResponse(order: any, replayed: boolean) {
    return {
      order,
      idempotentReplay: replayed,
      paymentRequired:
        order.paymentMethod === PaymentMethod.ONLINE_PAYMENT &&
        order.paymentStatus !== PaymentStatus.SUCCEEDED,
      paymentProvider: order.paymentProvider,
    };
  }
}
