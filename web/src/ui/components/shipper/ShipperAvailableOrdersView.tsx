"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useShipper, ShipperOrder } from '@/ui/context/ShipperContext';
import {
  DataTableFilterBar,
  DataTableBulkActionBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '../common';
import GroupedDataTable, { Column, StandardPaginationBar } from '../common/GroupedDataTable';

type GroupByMode = 'SHOP' | 'ZONE' | 'PAYMENT' | 'NONE';

export default function ShipperAvailableOrdersView() {
  const { isOnline, setIsOnline, availableOrders, acceptOrder, refreshOrders, isLoading } = useShipper();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'COD' | 'PREPAID'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByMode>('SHOP');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Double-Lock: strictly 10 items / page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 1. Filter orders
  const filteredOrders = useMemo(() => {
    return availableOrders.filter((order) => {
      if (filterType === 'COD' && order.paymentMethod !== 'COD') return false;
      if (filterType === 'PREPAID' && order.paymentMethod !== 'ONLINE_PAYMENT') return false;
      if (!matchesDateFilter(order.createdAt, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = order.code.toLowerCase().includes(q);
        const matchShop = order.shopName.toLowerCase().includes(q);
        const matchCustomer = order.customerName.toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || '').includes(q);
        const matchAddr = order.deliveryAddress.toLowerCase().includes(q);
        const matchWard = (order.deliveryWard || '').toLowerCase().includes(q);
        return matchCode || matchShop || matchCustomer || matchPhone || matchAddr || matchWard;
      }
      return true;
    });
  }, [availableOrders, filterType, searchQuery, dateFilter]);

  // 2. Group orders
  const groupedRows = useMemo(() => {
    if (groupBy === 'NONE') {
      return filteredOrders.map((o) => ({ ...o, isGroupHeader: false }));
    }

    const groupMap: Record<string, { key: string; title: string; subtitle: string; icon: string; orders: ShipperOrder[] }> = {};

    filteredOrders.forEach((order) => {
      let groupKey = '';
      let title = '';
      let subtitle = '';
      let icon = 'storefront';

      if (groupBy === 'SHOP') {
        groupKey = order.shopName;
        title = order.shopName;
        subtitle = `${order.shopAddress} • Hotline: ${order.shopPhone}`;
        icon = 'storefront';
      } else if (groupBy === 'ZONE') {
        groupKey = `${order.deliveryWard || 'Khu vực'}, ${order.deliveryDistrict || 'Đồng Tháp'}`;
        title = groupKey;
        subtitle = `Địa bàn giao hàng tại ${order.deliveryProvince || 'Đồng Tháp'}`;
        icon = 'location_on';
      } else if (groupBy === 'PAYMENT') {
        groupKey = order.paymentMethod;
        title = order.paymentMethod === 'COD' ? 'Đơn Thu Hộ Tiền Mặt (COD)' : 'Đơn Đã Thanh Toán Online';
        subtitle =
          order.paymentMethod === 'COD'
            ? 'Bưu tá thu tiền mặt khi giao sách cho khách'
            : 'Khách đã thanh toán qua thẻ/ví, chỉ giao nhận sách';
        icon = order.paymentMethod === 'COD' ? 'payments' : 'credit_card';
      }

      if (!groupMap[groupKey]) {
        groupMap[groupKey] = {
          key: groupKey,
          title,
          subtitle,
          icon,
          orders: [],
        };
      }
      groupMap[groupKey].orders.push(order);
    });

    const result: any[] = [];
    Object.values(groupMap).forEach((grp) => {
      const groupEarning = grp.orders.reduce((sum, o) => sum + o.shippingFee, 0);
      const groupCod = grp.orders.reduce((sum, o) => sum + o.codAmount, 0);

      result.push({
        id: `group-${grp.key}`,
        isGroupHeader: true,
        groupKey: grp.key,
        title: grp.title,
        subtitle: grp.subtitle,
        icon: grp.icon,
        ordersCount: grp.orders.length,
        groupEarning,
        groupCod,
        children: grp.orders,
      });
    });

    return result;
  }, [filteredOrders, groupBy]);

  // Phân trang Double-Lock (10 items / page)
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (groupBy === 'NONE' ? filteredOrders : groupedRows).slice(start, start + pageSize);
  }, [filteredOrders, groupedRows, groupBy, currentPage, pageSize]);

  // Selected orders for Bulk Action
  const selectedOrderList = useMemo(() => {
    return filteredOrders.filter((o) => selectedIds[o.id]);
  }, [filteredOrders, selectedIds]);

  const selectedCount = Object.keys(selectedIds).filter((id) => selectedIds[id]).length;

  const handleBulkAccept = async () => {
    if (selectedOrderList.length === 0) return;
    setBulkLoading(true);
    try {
      for (const ord of selectedOrderList) {
        await acceptOrder(ord.id);
      }
      setSelectedIds({});
    } finally {
      setBulkLoading(false);
    }
  };

  const shipperBulkGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        groupLabel: 'Nhận việc & Điều phối tuyến',
        actions: [
          {
            value: 'BATCH_ACCEPT',
            label: `Nhận ${selectedCount} đơn đã chọn vào tuyến giao`,
            confirmTitle: 'Xác nhận nhận đơn hàng loạt',
            confirmMessage: `Bạn có chắc chắn muốn nhận ${selectedCount} đơn hàng này và bắt đầu di chuyển tới lấy sách?`,
          },
        ],
      },
    ],
    [selectedCount]
  );

  const handleExecuteBulkAction = async (action: string) => {
    if (action === 'BATCH_ACCEPT') {
      await handleBulkAccept();
    }
  };

  // 5 CỘT VÀNG CHUẨN MỰC
  const columns: Column<any>[] = [
    {
      key: 'code',
      title: 'Mã Đơn & Hàng Hóa',
      width: '24%',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="flex items-center gap-2.5 py-1">
              <span className="w-8 h-8 rounded-xl bg-[#003B2B]/10 text-[#003B2B] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
              </span>
              <div>
                <strong className="text-sm font-black text-[#003B2B] block">{row.title}</strong>
                <span className="text-[11px] text-slate-500 font-normal">{row.subtitle}</span>
              </div>
            </div>
          );
        }

        const isCod = row.paymentMethod === 'COD';
        return (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="font-mono text-xs font-bold text-slate-900">{row.code}</strong>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isCod ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isCod ? 'Thu COD' : 'Đã TT Online'}
              </span>
            </div>
            <div className="text-[11.5px] text-slate-600 break-words line-clamp-2 leading-snug">
              {row.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(', ') || '1 kiện sách'}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>{(row.totalWeight || 500) / 1000}kg</span>
              <span>&bull;</span>
              <span>{row.distanceKm || 3.2} km</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'shop',
      title: 'Điểm Lấy Hàng (Shop)',
      width: '24%',
      render: (_, row) => {
        if (row.isGroupHeader) return null;
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.shopAddress)}`;
        return (
          <div className="text-xs space-y-1 py-1">
            <div className="font-bold text-slate-800 break-words line-clamp-2 leading-snug" title={row.shopName}>
              {row.shopName}
            </div>
            <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug" title={row.shopAddress}>
              {row.shopAddress}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <a
                href={`tel:${row.shopPhone}`}
                className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">call</span>
                <span>{row.shopPhone}</span>
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">navigation</span>
                <span>Chỉ đường</span>
              </a>
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      title: 'Điểm Giao Hàng (Khách)',
      width: '24%',
      render: (_, row) => {
        if (row.isGroupHeader) return null;
        const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`;
        return (
          <div className="text-xs space-y-1 py-1">
            <div className="font-bold text-slate-800 break-words line-clamp-2 leading-snug" title={row.customerName}>
              {row.customerName}
            </div>
            <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug" title={fullAddr}>
              {row.deliveryAddress}, {row.deliveryWard}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <a
                href={`tel:${row.customerPhone}`}
                className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">call</span>
                <span>{row.customerPhone}</span>
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">navigation</span>
                <span>Chỉ đường</span>
              </a>
            </div>
          </div>
        );
      },
    },
    {
      key: 'finance',
      title: 'Tiền Công & COD',
      width: '14%',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="text-xs text-right space-y-0.5 py-1">
              <div className="text-[#00875A] font-bold">
                +{row.groupEarning?.toLocaleString('vi-VN')}đ
              </div>
              <div className="text-[11px] text-amber-700 font-medium">
                COD: {row.groupCod?.toLocaleString('vi-VN')}đ
              </div>
            </div>
          );
        }

        const isCod = row.paymentMethod === 'COD';
        return (
          <div className="text-xs space-y-0.5 py-1">
            <div className="text-[#00875A] font-bold">
              +{row.shippingFee?.toLocaleString('vi-VN')}đ
            </div>
            <div className={`text-[11px] font-medium ${isCod ? 'text-amber-700' : 'text-slate-400'}`}>
              {isCod ? `COD: ${row.codAmount?.toLocaleString('vi-VN')}đ` : '0đ COD (Đã trả online)'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: 'Tác Vụ',
      width: '14%',
      align: 'right',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="text-right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  row.children?.forEach((child: ShipperOrder) => acceptOrder(child.id));
                }}
                className="px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">done_all</span>
                <span>Nhận Hết ({row.ordersCount})</span>
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end py-1">
            <button
              type="button"
              onClick={() => acceptOrder(row.id)}
              className="px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">electric_moped</span>
              <span>Nhận Đơn</span>
            </button>
          </div>
        );
      },
    },
  ];

  const totalEarningsAll = filteredOrders.reduce((sum, o) => sum + o.shippingFee, 0);
  const totalCodAll = filteredOrders.reduce((sum, o) => sum + o.codAmount, 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP METRICS & STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Đơn Chờ Sẵn Sàng</span>
            <div className="text-2xl font-black text-[#003B2B] mt-0.5">{availableOrders.length} đơn</div>
            <span className="text-xs text-gray-500">Đã đóng gói tại kho/shop</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">electric_moped</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tổng Cước Shipper Nhận</span>
            <div className="text-2xl font-black text-[#00875A] mt-0.5">
              +{totalEarningsAll.toLocaleString('vi-VN')}đ
            </div>
            <span className="text-xs text-gray-500">Cộng ngay vào ví khi giao xong</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tổng Thu Hộ COD</span>
            <div className="text-2xl font-black text-amber-700 mt-0.5">
              {totalCodAll.toLocaleString('vi-VN')}đ
            </div>
            <span className="text-xs text-gray-500">Tiền mặt thu từ người nhận</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">payments</span>
          </div>
        </div>
      </div>

      {/* 2. UNIVERSAL DATA TABLE FILTER BAR */}
      <DataTableFilterBar
        tabs={[
          { key: 'ALL', label: 'Tất cả đơn', count: availableOrders.length },
          { key: 'COD', label: 'Thu COD', count: availableOrders.filter((o) => o.paymentMethod === 'COD').length },
          { key: 'PREPAID', label: 'Đã trả Online', count: availableOrders.filter((o) => o.paymentMethod === 'ONLINE_PAYMENT').length },
        ]}
        activeTab={filterType}
        onTabChange={(tab) => {
          setFilterType(tab as any);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(df) => {
          setDateFilter(df);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm mã đơn, tên shop, người nhận, địa chỉ..."
        bulkActionGroups={shipperBulkGroups}
        selectedCount={selectedCount}
        totalCount={filteredOrders.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds({})}
        bulkLoading={bulkLoading}
        itemName="đơn hàng"
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        leftCustomActions={
          <div className="flex items-center gap-1.5 bg-[#F1F5F9] dark:bg-neutral-800 p-1 rounded-xl border border-[#E2E8F0] dark:border-neutral-700 text-xs">
            <span className="text-[11px] font-bold text-gray-500 dark:text-neutral-400 px-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">workspaces</span>
              <span>Gom nhóm:</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setGroupBy('SHOP');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'SHOP'
                  ? 'bg-white text-[#003B2B] shadow-2xs border border-[#CBD5E1]'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Shop
            </button>

            <button
              type="button"
              onClick={() => {
                setGroupBy('ZONE');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'ZONE'
                  ? 'bg-white text-[#003B2B] shadow-2xs border border-[#CBD5E1]'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Khu Vực
            </button>

            <button
              type="button"
              onClick={() => {
                setGroupBy('PAYMENT');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'PAYMENT'
                  ? 'bg-white text-[#003B2B] shadow-2xs border border-[#CBD5E1]'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Tiền
            </button>

            <button
              type="button"
              onClick={() => {
                setGroupBy('NONE');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'NONE'
                  ? 'bg-white text-[#003B2B] shadow-2xs border border-[#CBD5E1]'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Phẳng
            </button>
          </div>
        }
        extraFilters={
          <button
            type="button"
            onClick={() => refreshOrders()}
            disabled={isLoading}
            className="h-9 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 font-semibold transition-all cursor-pointer text-xs"
            title="Làm mới từ CSDL thật"
          >
            <span className={`material-symbols-outlined text-[15px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>{isLoading ? 'Đang nạp...' : 'Làm mới'}</span>
          </button>
        }
      />

      {/* 3. FLOATING BULK ACTION BAR */}
      <DataTableBulkActionBar
        selectedCount={selectedCount}
        totalCount={filteredOrders.length}
        onClearSelection={() => setSelectedIds({})}
        actionGroups={shipperBulkGroups}
        onExecuteAction={handleExecuteBulkAction}
        isLoading={bulkLoading}
        itemName="đơn hàng"
      />

      {/* 4. MAIN GROUPED DATA TABLE */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
        <GroupedDataTable
          columns={columns}
          data={pagedData}
          keyField="id"
          childrenField="children"
          expandable
          expandedRowRender={(row) => {
            if (row.isGroupHeader) return null;
            const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;
            const customerMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`;
            const shopMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.shopAddress)}`;
            const isCod = row.paymentMethod === 'COD';

            return (
              <div className="p-4 bg-slate-50 dark:bg-neutral-800/40 rounded-xl space-y-4 text-xs">
                {/* 3-CARD MASTER-DETAIL CONTAINER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  {/* Card 1: Tuyến Đường & Chỉ Đường */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2.5">
                    <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                      <span className="material-symbols-outlined text-[15px] text-[#00875A]">route</span>
                      <span>Lộ Trình Vận Chuyển ({row.distanceKm || 3.2} km)</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-700 uppercase block">1. Điểm lấy sách (Shop):</span>
                        <div className="font-bold text-slate-800">{row.shopName}</div>
                        <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">{row.shopAddress}</div>
                        <div className="flex items-center gap-3 pt-1">
                          <a href={`tel:${row.shopPhone}`} className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">call</span>
                            <span>{row.shopPhone}</span>
                          </a>
                          <a href={shopMapUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">navigation</span>
                            <span>Chỉ đường tới Shop</span>
                          </a>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">2. Điểm giao sách (Khách):</span>
                        <div className="font-bold text-slate-800">{row.customerName}</div>
                        <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">{fullAddr}</div>
                        <div className="flex items-center gap-3 pt-1">
                          <a href={`tel:${row.customerPhone}`} className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">call</span>
                            <span>{row.customerPhone}</span>
                          </a>
                          <a href={customerMapUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">navigation</span>
                            <span>Chỉ đường tới Khách</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Danh Mục Kiện Sách */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2.5">
                    <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[#00875A]">menu_book</span>
                        <span>Kiện Hàng ({row.items?.length || 0} tựa sách)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{(row.totalWeight || 500) / 1000} kg</span>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {row.items?.map((it: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/60 border border-slate-100 dark:border-neutral-700 flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {it.quantity}x
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white break-words line-clamp-2 leading-snug">
                              {it.title}
                            </div>
                            <div className="text-[10px] text-slate-400">Định dạng: {it.format || 'Bìa mềm'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Chi Tiết Dòng Tiền & Tác Vụ */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                        <span className="material-symbols-outlined text-[15px] text-amber-600">payments</span>
                        <span>Chi Tiết Tài Chính &amp; COD</span>
                      </div>

                      <div className="space-y-2 pt-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tiền công bưu tá:</span>
                          <strong className="text-[#00875A] font-bold text-sm">
                            +{row.shippingFee?.toLocaleString('vi-VN')}đ
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Hình thức thanh toán:</span>
                          <span className="font-semibold text-slate-800">
                            {isCod ? 'Thu hộ tiền mặt (COD)' : 'Đã trả trước Online'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tiền thu khách:</span>
                          <strong className="text-amber-700 font-bold">
                            {isCod ? `${row.codAmount?.toLocaleString('vi-VN')}đ` : '0đ'}
                          </strong>
                        </div>
                        {isCod && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-500 text-[11px]">Nộp sàn (đã trừ ship):</span>
                            <strong className="text-slate-800 font-bold">
                              {row.netCodDebt?.toLocaleString('vi-VN')}đ
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => acceptOrder(row.id)}
                        className="w-full py-2 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">electric_moped</span>
                        <span>Tiếp Nhận Đơn Này Ngay</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
          pagination={false}
          selectable={groupBy === 'NONE'}
          selectedRowKeys={Object.keys(selectedIds).filter((k) => selectedIds[k])}
          onSelectionChange={(keys) => {
            const next: Record<string, boolean> = {};
            keys.forEach((k) => {
              next[String(k)] = true;
            });
            setSelectedIds(next);
          }}
          emptyTitle="Hiện chưa có đơn hàng nào chờ nhận trong khu vực!"
          emptyMessage="Các đơn sách mới từ các Shop sẽ tự động xuất hiện trên sàn điều phối tức thì."
        />

        {/* 5. STANDARD PAGINATION BAR (DOUBLE-LOCK: 10 ITEMS/PAGE) */}
        <StandardPaginationBar
          currentPage={currentPage}
          totalItems={groupBy === 'NONE' ? filteredOrders.length : groupedRows.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          itemLabel={groupBy === 'NONE' ? 'đơn hàng' : 'nhóm đơn'}
        />
      </div>
    </div>
  );
}
