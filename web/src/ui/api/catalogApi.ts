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
   * Tạo tác phẩm mới (Dành cho Owner)
   */
  async createBook(payload: CreateBookPayload): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>('/books', {
      method: 'POST',
      body: JSON.stringify(payload),
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

  /**
   * Cập nhật thông tin sách
   */
  async updateBook(id: string, payload: Partial<CreateBookPayload>): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateInventory(id: string, quantity: number): Promise<ApiResponse<PhysicalDetails>> {
    return apiClient<PhysicalDetails>(`/books/${id}/inventory`, {
      method: 'PATCH',
      body: JSON.stringify({ operation: 'SET', quantity, reason: 'MANUAL_ADJUSTMENT' }),
    });
  },
};

export function toCatalogBook(book: BookData) {
  const format = book.format || 'DIGITAL';
  const physical = format === 'PHYSICAL' || format === 'BOTH';
  const digital = format === 'DIGITAL' || format === 'BOTH';
  return {
    id: book.id,
    slug: book.slug || book.id,
    title: book.title,
    author: book.author?.name || 'Chưa cập nhật tác giả',
    publisher: book.publisher?.name || 'HUKI EBOOK',
    category: book.category?.slug || book.category?.id || 'khac',
    categoryName: book.category?.name || 'Khác',
    format: format === 'DIGITAL' ? 'Ebook' : format === 'PHYSICAL' ? 'Sách giấy' : 'Combo',
    formatType: digital && physical ? 'hybrid' : digital ? 'ebook' : 'physical',
    price: Number(book.price || 0),
    originalPrice: Number(book.price || 0),
    rating: 0,
    sales: '0',
    cover: book.coverUrl || book.coverImage || book.cover || '/banners/hero-library.jpg',
    stock: book.physicalDetails?.stock ?? null,
    status: book.status,
    description: book.description || '',
    storeId: book.storeId,
  };
}
