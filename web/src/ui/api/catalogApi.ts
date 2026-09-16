import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  children?: CategoryData[];
}

export type BookFormat = 'PHYSICAL' | 'DIGITAL' | 'BOTH';
export type InventoryReason = 'MANUAL_ADJUSTMENT' | 'DAMAGED' | 'RETURNED' | 'CORRECTION';

export interface CatalogEntity {
  id: string;
  name: string;
  slug?: string;
  isbn?: string | null;
}

export interface PhysicalDetails {
  stock: number;
  reserved?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  physicalEnabled?: boolean;
}

export interface DigitalDetails {
  digitalEnabled?: boolean;
  allowOnlineRead?: boolean;
  allowDownload?: boolean;
  drmEnabled?: boolean;
}

export interface BookData {
  id: string;
  title: string;
  slug?: string;
  author?: CatalogEntity | null;
  publisher?: CatalogEntity | null;
  description?: string;
  coverImage?: string;
  coverUrl?: string;
  cover?: string;
  price?: number;
  originalPrice?: number;
  format?: BookFormat;
  physicalDetails?: PhysicalDetails | null;
  digitalDetails?: DigitalDetails | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED' | 'SUSPENDED';
  storeId?: string;
  businessId?: string;
  category?: CategoryData | null;
  createdAt?: string;
}

export interface CreateBookPayload {
  title: string;
  /** Business is the storefront. `storeId` is retained only for legacy API compatibility. */
  businessId?: string;
  storeId?: string;
  slug?: string;
  isbn?: string;
  description?: string;
  price?: number;
  format?: BookFormat;
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  coverUrl?: string;
  physicalDetails?: PhysicalDetails;
  digitalDetails?: DigitalDetails;
}

function isUuid(val: unknown): boolean {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

function sanitizeBookPayload<T extends Partial<CreateBookPayload>>(payload: T): T {
  const clean: any = { ...payload };
  if ('categoryId' in clean && !isUuid(clean.categoryId)) delete clean.categoryId;
  if ('authorId' in clean && !isUuid(clean.authorId)) delete clean.authorId;
  if ('publisherId' in clean && !isUuid(clean.publisherId)) delete clean.publisherId;
  if ('businessId' in clean && !isUuid(clean.businessId)) delete clean.businessId;
  if ('storeId' in clean && !isUuid(clean.storeId)) delete clean.storeId;
  return clean;
}

export const catalogApi = {
  /**
   * Lấy danh sách sách Public (cho Guest/Storefront)
   */
  async getPublicBooks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    q?: string;
    category?: string;
    categoryId?: string;
    business?: string;
    store?: string;
    format?: BookFormat;
    sortBy?: 'createdAt' | 'publishedAt' | 'price' | 'title';
    order?: 'ASC' | 'DESC';
  }): Promise<ApiResponse<BookData[]>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const searchQuery = params?.q || params?.search;
    if (searchQuery) query.set('search', searchQuery);
    const cat = params?.categoryId || params?.category;
    if (cat) query.set('category', cat);
    if (params?.business) query.set('business', params.business);
    if (params?.store) query.set('store', params.store);
    if (params?.format) query.set('format', params.format);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.order) query.set('order', params.order);

    const url = `/books${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<BookData[]>(url, { method: 'GET', skipAuth: true });
  },

  /**
   * Lấy chi tiết sách theo ID
   */
  async getBookById(id: string): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>(`/books/${id}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  /**
   * Alias: Lấy chi tiết sách Public theo ID
   */
  async getPublicBookById(id: string): Promise<ApiResponse<BookData>> {
    return this.getBookById(id);
  },

  /**
   * Lấy chi tiết sách theo Slug
   */
  async getBookBySlug(slug: string): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>(`/books/slug/${slug}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  /**
   * Lấy danh mục sách
   */
  async getCategories(): Promise<ApiResponse<CategoryData[]>> {
    return apiClient<CategoryData[]>('/categories/tree', {
      method: 'GET',
      skipAuth: true,
    });
  },

  /**
   * Tạo danh mục sách mới
   */
  async createCategory(payload: { name: string; description?: string; parentId?: string | null }): Promise<ApiResponse<CategoryData>> {
    return apiClient<CategoryData>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Tạo tác giả mới
   */
  async createAuthor(payload: { name: string; bio?: string; avatarUrl?: string }): Promise<ApiResponse<CatalogEntity>> {
    return apiClient<CatalogEntity>('/authors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Tạo tác phẩm mới (Dành cho Owner)
   */
  async createBook(payload: CreateBookPayload): Promise<ApiResponse<BookData>> {
    const cleanPayload = sanitizeBookPayload(payload);
    return apiClient<BookData>('/books', {
      method: 'POST',
      body: JSON.stringify(cleanPayload),
    });
  },

  /**
   * Phát hành sách (Publish book)
   */
  async publishBook(id: string): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>(`/books/${id}/publish`, {
      method: 'POST',
    });
  },

  async getAuthors(): Promise<ApiResponse<CatalogEntity[]>> {
    return apiClient<CatalogEntity[]>('/authors?limit=100', { method: 'GET', skipAuth: true });
  },

  async getPublishers(): Promise<ApiResponse<CatalogEntity[]>> {
    return apiClient<CatalogEntity[]>('/publishers?limit=100', { method: 'GET', skipAuth: true });
  },

  async getSellerBooks(params?: {
    page?: number;
    limit?: number;
    business?: string;
    format?: BookFormat;
  }): Promise<ApiResponse<BookData[]>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.business) query.set('business', params.business);
    if (params?.format) query.set('format', params.format);
    return apiClient<BookData[]>(`/books/owned${query.toString() ? `?${query.toString()}` : ''}`, {
      method: 'GET',
    });
  },

  /** Temporarily remove a published book from the public catalog. */
  async hideBook(id: string): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>(`/books/${id}/hide`, {
      method: 'POST',
    });
  },

  async uploadBookFile(id: string, file: File): Promise<ApiResponse<DigitalDetails>> {
    const body = new FormData();
    body.append('file', file);
    return apiClient<DigitalDetails>(`/books/${id}/file`, {
      method: 'POST',
      body,
    });
  },

  /**
   * Cập nhật thông tin sách
   */
  async updateBook(id: string, payload: Partial<CreateBookPayload>): Promise<ApiResponse<BookData>> {
    const cleanPayload = sanitizeBookPayload(payload);
    return apiClient<BookData>(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(cleanPayload),
    });
  },

  async getInventory(id: string): Promise<ApiResponse<any>> {
    return apiClient<any>(`/books/${id}/inventory`, {
      method: 'GET',
    });
  },

  async updateInventory(
    id: string,
    payload:
      | number
      | {
          operation: 'SET' | 'ADD' | 'SUBTRACT';
          quantity: number;
          reason?: string;
          note?: string;
        },
    reason: InventoryReason = 'MANUAL_ADJUSTMENT',
  ): Promise<ApiResponse<PhysicalDetails>> {
    const body =
      typeof payload === 'number'
        ? { operation: 'SET', quantity: payload, reason }
        : {
            operation: payload.operation,
            quantity: payload.quantity,
            reason: payload.reason || reason,
            note: payload.note,
          };
    return apiClient<PhysicalDetails>(`/books/${id}/inventory`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async getInventoryLogs(
    id: string,
    params?: { page?: number; limit?: number },
  ): Promise<ApiResponse<any>> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    return apiClient<any>(`/books/${id}/inventory-logs${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },
};

