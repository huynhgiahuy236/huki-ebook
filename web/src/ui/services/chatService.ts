import { apiClient } from '../api/apiClient';
import type { ApiResponse } from '../api/types';

export interface ChatParticipant {
  id: string;
  fullName?: string;
  name?: string;
  avatar?: string;
  logo?: string;
}

export interface ChatContext {
  type: 'BOOK' | 'ORDER';
  id: string;
}

export interface ChatLastMessage {
  id: string;
  content: string;
  senderType: 'USER' | 'BUSINESS';
  senderId: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  type: 'USER_TO_STORE';
  user: ChatParticipant | null;
  store: ChatParticipant | null;
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
  context: ChatContext;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: 'USER' | 'BUSINESS';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'ORDER' | 'BOOK' | 'SYSTEM' | 'VOUCHER';
  attachments?: Array<{
    type: 'IMAGE' | 'FILE';
    url: string;
    name?: string;
    thumbnail?: string;
    size?: number;
  }>;
  metadata?: Record<string, any>;
  status: 'SENT' | 'DELIVERED' | 'READ';
  readBy?: string[];
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export const chatService = {
  /**
   * Lấy danh sách hội thoại của người dùng hoặc của cửa hàng (nếu truyền storeId)
   */
  async listConversations(storeId?: string): Promise<ApiResponse<ChatConversation[]>> {
    const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    const res = await apiClient<{ data: ChatConversation[] }>(`/chat/conversations${query}`);
    if (res.success && res.data) {
      return {
        success: true,
        data: (res.data as any).data || res.data,
      };
    }
    return res as unknown as ApiResponse<ChatConversation[]>;
  },

  /**
   * Lấy chi tiết cuộc trò chuyện và tin nhắn
   */
  async getConversation(
    conversationId: string,
    options?: { page?: number; limit?: number; storeId?: string }
  ): Promise<ApiResponse<{ messages: ChatMessage[]; pagination: PaginationMeta } & ChatConversation>> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.storeId) params.set('storeId', options.storeId);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<{ data: any }>(`/chat/conversations/${conversationId}${query}`);
    if (res.success && res.data) {
      return {
        success: true,
        data: (res.data as any).data || res.data,
      };
    }
    return res as any;
  },

  /**
   * Lấy danh sách tin nhắn theo trang
   */
  async getMessages(
    conversationId: string,
    options?: { page?: number; limit?: number; storeId?: string }
  ): Promise<ApiResponse<ChatMessage[]>> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.storeId) params.set('storeId', options.storeId);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<any>(
      `/chat/conversations/${conversationId}/messages${query}`
    );
    if (res.success && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data.messages) ? res.data.messages : []));
      (list as any).data = list;
      return {
        success: true,
        data: list,
      };
    }
    const emptyList: ChatMessage[] = [];
    (emptyList as any).data = emptyList;
    return {
      success: false,
      data: emptyList,
      error: res.error,
    };
  },

  /**
   * Gửi tin nhắn qua REST API (fallback hoặc đính kèm tệp)
   */
  async sendMessage(
    conversationId: string,
    payload: {
      content: string;
      messageType?: string;
      storeId?: string;
      metadata?: Record<string, any>;
      attachments?: any[];
    }
  ): Promise<ApiResponse<{ message: string; data: ChatMessage }>> {
    return apiClient<{ message: string; data: ChatMessage }>(
      `/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Khởi tạo hoặc tìm hội thoại giữa User và Store
   */
  async createConversation(payload: {
    storeId: string;
    storeName?: string;
    contextType?: 'BOOK' | 'ORDER';
    contextId?: string;
    initialMessage?: string;
  }): Promise<ApiResponse<{ message: string; data: ChatConversation }>> {
    return apiClient<{ message: string; data: ChatConversation }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Đánh dấu cuộc trò chuyện đã đọc
   */
  async markRead(conversationId: string, storeId?: string): Promise<ApiResponse<{ message: string }>> {
    const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return apiClient<{ message: string }>(`/chat/conversations/${conversationId}/read${query}`, {
      method: 'PATCH',
    });
  },
};
