import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BookFormat,
  BookStatus,
  CartItemFormat,
} from '../../../prisma/generated/client';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartCacheService, CachedCart } from './cart-cache.service';
import { throwConflict, throwNotFound, throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CartCacheService,
  ) {}

  async getCartEntity(userId: string, create = true) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            book: {
              include: { physicalDetails: true, digitalDetails: true },
            },
          },
        },
      },
    });

    if (!cart && create) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              book: {
                include: {
                  physicalDetails: true,
                  digitalDetails: true,
                },
              },
            },
          },
        },
      });
    }

    if (!cart) throwNotFound(ErrorCode.CART_NOT_FOUND);
    return cart;
  }

  async getCart(userId: string) {
    // Try cache first
    const cached = await this.cache.get(userId);
    if (cached) {
      // Refresh from DB in background for stock/price changes
      void this.refreshCacheInBackground(userId);
      return this.formatCartResponse(cached);
    }

    // Load from DB
    const cart = await this.getCartEntity(userId);
    const result = this.transformToCachedCart(cart);

    // Cache it
    await this.cache.set(userId, result);

    return this.formatCartResponse(result);
  }

  async add(userId: string, dto: AddCartItemDto) {
    await this.prisma.$transaction(async (tx) => {
      // Get or create cart
      let cart = await tx.cart.findUnique({ where: { userId } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId } });
      }

      // Get book
      const book = await tx.book.findUnique({
        where: { id: dto.bookId },
        include: { physicalDetails: true, digitalDetails: true },
      });

      if (!book || book.status !== BookStatus.PUBLISHED) {
        throwNotFound(ErrorCode.BOOK_NOT_FOUND);
      }

      this.validateAvailability(book, dto.format, dto.quantity);

      // Check existing item
      const existing = await tx.cartItem.findFirst({
        where: { cartId: cart!.id, bookId: dto.bookId, format: dto.format },
      });

      if (existing?.format === CartItemFormat.DIGITAL) {
        throwConflict(ErrorCode.CART_DIGITAL_ALREADY_OWNED);
      }

      const quantity =
        dto.format === CartItemFormat.DIGITAL
          ? 1
          : (existing?.quantity ?? 0) + dto.quantity;

      this.validateAvailability(book!, dto.format, quantity);

      const unitPrice = Number(book!.price);

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity, unitPrice },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart!.id,
            bookId: book!.id,
            format: dto.format,
            quantity,
            unitPrice,
          },
        });
      }

      await tx.cart.update({
        where: { id: cart!.id },
        data: { updatedAt: new Date() },
      });
    });

    // Invalidate cache and return fresh data
    await this.cache.invalidate(userId);
    return this.getCart(userId);
  }

  async update(userId: string, itemId: string, quantity: number) {
    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (!cart) throwNotFound(ErrorCode.CART_NOT_FOUND);

      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId: cart!.id },
        include: {
          book: { include: { physicalDetails: true, digitalDetails: true } },
        },
      });

      if (!item) throwNotFound(ErrorCode.CART_ITEM_NOT_FOUND);

      if (
        item!.format === CartItemFormat.DIGITAL &&
        quantity !== 1
      ) {
        throwBadRequest(ErrorCode.CART_QUANTITY_INVALID);
      }

      this.validateAvailability(item!.book, item!.format, quantity);

      await tx.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });

      await tx.cart.update({
        where: { id: cart!.id },
        data: { updatedAt: new Date() },
      });
    });

    // Invalidate cache and return fresh data
    await this.cache.invalidate(userId);
    return this.getCart(userId);
  }

  async remove(userId: string, itemId: string) {
    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (!cart) throwNotFound(ErrorCode.CART_NOT_FOUND);

      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId: cart!.id },
      });

      if (!item) throwNotFound(ErrorCode.CART_ITEM_NOT_FOUND);

      await tx.cartItem.delete({ where: { id: itemId } });

      await tx.cart.update({
        where: { id: cart!.id },
        data: { updatedAt: new Date() },
      });
    });

    // Invalidate cache and return fresh data
    await this.cache.invalidate(userId);
    return this.getCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    // Invalidate cache
    await this.cache.invalidate(userId);
  }

  private validateAvailability(
    book: any,
    format: string,
    quantity: number,
  ) {
    if (format === CartItemFormat.PHYSICAL) {
      if (
        ![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format) ||
        !book.physicalDetails?.physicalEnabled
      ) {
        throwBadRequest(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
      }
      const available =
        book.physicalDetails.stock - book.physicalDetails.reserved;
      if (available < quantity) {
        throwConflict(ErrorCode.INVENTORY_INSUFFICIENT);
      }
    } else {
      if (
        ![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format) ||
        !book.digitalDetails?.digitalEnabled
      ) {
        throwBadRequest(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
      }
    }
  }

  private transformToCachedCart(cart: any): CachedCart {
    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map((item: any) => ({
        id: item.id,
        bookId: item.bookId,
        format: item.format,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.unitPrice) * item.quantity,
        book: {
          id: item.book.id,
          storeId: item.book.storeId,
          title: item.book.title,
          slug: item.book.slug,
          coverUrl: item.book.coverUrl,
          status: item.book.status,
        },
      })),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  private formatCartResponse(cached: CachedCart) {
    return {
      id: cached.id,
      userId: cached.userId,
      items: cached.items,
      totalItems: cached.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cached.items.reduce((sum, item) => sum + item.subtotal, 0),
      updatedAt: cached.updatedAt,
    };
  }

  private async refreshCacheInBackground(userId: string): Promise<void> {
    try {
      const cart = await this.getCartEntity(userId, false);
      if (cart) {
        const cached = this.transformToCachedCart(cart);
        await this.cache.set(userId, cached);
      }
    } catch {
      // Silently fail - cache will be refreshed on next write
    }
  }
}