export function toCatalogBook(book: BookData) {
  const format = book.format || 'DIGITAL';
  const physical = format === 'PHYSICAL' || format === 'BOTH';
  const digital = format === 'DIGITAL' || format === 'BOTH';
  const stock = (book as any).stock ?? book.physicalDetails?.stock ?? 0;
  const reserved = (book as any).reserved ?? book.physicalDetails?.reserved ?? 0;
  const available =
    (book as any).available !== undefined
      ? (book as any).available
      : Math.max(0, stock - reserved);

  const publisherName =
    book.publisher?.name ||
    (typeof (book as any).publisher === 'string' ? (book as any).publisher : null) ||
    (book as any).business?.name ||
    (book as any).business?.displayName ||
    (book as any).store?.name ||
    'Gian Hàng HUKI';

  const storeId =
    book.storeId ||
    (book as any).businessId ||
    (book as any).store?.id ||
    'huki-official';

  return {
    id: book.id,
    slug: book.slug || book.id,
    title: book.title,
    author: book.author?.name || (typeof (book as any).author === 'string' ? (book as any).author : 'Chưa cập nhật tác giả'),
    publisher: publisherName,
    storeId,
    businessId: storeId,
    category: book.category?.slug || book.category?.id || 'khac',
    categoryName: book.category?.name || 'Khác',
    format: format === 'DIGITAL' ? 'Ebook' : format === 'PHYSICAL' ? 'Sách giấy' : 'Combo',
    formatType: digital && physical ? 'hybrid' : digital ? 'ebook' : 'physical',
    price: Number(book.price || 0),
    originalPrice: Number(book.price || 0),
    rating: 0,
    sales: '0',
    cover: book.coverUrl || (book as any).coverImage || (book as any).cover || '/banners/hero-library.jpg',
    stock,
    reserved,
    available,
    status: book.status,
    description: book.description || '',
  };
}

