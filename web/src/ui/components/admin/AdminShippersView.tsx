"use client";

import React, { useState } from 'react';
import Link from 'next/link';

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

const MOCK_SHIPPERS: ShipperRecord[] = [
  {
    id: 'SHP-001',
    code: 'SHIPPER-8899',
    name: 'Nguyễn Văn Hưng',
    phone: '0988 776 655',
    email: 'shipper.hung@huki.vn',
    vehicleType: 'Xe máy Honda Wave Alpha 110cc',
    licensePlate: '66-F1 987.65',
    zone: 'Đồng Tháp (Cao Lãnh & Sa Đéc)',
    rating: 4.95,
    totalDeliveries: 148,
    codDebt: 120000,
    walletBalance: 450000,
    status: 'ACTIVE',
    joinDate: '15/01/2026',
  },
  {
    id: 'SHP-002',
    code: 'SHIPPER-8890',
    name: 'Trần Hoàng Nam',
    phone: '0909 332 114',
    email: 'nam.tran@huki.vn',
    vehicleType: 'Xe máy Yamaha Sirius',
    licensePlate: '66-B1 456.78',
    zone: 'Đồng Tháp (TP. Cao Lãnh)',
    rating: 4.88,
    totalDeliveries: 92,
    codDebt: 340000,
    walletBalance: 210000,
    status: 'ACTIVE',
    joinDate: '20/01/2026',
  },
  {
    id: 'SHP-003',
    code: 'SHIPPER-8891',
    name: 'Võ Quốc Bảo',
    phone: '0918 554 433',
    email: 'bao.vo@huki.vn',
    vehicleType: 'Xe máy Honda Future 125',
    licensePlate: '66-S1 223.34',
    zone: 'Đồng Tháp (TP. Sa Đéc)',
    rating: 4.92,
    totalDeliveries: 120,
    codDebt: 0,
    walletBalance: 680000,
    status: 'OFFLINE',
    joinDate: '02/02/2026',
  },
  {
    id: 'SHP-004',
    code: 'SHIPPER-8892',
    name: 'Đặng Minh Trí',
    phone: '0977 889 900',
    email: 'tri.dang@huki.vn',
    vehicleType: 'Xe máy Honda Vision',
    licensePlate: '66-K1 889.12',
    zone: 'Đồng Tháp (Huyện Lấp Vò)',
    rating: 4.70,
    totalDeliveries: 45,
    codDebt: 850000,
    walletBalance: 120000,
    status: 'ACTIVE',
    joinDate: '10/02/2026',
  },
];

export default function AdminShippersView() {
  const [shippers, setShippers] = useState<ShipperRecord[]>(MOCK_SHIPPERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OFFLINE' | 'SUSPENDED'>('ALL');
  const [selectedShipper, setSelectedShipper] = useState<ShipperRecord | null>(null);

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
      {/* 1. TOP METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Tổng Đội Ngũ Bưu Tá</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-[#00875A] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#003B2B]">{totalShippers} tài xế</div>
          <div className="mt-2 text-xs text-gray-400">Hoạt động khu vực Đồng Tháp & lân cận</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Đang Trực Tuyến (Online)</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">electric_moped</span>
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">{activeShippers} tài xế</div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold">● Sẵn sàng tiếp nhận đơn sách</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Tổng Nợ COD Tạm Giữ</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {totalCodDebt.toLocaleString('vi-VN')}đ
          </div>
          <div className="mt-2 text-xs text-gray-400">Tiền thu hộ cần đối soát theo ca</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Truy Cập Cổng Bưu Tá</span>
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </span>
          </div>
          <div className="mt-2">
            <Link
              href="/shipper"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
            >
              <span>Mở Shipper Portal</span>
              <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
            </Link>
          </div>
          <div className="mt-2 text-xs text-gray-400">Xem giao diện thực tế bưu tá</div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
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

      {/* 3. SHIPPERS DATA TABLE */}
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
                <th className="p-3.5">Mã & Bưu tá</th>
                <th className="p-3.5">Liên hệ & Xe</th>
                <th className="p-3.5">Khu vực hoạt động</th>
                <th className="p-3.5">Đánh giá & Đơn giao</th>
                <th className="p-3.5">Nợ COD tạm giữ</th>
                <th className="p-3.5">Ví thu nhập</th>
                <th className="p-3.5">Trạng thái</th>
                <th className="p-3.5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredShippers.map((shipper) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
