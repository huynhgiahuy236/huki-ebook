import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface UserAddress {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressPayload {
  name: string;
  phone: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  isDefault?: boolean;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export const addressApi = {
  getAddresses: async (): Promise<ApiResponse<UserAddress[]>> => {
    return apiClient<UserAddress[]>('/shipping/address', { method: 'GET' });
  },

  createAddress: async (payload: CreateAddressPayload): Promise<ApiResponse<UserAddress>> => {
    return apiClient<UserAddress>('/shipping/address', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAddress: async (id: string, payload: UpdateAddressPayload): Promise<ApiResponse<UserAddress>> => {
    return apiClient<UserAddress>(`/shipping/address/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteAddress: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>(`/shipping/address/${id}`, {
      method: 'DELETE',
    });
  },
};
