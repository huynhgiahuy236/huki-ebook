import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BookFormat,
  BookStatus,
  CartItemFormat,
} from '../../../prisma/generated/client';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { GuestCartItemDto } from './dto/merge-cart.dto';
import { CartCacheService, CachedCart, CachedCartItem, CachedStoreGroup } from './cart-cache.service';
import { throwConflict, throwNotFound, throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

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
              include: {
                physicalDetails: true,
                digitalDetails: true,
                author: true,
                publisher: true,
              },
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
                  author: true,
                  publisher: true,
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
    // Load from DB to ensure live stock and price accuracy
    const cart = await this.getCartEntity(userId);
    const result = await this.processCartLiveMutations(cart);

    // Cache it
    await this.cache.set(userId, result);

    return result;
  }

  async mergeGuestCart(userId: string, guestItems: GuestCartItemDto[]) {
    if (!guestItems || !guestItems.length) {
      return this.getCart(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findUnique({ where: { userId } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId } });
      }

      for (const guestItem of guestItems) {
        try {
          const book = await tx.book.findUnique({
            where: { id: guestItem.bookId },
            include: { physicalDetails: true, digitalDetails: true },
          });

          if (!book || book.status !== BookStatus.PUBLISHED) {
            continue;
          }

          // Calculate available stock
          let maxAvailable = 99;
          const isPhysicalNeeded =
            guestItem.format === CartItemFormat.PHYSICAL ||
            guestItem.format === CartItemFormat.BOTH;
          const isDigitalNeeded =
            guestItem.format === CartItemFormat.DIGITAL ||
            guestItem.format === CartItemFormat.BOTH;
          if (isPhysicalNeeded) {
            if (!book.physicalDetails?.physicalEnabled) continue;
            const available = (book.physicalDetails.stock ?? 0) - (book.physicalDetails.reserved ?? 0);
            if (available <= 0) continue;
            maxAvailable = available;
          }
          if (isDigitalNeeded) {
            if (!book.digitalDetails?.digitalEnabled) continue;
            if (!isPhysicalNeeded) maxAvailable = 1;
          }

          const existing = await tx.cartItem.findFirst({
            where: { cartId: cart.id, bookId: guestItem.bookId },
          });

          const basePrice = this.resolveFormatBasePrice(book, guestItem.format);
          const currentPrice = await this.resolveBookPrice(book.id, basePrice, guestItem.format);

          if (existing) {
            const targetQty = guestItem.format === CartItemFormat.DIGITAL
              ? 1
              : Math.min(existing.quantity + guestItem.quantity, maxAvailable);

            await tx.cartItem.update({
              where: { id: existing.id },
              data: { format: guestItem.format, quantity: targetQty, unitPrice: currentPrice },
            });
          } else {
            const targetQty = Math.min(guestItem.quantity, maxAvailable);
            await tx.cartItem.create({
              data: {
                cartId: cart.id,
                bookId: book.id,
                format: guestItem.format,
                quantity: targetQty,
                unitPrice: currentPrice,
              },
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to merge guest item ${guestItem.bookId}:`, err);
        }
      }

      await tx.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });
    });

    await this.cache.invalidate(userId);
    return this.getCart(userId);
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

      // Shopee Anti-Fraud: Chặn người bán tự thêm sản phẩm của gian hàng mình vào giỏ hàng
      if (book.ownerUserId && book.ownerUserId === userId) {
        throwBadRequest(ErrorCode.SELF_PURCHASE_FORBIDDEN, 'Bạn không thể thêm sản phẩm từ gian hàng của chính mình vào giỏ hàng');
      }

      this.validateAvailability(book, dto.format, dto.quantity);

      // Check existing item (unique per cartId + bookId)
      const existing = await tx.cartItem.findFirst({
        where: { cartId: cart!.id, bookId: dto.bookId },
      });

      if (existing?.format === CartItemFormat.DIGITAL && dto.format === CartItemFormat.DIGITAL) {
        throwConflict(ErrorCode.CART_DIGITAL_ALREADY_OWNED);
      }

      const quantity =
        dto.format === CartItemFormat.DIGITAL
          ? 1
          : existing?.format === dto.format
            ? (existing?.quantity ?? 0) + dto.quantity
            : dto.quantity;

      this.validateAvailability(book!, dto.format, quantity);

      const basePrice = this.resolveFormatBasePrice(book!, dto.format);
      const unitPrice = await this.resolveBookPrice(book!.id, basePrice, dto.format);

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { format: dto.format, quantity, unitPrice },
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
    const needsPhysical = format === CartItemFormat.PHYSICAL || format === CartItemFormat.BOTH;
    const needsDigital = format === CartItemFormat.DIGITAL || format === CartItemFormat.BOTH;

    if (needsPhysical) {
      if (
        ![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format) ||
        !book.physicalDetails?.physicalEnabled
      ) {
        throwBadRequest(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
      }
      const available =
        (book.physicalDetails.stock ?? 0) - (book.physicalDetails.reserved ?? 0);
      if (available < quantity) {
        throwConflict(ErrorCode.INVENTORY_INSUFFICIENT);
      }
    }
    if (needsDigital) {
      if (
        ![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format) ||
        !book.digitalDetails?.digitalEnabled
      ) {
        throwBadRequest(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
      }
    }
  }

  private readonly storeNameCache = new Map<string, { name: string; canonicalId: string; expiry: number }>();
  private businessDirectoryCache: {
    expiresAt: number;
    aliasMap: Map<string, { canonicalStoreId: string; storeName: string }>;
    singleStoreFallback: { canonicalStoreId: string; storeName: string } | null;
  } | null = null;

  private async getBusinessDirectory(): Promise<{
    aliasMap: Map<string, { canonicalStoreId: string; storeName: string }>;
    singleStoreFallback: { canonicalStoreId: string; storeName: string } | null;
  }> {
    if (this.businessDirectoryCache && this.businessDirectoryCache.expiresAt > Date.now()) {
      return {
        aliasMap: this.businessDirectoryCache.aliasMap,
        singleStoreFallback: this.businessDirectoryCache.singleStoreFallback,
      };
    }

    const aliasMap = new Map<string, { canonicalStoreId: string; storeName: string }>();
    let singleStoreFallback: { canonicalStoreId: string; storeName: string } | null = null;

    const businessPort = process.env.BUSINESS_SERVICE_PORT || 3002;
    const businessBaseUrl = process.env.BUSINESS_SERVICE_URL || `http://localhost:${businessPort}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${businessBaseUrl}/api/v1/businesses?limit=100`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const json = (await res.json()) as any;
        const businesses = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.items)
            ? json.data.items
            : Array.isArray(json?.items)
              ? json.items
              : [];

        for (const biz of businesses) {
          if (!biz?.id) continue;
          const canonicalStoreId = String(biz.id);
          const storeName = String(
            biz.stores?.[0]?.name || biz.displayName || biz.name || 'Nhà Sách HuKi Official',
          ).trim();
          const entry = { canonicalStoreId, storeName };

          aliasMap.set(canonicalStoreId.toLowerCase(), entry);
          if (biz.slug) aliasMap.set(String(biz.slug).toLowerCase(), entry);
          if (Array.isArray(biz.stores)) {
            for (const st of biz.stores) {
              if (st?.id) aliasMap.set(String(st.id).toLowerCase(), entry);
              if (st?.slug) aliasMap.set(String(st.slug).toLowerCase(), entry);
            }
          }
        }

        if (businesses.length === 1 && businesses[0]?.id) {
          const onlyBiz = businesses[0];
          singleStoreFallback = {
            canonicalStoreId: String(onlyBiz.id),
            storeName: String(
              onlyBiz.stores?.[0]?.name || onlyBiz.displayName || onlyBiz.name || 'Nhà Sách HuKi Official',
            ).trim(),
          };
        }
      // Only cache non-empty directory responses so transient errors never poison lookups for 60s
      if (businesses.length > 0) {
        this.businessDirectoryCache = {
          expiresAt: Date.now() + 60000,
          aliasMap,
          singleStoreFallback,
        };
      }
      }
    } catch {
      // Tolerate unreachable business-service (e.g. unit tests)
    }

    return { aliasMap, singleStoreFallback };
  }

  public async resolveCanonicalStore(
    rawStoreId?: string | null,
  ): Promise<{ canonicalStoreId: string; storeName: string }> {
    const raw = String(rawStoreId || '').trim();
    const lower = raw.toLowerCase();
    const { aliasMap, singleStoreFallback } = await this.getBusinessDirectory();

    const OFFICIAL_SEEDS = new Set([
      '',
      'huki-official',
      'default-store',
      'nha-sach-huki-official',
      '77777777-0000-4000-8000-000000000001',
      '88888888-0000-4000-8000-000000000001',
      '99999999-0000-4000-8000-000000000001',
    ]);

    if (lower && aliasMap.has(lower)) {
      return aliasMap.get(lower)!;
    }

    if (OFFICIAL_SEEDS.has(lower)) {
      if (singleStoreFallback) {
        return singleStoreFallback;
      }
      return {
        canonicalStoreId: '77777777-0000-4000-8000-000000000001',
        storeName: 'Nhà Sách HuKi Official',
      };
    }

    const cached = this.storeNameCache.get(raw);
    if (cached && cached.expiry > Date.now()) {
      return { canonicalStoreId: cached.canonicalId, storeName: cached.name };
    }

    const businessPort = process.env.BUSINESS_SERVICE_PORT || 3002;
    const businessBaseUrl = process.env.BUSINESS_SERVICE_URL || `http://localhost:${businessPort}`;

    try {
      const resStore = await fetch(`${businessBaseUrl}/api/v1/stores/${encodeURIComponent(raw)}`);
      if (resStore.ok) {
        const json = (await resStore.json()) as any;
        const data = json.data || json;
        if (data?.name) {
          const canonicalId = String(data.businessId || data.id || raw);
          this.storeNameCache.set(raw, { name: data.name, canonicalId, expiry: Date.now() + 60000 });
          return { canonicalStoreId: canonicalId, storeName: data.name };
        }
      }
    } catch {
      // Ignore
    }

    try {
      const resSlug = await fetch(`${businessBaseUrl}/api/v1/stores/slug/${encodeURIComponent(raw)}`);
      if (resSlug.ok) {
        const json = (await resSlug.json()) as any;
        const data = json.data || json;
        if (data?.name) {
          const canonicalId = String(data.businessId || data.id || raw);
          this.storeNameCache.set(raw, { name: data.name, canonicalId, expiry: Date.now() + 60000 });
          return { canonicalStoreId: canonicalId, storeName: data.name };
        }
      }
    } catch {
      // Ignore
    }

    try {
      const resBiz = await fetch(`${businessBaseUrl}/api/v1/businesses/${encodeURIComponent(raw)}`);
      if (resBiz.ok) {
        const json = (await resBiz.json()) as any;
        const data = json.data || json;
        const storeName = data?.stores?.[0]?.name || data?.displayName || data?.name;
        if (storeName) {
          const canonicalId = String(data.id || raw);
          this.storeNameCache.set(raw, { name: storeName, canonicalId, expiry: Date.now() + 60000 });
          return { canonicalStoreId: canonicalId, storeName };
        }
      }
    } catch {
      // Ignore
    }

    if (singleStoreFallback) {
      return singleStoreFallback;
    }

    return { canonicalStoreId: raw || 'huki-official', storeName: 'Gian Hàng HUKI' };
  }

  public async resolveStoreName(storeId: string): Promise<string> {
    const resolved = await this.resolveCanonicalStore(storeId);
    return resolved.storeName;
  }

  private resolveFormatBasePrice(book: any, format?: string | null): number {
    const comboPrice = Number(book?.priceCombo ?? book?.price ?? 0);
    const bookFormat = String(book?.format || 'PHYSICAL').toUpperCase();
    let pricePaper = Number(book?.pricePaper ?? book?.physicalPrice ?? 0);
    let priceEbook = Number(book?.priceEbook ?? book?.ebookPrice ?? 0);

    if (book?.physicalDetails?.dimensions) {
      try {
        const dim =
          typeof book.physicalDetails.dimensions === 'string'
            ? JSON.parse(book.physicalDetails.dimensions)
            : book.physicalDetails.dimensions;
        if (dim && typeof dim === 'object') {
          if (!pricePaper && dim.pricePaper !== undefined) pricePaper = Number(dim.pricePaper);
          if (!priceEbook && dim.priceEbook !== undefined) priceEbook = Number(dim.priceEbook);
        }
      } catch {}
    }

    const fmt = String(format || bookFormat).toUpperCase();
    if (fmt === CartItemFormat.PHYSICAL) {
      return pricePaper > 0
        ? pricePaper
        : bookFormat === 'BOTH' && comboPrice > 0
          ? Math.round(comboPrice * 0.75)
          : comboPrice;
    }
    if (fmt === CartItemFormat.DIGITAL) {
      return priceEbook > 0
        ? priceEbook
        : bookFormat === 'BOTH' && comboPrice > 0
          ? Math.round(comboPrice * 0.45)
          : comboPrice;
    }
    return comboPrice;
  }

  private async resolveBookPrice(
    bookId: string,
    basePrice: number,
    format?: string,
  ): Promise<number> {
    const promotionPort = process.env.PROMOTION_SERVICE_PORT || 3007;
    const promotionBaseUrl = process.env.PROMOTION_SERVICE_URL || `http://localhost:${promotionPort}`;

    try {
      // 1. Check active flash sale matching purchased format
      const formatQuery = format ? `?format=${encodeURIComponent(format)}` : '';
      const res = await fetch(`${promotionBaseUrl}/api/v1/flash-sales/price/${bookId}${formatQuery}`);
      if (res.ok) {
        const json = await res.json() as any;
        const data = json.data || json;
        if (data && data.salePrice && Number(data.salePrice) < basePrice) {
          return Number(data.salePrice);
        }
      }
    } catch {
      // ignore
    }

    try {
      // 2. Check active seller book discount
      const resDiscount = await fetch(`${promotionBaseUrl}/api/v1/discounts/active/${bookId}`);
      if (resDiscount.ok) {
        const json = await resDiscount.json() as any;
        const discount = json.data || json;
        if (discount && discount.value > 0) {
          if (discount.type === 'PERCENTAGE') {
            const calculated = Math.max(0, Math.round(basePrice * (1 - Number(discount.value) / 100)));
            return calculated;
          } else if (discount.type === 'FIXED_AMOUNT') {
            const calculated = Math.max(0, Math.round(basePrice - Number(discount.value)));
            return calculated;
          }
        }
      }
    } catch {
      // ignore
    }

    return basePrice;
  }

  private async processCartLiveMutations(cart: any): Promise<CachedCart> {
    const processedItems: CachedCartItem[] = [];
    let hasDbUpdates = false;

    for (const item of cart.items) {
      const book = item.book;
      const isPhysical = item.format === CartItemFormat.PHYSICAL || item.format === CartItemFormat.BOTH;
      const isPublished = book.status === BookStatus.PUBLISHED;

      let isAvailable = true;
      let status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'PARTIAL_STOCK' = 'AVAILABLE';
      let availableStock = 99;
      let stockWarning: string | null = null;

      if (!isPublished) {
        isAvailable = false;
        status = 'OUT_OF_STOCK';
        availableStock = 0;
      } else if (isPhysical) {
        const physicalEnabled = book.physicalDetails?.physicalEnabled ?? true;
        const stock = book.physicalDetails?.stock ?? 0;
        const reserved = book.physicalDetails?.reserved ?? 0;
        availableStock = Math.max(0, stock - reserved);

        if (!physicalEnabled || availableStock <= 0) {
          isAvailable = false;
          status = 'OUT_OF_STOCK';
        } else if (item.quantity > availableStock) {
          isAvailable = true;
          status = 'PARTIAL_STOCK';
          stockWarning = `Kho của người bán chỉ còn ${availableStock} cuốn khả dụng. Số lượng đã được tự động điều chỉnh!`;

          // Auto-adjust quantity in DB
          try {
            await this.prisma.cartItem.update({
              where: { id: item.id },
              data: { quantity: availableStock },
            });
            item.quantity = availableStock;
            hasDbUpdates = true;
          } catch (e) {
            this.logger.warn(`Failed to auto adjust item quantity for ${item.id}`, e);
          }
        }
      } else {
        const digitalEnabled = book.digitalDetails?.digitalEnabled ?? true;
        if (!digitalEnabled) {
          isAvailable = false;
          status = 'OUT_OF_STOCK';
          availableStock = 0;
        } else {
          availableStock = 999;
        }
      }

      // Price Mutation Detection
      const formatBasePrice = this.resolveFormatBasePrice(book, item.format);
      const currentLivePrice = isAvailable
        ? await this.resolveBookPrice(book.id, formatBasePrice, item.format)
        : formatBasePrice;

      const addedPrice = Number(item.unitPrice);
      let priceChange: 'INCREASED' | 'DECREASED' | null = null;
      let priceChangeMessage: string | null = null;

      if (currentLivePrice !== addedPrice && isAvailable) {
        if (currentLivePrice < addedPrice) {
          priceChange = 'DECREASED';
          priceChangeMessage = `🎉 Giá sách đã giảm từ ${addedPrice.toLocaleString('vi-VN')}đ xuống ${currentLivePrice.toLocaleString('vi-VN')}đ`;
        } else {
          priceChange = 'INCREASED';
          priceChangeMessage = `⚠️ Giá sách đã cập nhật từ ${addedPrice.toLocaleString('vi-VN')}đ lên ${currentLivePrice.toLocaleString('vi-VN')}đ (hết phiên Flash Sale)`;
        }

        // Update unitPrice in DB to reflect live price
        try {
          await this.prisma.cartItem.update({
            where: { id: item.id },
            data: { unitPrice: currentLivePrice },
          });
          item.unitPrice = currentLivePrice;
          hasDbUpdates = true;
        } catch (e) {
          this.logger.warn(`Failed to update price for ${item.id}`, e);
        }
      }

      const unitPrice = isAvailable ? currentLivePrice : addedPrice;
      const subtotal = unitPrice * item.quantity;

      const rawStoreId = book.storeId || book.businessId || 'huki-official';
      const publisherName =
        (book.publisher && typeof book.publisher === 'object' && book.publisher.name) ||
        (typeof book.publisher === 'string' && book.publisher) ||
        'Đang cập nhật';
      const resolvedStore = await this.resolveCanonicalStore(rawStoreId);
      const storeId = resolvedStore.canonicalStoreId;
      const storeName = resolvedStore.storeName;

      const authorName =
        (book.author && typeof book.author === 'object' && book.author.name) ||
        (typeof book.author === 'string' ? book.author : 'Tác giả HUKI');

      processedItems.push({
        id: item.id,
        bookId: item.bookId,
        format: item.format,
        quantity: item.quantity,
        unitPrice,
        addedPrice,
        originalPrice: formatBasePrice,
        discountAmount: Math.max(0, formatBasePrice - unitPrice),
        currentPrice: currentLivePrice,
        subtotal,
        isAvailable,
        status,
        availableStock,
        priceChange,
        priceChangeMessage,
        stockWarning,
        book: {
          id: book.id,
          storeId,
          businessId: storeId,
          storeName,
          title: book.title,
          slug: book.slug,
          coverUrl: book.coverUrl,
          status: book.status,
          author: authorName,
          publisher: publisherName,
        },
      });
    }

    if (hasDbUpdates) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });
    }

    // Partition available vs unavailable
    const availableItems = processedItems.filter((i) => i.isAvailable);
    const unavailableItems = processedItems.filter((i) => !i.isAvailable);

    // Group available items by storeId
    const storeMap = new Map<string, CachedStoreGroup>();
    for (const item of availableItems) {
      const storeId = item.book.storeId || 'huki-official';
      if (!storeMap.has(storeId)) {
        const storeName = item.book.storeName || 'Gian Hàng HUKI';
        storeMap.set(storeId, {
          id: storeId,
          name: storeName,
          tag: storeName.slice(0, 2).toUpperCase(),
          tagBg: 'bg-emerald-600',
          badge: 'Chính Hãng',
          items: [],
          subtotal: 0,
        });
      }
      const group = storeMap.get(storeId)!;
      group.items.push(item);
      group.subtotal += item.subtotal;
    }

    const storeGroups = Array.from(storeMap.values());
    const totalItems = availableItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = availableItems.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      items: processedItems,
      availableItems,
      unavailableItems,
      storeGroups,
      totalItems,
      subtotal,
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
