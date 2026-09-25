"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { orderApi } from '@/ui/api/orderApi';

interface ShipperRecord {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  licensePlate: string;
  zone: string;
  rating: number;
  totalDeliveries: number;
  codDebt: number;
  walletBalance: number;
  status: 'ACTIVE' | 'OFFLINE' | 'SUSPENDED' | 'PENDING_APPROVAL';
  joinDate: string;
}

interface RemittanceRecord {
  id: string;
  shipperName: string;
  shipperCode: string;
  licensePlate: string;
  phone?: string;
  amount: number;
  method: string;
  txCode: string;
  status: string;
  createdAt: string;
}

export default function AdminShippersView() {
  const [activeTab, setActiveTab] = useState<'FLEET' | 'REMITTANCES'>('FLEET');
  const [shippers, setShippers] = useState<ShipperRecord[]>([]);
  const [remittances, setRemittances] = useState<RemittanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OFFLINE' | 'SUSPENDED'>('ALL');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [shippersRes, remRes] = await Promise.all([
        orderApi.getAdminShippers(),
        orderApi.getShipperRemittances(),
      ]);

      if (shippersRes.success && Array.isArray(shippersRes.data)) {
        setShippers(shippersRes.data);
      } else if (Array.isArray((shippersRes as any)?.data?.data)) {
        setShippers((shippersRes as any).data.data);
      }

      if (remRes.success && Array.isArray(remRes.data)) {
        setRemittances(remRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin shippers & remittances:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredShippers = shippers.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.licensePlate.toLowerCase().includes(q) ||
        s.zone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCodDebt = shippers.reduce((acc, s) => acc + s.codDebt, 0);
  const totalShippers = shippers.length;
  const activeShippers = shippers.filter((s) => s.status === 'ACTIVE').length;
  const totalRemittedCod = remittances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const toggleStatus = (id: string) => {
    setShippers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE KPI SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shippers */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Tổng Đội Ngũ Bưu Tá</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-[#00875A] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[#003B2B]">{totalShippers} tài xế</div>
            <div className="text-xs text-gray-500 mt-0.5">Hoạt động khu vực Đồng Tháp &amp; lân cận</div>
          </div>
        </div>

        {/* Online Shippers */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Đang Trực Tuyến (Online)</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">cell_tower</span>
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-700">{activeShippers} tài xế</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Sẵn sàng tiếp nhận đơn sách</span>
            </div>
          </div>
        </div>

        {/* Total COD Debt */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Tổng Nợ COD Tạm Giữ</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${totalCodDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {totalCodDebt.toLocaleString('vi-VN')}đ
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {totalCodDebt === 0 ? 'Đã đối soát sạch toàn bộ ca trực' : 'Tiền thu hộ cần đối soát theo ca'}
            </div>
          </div>
        </div>

        {/* Total COD Remitted */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>COD Đã Nộp Về Quỹ Sàn</span>
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              +{totalRemittedCod.toLocaleString('vi-VN')}đ
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {remittances.length} lần đối soát VietQR / PayOS
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABS SELECTION */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('FLEET')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'FLEET'
              ? 'bg-[#003B2B] text-white shadow-2xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          <span>Danh Sách Đội Ngũ Bưu Tá ({shippers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REMITTANCES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'REMITTANCES'
              ? 'bg-[#003B2B] text-white shadow-2xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Nhật Ký Đối Soát Nộp COD Sàn ({remittances.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FLEET LIST */}
      {/* ========================================================================= */}
      {activeTab === 'FLEET' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm tên bưu tá, mã shipper, biển số, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#00875A] focus:bg-white transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['ALL', 'ACTIVE', 'OFFLINE', 'SUSPENDED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#003B2B] text-white'
                      : 'bg-[#F1F5F9] text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Tất cả'
                    : st === 'ACTIVE'
                    ? 'Đang Trực Tuyến'
                    : st === 'OFFLINE'
                    ? 'Ngoại Tuyến'
                    : 'Tạm Khóa'}
                </button>
              ))}
            </div>
          </div>

          {/* SHIPPERS DATA TABLE */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFA]">
              <h2 className="text-sm font-bold text-[#003B2B] uppercase tracking-wider">
                Danh Sách Tài Xế Giao Hàng ({filteredShippers.length})
              </h2>
              <span className="text-xs text-gray-500">Khu vực phân phối: Đồng Tháp</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-3.5">Mã &amp; Bưu tá</th>
                    <th className="p-3.5">Liên hệ &amp; Xe</th>
                    <th className="p-3.5">Khu vực hoạt động</th>
                    <th className="p-3.5">Đánh giá &amp; Đơn giao</th>
                    <th className="p-3.5">Nợ COD tạm giữ</th>
                    <th className="p-3.5">Ví thu nhập</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-5 h-5 rounded-full border-2 border-[#00875A] border-t-transparent animate-spin"></span>
                          <span>Đang tải dữ liệu đội ngũ bưu tá từ CSDL...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredShippers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        Không tìm thấy bưu tá nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredShippers.map((shipper) => (
                      <tr key={shipper.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{shipper.name}</div>
                          <div className="font-mono text-[11px] text-[#00875A]">{shipper.code}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-gray-800">{shipper.phone}</div>
                          <div className="text-[11px] text-gray-500">
                            Biển số: <strong className="text-gray-700">{shipper.licensePlate}</strong>
                          </div>
                        </td>
                        <td className="p-3.5 max-w-[200px]">
                          <div className="text-gray-700 truncate">{shipper.zone}</div>
                          <div className="text-[10px] text-gray-400">Tham gia: {shipper.joinDate}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 text-amber-600 font-bold">
                            ⭐ {shipper.rating}
                          </div>
                          <div className="text-[11px] text-gray-500">{shipper.totalDeliveries} đơn hoàn thành</div>
                        </td>
                        <td className="p-3.5">
                          {shipper.codDebt > 0 ? (
                            <span className="font-bold text-amber-700">
                              {shipper.codDebt.toLocaleString('vi-VN')}đ
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">0đ (Đã đối soát)</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-[#00875A]">
                            {shipper.walletBalance.toLocaleString('vi-VN')}đ
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              shipper.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : shipper.status === 'OFFLINE'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                shipper.status === 'ACTIVE'
                                ? 'bg-emerald-500 animate-pulse'
                                : shipper.status === 'OFFLINE'
                                ? 'bg-slate-400'
                                : 'bg-rose-500'
                              }`}
                            ></span>
                            {shipper.status === 'ACTIVE'
                              ? 'Trực tuyến'
                              : shipper.status === 'OFFLINE'
                              ? 'Ngoại tuyến'
                              : 'Tạm khóa'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => toggleStatus(shipper.id)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                              shipper.status === 'SUSPENDED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                            }`}
                          >
                            {shipper.status === 'SUSPENDED' ? 'Mở Khóa' : 'Tạm Khóa'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REMITTANCES LOG */}
      {/* ========================================================================= */}
      {activeTab === 'REMITTANCES' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFA]">
            <div>
              <h2 className="text-sm font-bold text-[#003B2B] uppercase tracking-wider">
                Nhật Ký Đối Soát Bưu Tá Nộp Tiền COD Về Quỹ Sàn (Từ PostgreSQL DB)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ghi nhận thời gian thực mọi lần bưu tá chuyển khoản nộp COD qua cổng VietQR / PayOS
              </p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-3.5">Mã Đối Soát (TxCode)</th>
                  <th className="p-3.5">Thời Gian Ghi Nhận</th>
                  <th className="p-3.5">Bưu Tá Nộp Tiền</th>
                  <th className="p-3.5">Phương Thức Thanh Toán</th>
                  <th className="p-3.5 text-right">Số Tiền Nộp Về Sàn</th>
                  <th className="p-3.5 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 rounded-full border-2 border-[#00875A] border-t-transparent animate-spin"></span>
                        <span>Đang tải nhật ký nộp COD từ cơ sở dữ liệu...</span>
                      </div>
                    </td>
                  </tr>
                ) : remittances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Chưa có giao dịch nộp COD nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  remittances.map((rem) => (
                    <tr key={rem.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-emerald-800">{rem.txCode}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{rem.id}</div>
                      </td>
                      <td className="p-3.5 font-mono text-gray-600">
                        {new Date(rem.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900">{rem.shipperName || 'Nguyễn Văn Hưng'}</div>
                        <div className="text-[11px] text-gray-500">
                          Mã: <strong className="font-mono text-emerald-700">{rem.shipperCode || 'SHIPPER-8899'}</strong> • Biển số: {rem.licensePlate || '66-F1 987.65'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <span className="material-symbols-outlined text-[12px]">qr_code_2</span>
                          <span>{rem.method}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        <strong className="text-sm font-black text-emerald-700">
                          +{rem.amount.toLocaleString('vi-VN')}đ
                        </strong>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>Đã nộp về Quỹ Sàn</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
