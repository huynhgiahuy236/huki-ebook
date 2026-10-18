import { apiClient } from '../api/apiClient';
import type { ApiResponse } from '../api/types';

export interface QuickReply {
  id?: string;
  _id?: string;
  storeId: string;
  shortcut: string; // mã tắt vd: chao, ship, voucher (không dấu)
  title: string;    // tiêu đề ngắn
  content: string;  // nội dung tin nhắn đầy đủ
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const chatQuickReplyService = {
  /**
   * Lấy danh sách tin nhắn nhanh của shop (được cache qua Redis < 2ms)
   */
  async list(storeId: string): Promise<ApiResponse<QuickReply[]>> {
    const res = await apiClient<{ data: QuickReply[] }>(
      `/chat/quick-replies?storeId=${encodeURIComponent(storeId)}`
    );
    if (res.success && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray((res.data as any).data) ? (res.data as any).data : []);
      return {
        success: true,
        data: list,
      };
    }
    return {
      success: false,
      data: [],
      error: res.error,
    };
  },

  /**
   * Thêm mới một phím tắt tin nhắn nhanh (lưu vào DB và đồng bộ Redis)
   */
  async create(payload: {
    storeId: string;
    shortcut: string;
    title: string;
    content: string;
  }): Promise<ApiResponse<{ message: string; data: QuickReply }>> {
    return apiClient<{ message: string; data: QuickReply }>('/chat/quick-replies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Cập nhật tin nhắn nhanh
   */
  async update(
    id: string,
    storeId: string,
    payload: {
      shortcut?: string;
      title?: string;
      content?: string;
    }
  ): Promise<ApiResponse<{ message: string; data: QuickReply }>> {
    return apiClient<{ message: string; data: QuickReply }>(
      `/chat/quick-replies/${id}?storeId=${encodeURIComponent(storeId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Xóa tin nhắn nhanh
   */
  async delete(id: string, storeId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>(
      `/chat/quick-replies/${id}?storeId=${encodeURIComponent(storeId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  /**
   * Đánh dấu đã dùng để tăng lượt sử dụng (ưu tiên sắp xếp trên đầu)
   */
  async markUsed(id: string, storeId: string): Promise<void> {
    try {
      await apiClient(`/chat/quick-replies/${id}/use?storeId=${encodeURIComponent(storeId)}`, {
        method: 'PATCH',
      });
    } catch {
      // ignore
    }
  },
};
