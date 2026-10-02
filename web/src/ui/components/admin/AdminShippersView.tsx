"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { orderApi } from '@/ui/api/orderApi';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import { AdminStatusBadge } from './AdminUI';

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
  const [currentPageFleet, setCurrentPageFleet] = useState(1);
  const [currentPageRemittance, setCurrentPageRemittance] = useState(1);
  const pageSize = 10;

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
      } else if (Array.isArray((remRes as any)?.data?.data)) {
        setRemittances((remRes as any).data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bưu tá:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const filteredShippers = useMemo(() => {
    return shippers.filter((s) => {
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchQuery =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [shippers, statusFilter, searchQuery]);

  // Aggregate stats
  const totalShippers = shippers.length;
  const activeShippers = shippers.filter((s) => s.status === 'ACTIVE').length;
  const totalCodDebt = shippers.reduce((sum, s) => sum + (s.codDebt || 0), 0);
  const totalRemitted = remittances.reduce((sum, r) => sum + (r.amount || 0), 0);

  const shipperColumns: Column<ShipperRecord>[] = useMemo(
    () => [
      {
        key: 'shipperInfo',
        title: 'Bưu Tá & Định Danh',
        sortable: true,
        render: (_val, shipper) => (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 shrink-0 overflow-hidden flex items-center justify-center font-bold text-[#003B2B] text-xs">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-gray-900 block truncate text-xs">
                {shipper.name}
              </span>
              <span className="font-mono text-[11px] text-[#00875A] font-bold block">
                {shipper.code}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'contactVehicle',
        title: 'Liên Hệ & Phương Tiện',
        render: (_val, shipper) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px] text-gray-400">call</span>
              <span className="font-mono font-semibold text-gray-800 text-xs">{shipper.phone}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <span className="material-symbols-outlined text-[13px] text-gray-400">two_wheeler</span>
              <span>{shipper.licensePlate}</span>
              <span className="text-gray-300">•</span>
              <span>{shipper.vehicleType}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'zonePerformance',
        title: 'Khu Vực & Đơn Giao',
        render: (_val, shipper) => (
          <div className="flex flex-col gap-0.5 max-w-[180px]">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-900 text-xs truncate" title={shipper.zone}>{shipper.zone}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="text-amber-600 font-bold flex items-center gap-0.5">
                ⭐ {shipper.rating}
              </span>
              <span>•</span>
              <span>{shipper.totalDeliveries} đơn</span>
            </div>
          </div>
        ),
      },
      {
        key: 'finance',
        title: 'Nợ COD & Thu Nhập',
        render: (_val, shipper) => (
          <div className="flex flex-col gap-0.5 font-mono">
            <div className="text-xs">
              <span className="text-gray-400 text-[10px]">Nợ COD: </span>
              {shipper.codDebt > 0 ? (
                <strong className="text-amber-700 font-bold">{shipper.codDebt.toLocaleString('vi-VN')}đ</strong>
              ) : (
                <span className="text-emerald-600 font-medium">0đ</span>
              )}
            </div>
            <div className="text-xs">
              <span className="text-gray-400 text-[10px]">Ví: </span>
              <strong className="text-[#00875A] font-bold">{shipper.walletBalance.toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>
        ),
      },
      {
        key: 'statusAction',
        title: 'Trạng Thái & Thao Tác',
        align: 'right',
        render: (_val, shipper) => (
          <div className="flex items-center justify-end gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
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
            <button
              type="button"
              onClick={() => toggleStatus(shipper.id)}
              className={`px-2 py-0.5 text-[10.5px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                shipper.status === 'SUSPENDED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
              }`}
            >
              {shipper.status === 'SUSPENDED' ? 'Mở Khóa' : 'Tạm Khóa'}
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const remittanceColumns: Column<RemittanceRecord>[] = useMemo(
    () => [
      {
        key: 'txInfo',
        title: 'Mã Đối Soát & Thời Gian',
        sortable: true,
        render: (_val, rem) => (
          <div className="flex flex-col gap-0.5 font-mono">
            <span className="font-bold text-emerald-800 text-xs">#{rem.txCode}</span>
            <span className="text-[10px] text-gray-400">
              {new Date(rem.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
        ),
      },
      {
        key: 'shipper',
        title: 'Bưu Tá Nộp Tiền',
        render: (_val, rem) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-gray-900 text-xs">{rem.shipperName || 'Nguyễn Văn Hưng'}</span>
            <span className="text-[11px] text-gray-500 font-mono">
              Mã: <strong className="text-emerald-700">{rem.shipperCode || 'SHIPPER-8899'}</strong> • {rem.licensePlate || '66-F1 987.65'}
            </span>
          </div>
        ),
      },
      {
        key: 'methodAmount',
        title: 'Phương Thức & Số Tiền',
        render: (_val, rem) => (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <span className="material-symbols-outlined text-[12px]">qr_code_2</span>
              <span>{rem.method}</span>
            </span>
            <strong className="text-sm font-black text-emerald-700 font-mono">
              +{(rem.amount || 0).toLocaleString('vi-VN')}đ
            </strong>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'right',
        render: () => (
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>Đã nộp về Quỹ Sàn</span>
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Quản Lý Đội Ngũ Bưu Tá (Shipper Fleet)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi trạng thái trực tuyến, nợ COD tạm giữ và nhật ký đối soát nộp tiền vào tài khoản ký quỹ sàn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[16px] text-gray-500 ${isLoading ? 'animate-spin text-[#00875A]' : ''}`}>
              refresh
            </span>
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Số Bưu Tá</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 font-mono">{totalShippers}</h3>
            <div className="text-xs text-emerald-700 font-medium mt-0.5">
              {activeShippers} đang trực tuyến
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">two_wheeler</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Đang Trực Tuyến</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 font-mono">{activeShippers}</h3>
            <div className="text-xs text-gray-400 mt-0.5">
              Sẵn sàng nhận cuốc giao 2h
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">sensors</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nợ COD Tạm Giữ</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-700 mt-1 font-mono">
              {totalCodDebt.toLocaleString('vi-VN')} đ
            </h3>
            <div className="text-xs text-amber-600 mt-0.5 font-medium">
              Cần bưu tá nộp về sàn
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Đã Nộp Quỹ Sàn</p>
            <h3 className="text-xl sm:text-2xl font-black text-[#00875A] mt-1 font-mono">
              {totalRemitted.toLocaleString('vi-VN')} đ
            </h3>
            <div className="text-xs text-gray-500 mt-0.5">
              {remittances.length} lần đối soát VietQR / PayOS
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#00875A]/10 text-[#00875A] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">verified</span>
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

      {/* TAB 1: FLEET LIST */}
      {activeTab === 'FLEET' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm tên bưu tá, mã shipper, biển số, SĐT..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPageFleet(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#00875A] focus:bg-white transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['ALL', 'ACTIVE', 'OFFLINE', 'SUSPENDED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPageFleet(1);
                  }}
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

          {/* GroupedDataTable for Fleet */}
          <GroupedDataTable<ShipperRecord>
            columns={shipperColumns}
            data={filteredShippers}
            keyField="id"
            loading={isLoading}
            expandable={true}
            expandedRowRender={(shipper) => (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 text-[11px] text-gray-600">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-xs text-gray-900">
                    <span className="material-symbols-outlined text-[16px] text-[#00875A]">person_pin</span>
                    <span>Hồ Sơ Tài Xế</span>
                  </div>
                  <div>Họ tên: <strong className="text-gray-900">{shipper.name}</strong></div>
                  <div>Mã bưu tá: <span className="font-mono font-bold text-emerald-700">{shipper.code}</span></div>
                  <div>Email: <span className="font-mono">{shipper.email}</span></div>
                  <div>Ngày gia nhập: <span>{shipper.joinDate}</span></div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 text-[11px] text-gray-600">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-xs text-gray-900">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">two_wheeler</span>
                    <span>Phương Tiện &amp; Phân Vùng</span>
                  </div>
                  <div>Biển kiểm soát: <strong className="text-gray-900">{shipper.licensePlate}</strong></div>
                  <div>Loại xe: <span>{shipper.vehicleType}</span></div>
                  <div>Khu vực phụ trách: <span>{shipper.zone}</span></div>
                  <div>Đơn giao thành công: <strong className="text-gray-900">{shipper.totalDeliveries} đơn</strong></div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 text-[11px] text-gray-600 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-xs text-gray-900">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">account_balance_wallet</span>
                      <span>Tài Khoản Ký Quỹ &amp; COD</span>
                    </div>
                    <div>Nợ COD đang giữ: <strong className="font-mono text-amber-700">{shipper.codDebt.toLocaleString('vi-VN')}đ</strong></div>
                    <div>Số dư ví khả dụng: <strong className="font-mono text-[#00875A]">{shipper.walletBalance.toLocaleString('vi-VN')}đ</strong></div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStatus(shipper.id)}
                      className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        shipper.status === 'SUSPENDED'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      {shipper.status === 'SUSPENDED' ? 'Mở Khóa Tài Khoản' : 'Khóa Tạm Thời'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            emptyTitle="Không Tìm Thấy Bưu Tá Nào"
            emptyMessage="Không tìm thấy bưu tá phù hợp với bộ lọc."
            pagination={{
              currentPage: currentPageFleet,
              totalPages: Math.ceil(filteredShippers.length / pageSize) || 1,
              totalItems: filteredShippers.length,
              pageSize,
              onPageChange: setCurrentPageFleet,
              itemLabel: 'bưu tá',
            }}
          />
        </div>
      )}

      {/* TAB 2: REMITTANCES LOG */}
      {activeTab === 'REMITTANCES' && (
        <div className="space-y-4">
          <GroupedDataTable<RemittanceRecord>
            columns={remittanceColumns}
            data={remittances}
            keyField="id"
            loading={isLoading}
            emptyTitle="Chưa Có Nhật Ký Đối Soát Nào"
            emptyMessage="Chưa có giao dịch nộp COD nào được ghi nhận."
            pagination={{
              currentPage: currentPageRemittance,
              totalPages: Math.ceil(remittances.length / pageSize) || 1,
              totalItems: remittances.length,
              pageSize,
              onPageChange: setCurrentPageRemittance,
              itemLabel: 'giao dịch đối soát',
            }}
          />
        </div>
      )}
    </div>
  );
}
