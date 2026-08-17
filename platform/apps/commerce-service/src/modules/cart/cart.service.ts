import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem, Book } from '../../entities';
import { RedisService } from '../redis/redis.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  private readonly CART_CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    private redisService: RedisService,
  ) {}

  // ==================== GET OR CREATE CART ====================
  async getOrCreateCart(userId: string): Promise<Cart> {
    // Try Redis cache first
    const cachedCart = await this.redisService.get(`cart:${userId}`);
    if (cachedCart) {
      const cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items'],
      });
      if (cart) return cart;
    }

    // Find or create in database
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });
      await this.cartRepository.save(cart);
    }

    // Cache in Redis
    await this.redisService.set(
      `cart:${userId}`,
      JSON.stringify({ id: cart.id }),
      this.CART_CACHE_TTL,
    );

    return cart;
  }

  // ==================== ADD TO CART ====================
  async addToCart(userId: string, dto: AddToCartDto) {
    // Validate book exists and is available
    const book = await this.bookRepository.findOne({
      where: { id: dto.bookId },
      relations: ['store'],
    });

    if (!book) {
      throw new NotFoundException('Sách không tồn tại');
    }

    if (book.status !== 'PUBLISHED') {
      throw new BadRequestException('Sách không còn được bán');
    }

    // Check stock for physical books
    if (book.format !== 'DIGITAL' && book.stock < dto.quantity) {
      throw new BadRequestException('Số lượng trong kho không đủ');
    }

    // Check if book already purchased (for digital)
    if (book.format === 'DIGITAL') {
      const alreadyOwned = await this.checkDigitalBookOwnership(userId, dto.bookId);
      if (alreadyOwned) {
        throw new ConflictException('Bạn đã sở hữu sách điện tử này');
      }
    }

    // Check if already in cart
    let cartItem = await this.cartItemRepository.findOne({
      where: { cart: { userId }, bookId: dto.bookId },
    });

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + dto.quantity;

      if (book.format !== 'DIGITAL' && book.stock < newQuantity) {
        throw new BadRequestException('Số lượng trong kho không đủ');
      }

      cartItem.quantity = newQuantity;
      await this.cartItemRepository.save(cartItem);
    } else {
      // Create new cart item
      const cart = await this.getOrCreateCart(userId);

      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        bookId: dto.bookId,
        quantity: dto.quantity,
        price: book.salePrice || book.price,
      });
      await this.cartItemRepository.save(cartItem);
    }

    // Invalidate cache
    await this.invalidateCartCache(userId);

    return {
      message: 'Đã thêm vào giỏ hàng',
      data: await this.getCart(userId),
    };
  }

  // ==================== UPDATE CART ITEM ====================
  async updateCartItem(userId: string, bookId: string, dto: UpdateCartItemDto) {
    const cartItem = await this.cartItemRepository.findOne({
      where: { bookId, cart: { userId } },
      relations: ['cart', 'bookId'],
    });

    if (!cartItem) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    // Check stock
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('Sách không tồn tại');
    }

    if (book.format !== 'DIGITAL' && book.stock < dto.quantity) {
      throw new BadRequestException('Số lượng trong kho không đủ');
    }

    cartItem.quantity = dto.quantity;
    await this.cartItemRepository.save(cartItem);

    // Invalidate cache
    await this.invalidateCartCache(userId);

    return {
      message: 'Đã cập nhật số lượng',
      data: await this.getCart(userId),
    };
  }

  // ==================== REMOVE FROM CART ====================
  async removeFromCart(userId: string, bookId: string) {
    const cartItem = await this.cartItemRepository.findOne({
      where: { bookId, cart: { userId } },
      relations: ['cart'],
    });

    if (!cartItem) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    await this.cartItemRepository.remove(cartItem);

    // Invalidate cache
    await this.invalidateCartCache(userId);

    return {
      message: 'Đã xóa khỏi giỏ hàng',
      data: await this.getCart(userId),
    };
  }

  // ==================== GET CART ====================
  async getCart(userId: string) {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.book', 'items.book.store'],
    });

    if (!cart) {
      return this.getEmptyCart(userId);
    }

    // Filter out invalid items
    const validItems = [];
    for (const item of cart.items) {
      const book = await this.bookRepository.findOne({
        where: { id: item.bookId },
        relations: ['store'],
      });

      if (book && book.status === 'PUBLISHED') {
        // Update price if changed
        item.price = book.salePrice || book.price;
        validItems.push({
          id: item.id,
          bookId: item.bookId,
          bookTitle: book.title,
          bookImage: book.coverImage,
          storeId: book.storeId,
          storeName: book.store?.name || 'Unknown',
          price: book.price,
          salePrice: book.salePrice,
          quantity: item.quantity,
          format: book.format,
          stock: book.stock,
        });
      } else {
        // Remove invalid item
        await this.cartItemRepository.remove(item);
      }
    }

    // Group by store
    const storeGroups = this.groupByStore(validItems);

    // Calculate totals
    let totalItems = 0;
    let subtotal = 0;
    for (const group of storeGroups) {
      totalItems += group.items.reduce((sum, item) => sum + item.quantity, 0);
      subtotal += group.subtotal;
    }

    return {
      id: cart.id,
      userId,
      stores: storeGroups,
      totalItems,
      subtotal,
      estimatedShipping: this.estimateShipping(storeGroups),
    };
  }

  // ==================== CLEAR CART ====================
  async clearCart(userId: string) {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (cart && cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }

    // Invalidate cache
    await this.invalidateCartCache(userId);

    return {
      message: 'Đã xóa giỏ hàng',
      data: await this.getEmptyCart(userId),
    };
  }

  // ==================== MERGE GUEST CART ====================
  async mergeGuestCart(userId: string, guestCartItems: { bookId: string; quantity: number }[]) {
    for (const item of guestCartItems) {
      try {
        await this.addToCart(userId, {
          bookId: item.bookId,
          quantity: item.quantity,
        });
      } catch (error) {
        // Skip if can't add (e.g., out of stock)
        console.log(`Could not merge item ${item.bookId}: ${error.message}`);
      }
    }

    return this.getCart(userId);
  }

  // ==================== HELPER METHODS ====================
  private groupByStore(items: any[]) {
    const groups = new Map<string, any>();

    for (const item of items) {
      if (!groups.has(item.storeId)) {
        groups.set(item.storeId, {
          storeId: item.storeId,
          storeName: item.storeName,
          storeLogo: null,
          items: [],
          subtotal: 0,
        });
      }

      const group = groups.get(item.storeId);
      group.items.push(item);
      group.subtotal += item.price * item.quantity;
      group.subtotal = Math.round(group.subtotal);
    }

    return Array.from(groups.values());
  }

  private estimateShipping(storeGroups: any[]): number {
    // Mock shipping estimate: 15,000 VND per store
    const SHIPPING_PER_STORE = 15000;
    return storeGroups.length * SHIPPING_PER_STORE;
  }

  private async checkDigitalBookOwnership(userId: string, bookId: string): Promise<boolean> {
    // TODO: Check if user already purchased this digital book
    // This would check the book_accesses table or orders
    return false;
  }

  private async invalidateCartCache(userId: string): Promise<void> {
    await this.redisService.del(`cart:${userId}`);
  }

  private getEmptyCart(userId: string) {
    return {
      id: null,
      userId,
      stores: [],
      totalItems: 0,
      subtotal: 0,
      estimatedShipping: 0,
    };
  }
}
