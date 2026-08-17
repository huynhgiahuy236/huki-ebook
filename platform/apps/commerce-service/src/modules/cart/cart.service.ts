import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  Book,
  BookFormat,
  BookStatus,
  Cart,
  CartItem,
  CartItemFormat,
} from '../../entities';
import { AddCartItemDto } from './dto/add-cart-item.dto';

const CART_RELATIONS = {
  items: { book: { physicalDetails: true, digitalDetails: true } },
} as const;

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Book) private readonly bookRepository: Repository<Book>,
    private readonly dataSource: DataSource,
  ) {}

  async getCartEntity(userId: string, create = true): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: CART_RELATIONS,
    });
    if (!cart && create) {
      cart = await this.cartRepository.save(this.cartRepository.create({ userId }));
      cart.items = [];
    }
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getCartEntity(userId);
    const items = cart.items.map((item) => ({
      id: item.id,
      bookId: item.bookId,
      format: item.format,
      quantity: item.quantity,
      unitPrice: item.book.price,
      subtotal: item.book.price * item.quantity,
      book: {
        id: item.book.id,
        storeId: item.book.storeId,
        title: item.book.title,
        slug: item.book.slug,
        coverUrl: item.book.coverUrl,
        status: item.book.status,
      },
    }));
    return {
      id: cart.id,
      userId,
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
      updatedAt: cart.updatedAt,
    };
  }

  async add(userId: string, dto: AddCartItemDto) {
    await this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);
      const itemRepository = manager.getRepository(CartItem);
      let cart = await cartRepository.findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!cart) cart = await cartRepository.save(cartRepository.create({ userId }));
      const book = await manager.getRepository(Book).findOne({
        where: { id: dto.bookId, status: BookStatus.PUBLISHED },
        relations: { physicalDetails: true, digitalDetails: true },
      });
      if (!book) throw new NotFoundException('Published book not found');
      this.validateAvailability(book, dto.format, dto.quantity);

      const existing = await itemRepository.findOne({ where: { cartId: cart.id, bookId: dto.bookId, format: dto.format } });
      if (existing?.format === CartItemFormat.DIGITAL) throw new ConflictException('Digital book is already in the cart');
      const quantity = dto.format === CartItemFormat.DIGITAL ? 1 : (existing?.quantity ?? 0) + dto.quantity;
      this.validateAvailability(book, dto.format, quantity);
      await itemRepository.save(itemRepository.create({
        ...existing,
        cartId: cart.id,
        bookId: book.id,
        format: dto.format,
        quantity,
      }));
      await this.touch(cart, manager);
    });
    return this.getCart(userId);
  }

  async update(userId: string, itemId: string, quantity: number) {
    await this.dataSource.transaction(async (manager) => {
      const cart = await manager.getRepository(Cart).findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!cart) throw new NotFoundException('Cart not found');
      const item = await manager.getRepository(CartItem).findOne({ where: { id: itemId, cartId: cart.id }, relations: { book: { physicalDetails: true, digitalDetails: true } } });
      if (!item) throw new NotFoundException('Cart item not found');
      if (item.format === CartItemFormat.DIGITAL && quantity !== 1) throw new BadRequestException('Digital book quantity must be one');
      this.validateAvailability(item.book, item.format, quantity);
      item.quantity = quantity;
      await manager.save(item);
      await this.touch(cart, manager);
    });
    return this.getCart(userId);
  }

  async remove(userId: string, itemId: string) {
    await this.dataSource.transaction(async (manager) => {
      const cart = await manager.getRepository(Cart).findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!cart) throw new NotFoundException('Cart not found');
      const item = await manager.getRepository(CartItem).findOneBy({ id: itemId, cartId: cart.id });
      if (!item) throw new NotFoundException('Cart item not found');
      await manager.remove(item);
      await this.touch(cart, manager);
    });
    return this.getCart(userId);
  }

  async clear(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const cart = await manager.getRepository(Cart).findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!cart) return;
      await manager.getRepository(CartItem).delete({ cartId: cart.id });
      await this.touch(cart, manager);
    });
  }

  private validateAvailability(book: Book, format: CartItemFormat, quantity: number) {
    if (format === CartItemFormat.PHYSICAL) {
      if (![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format) || !book.physicalDetails?.physicalEnabled) {
        throw new BadRequestException('Physical format is unavailable');
      }
      if (book.physicalDetails.available < quantity) {
        throw new ConflictException('Insufficient stock');
      }
    } else if (
      ![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format) ||
      !book.digitalDetails?.digitalEnabled
    ) {
      throw new BadRequestException('Digital format is unavailable');
    }
  }

  private async touch(cart: Cart, manager?: EntityManager) {
    cart.updatedAt = new Date();
    await (manager ? manager.save(cart) : this.cartRepository.save(cart));
  }
}
