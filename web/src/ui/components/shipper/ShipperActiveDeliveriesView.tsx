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
import QuickDispatchNotificationModal from '../common/QuickDispatchNotificationModal';

type GroupByMode = 'SHOP' | 'STATUS' | 'ZONE' | 'NONE';

export default function ShipperActiveDeliveriesView() {
  const { activeDeliveries, confirmPickup, completeDelivery, failDelivery } = useShipper();

  // 1. Chỉ quản lý các đơn hàng giao thông thường (Đơn hoàn đã tách sang /shipper/returns)
  const forwardDeliveries = useMemo(() => {
    return activeDeliveries.filter((o) => o.orderType !== 'RETURN');
  }, [activeDeliveries]);

  // Bộ lọc
  const [activeTab, setActiveTab] = useState<'ALL' | 'PICKING_UP' | 'IN_TRANSIT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [groupBy, setGroupBy] = useState<GroupByMode>('SHOP');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Lựa chọn nhiều đơn (Bulk Action)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal báo giao thất bại
  const [selectedOrderToFail, setSelectedOrderToFail] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('Khách không nghe máy (đã gọi 3 lần)');

  // Modal phát thông báo nhanh
  const [dispatchModal, setDispatchModal] = useState<{
    open: boolean;
    targetRole: 'SELLER' | 'USER';
    targetId: string;
    targetName: string;
    orderCode: string;
    orderId?: string;
  }>({
    open: false,
    targetRole: 'USER',
    targetId: '',
    targetName: '',
    orderCode: '',
  });

  // Lọc danh sách đơn
  const filteredOrders = useMemo(() => {
    return forwardDeliveries.filter((order) => {
      // Tab filter
      if (activeTab === 'PICKING_UP' && order.status !== 'PICKING_UP') return false;
      if (activeTab === 'IN_TRANSIT' && order.status !== 'IN_TRANSIT') return false;

      // Date filter
      if (!matchesDateFilter(order.createdAt, dateFilter)) return false;

      // Search query
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
  }, [forwardDeliveries, activeTab, dateFilter, searchQuery]);

  // Gom nhóm dữ liệu theo GroupByMode
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
      } else if (groupBy === 'STATUS') {
        groupKey = order.status;
        title = order.status === 'PICKING_UP' ? 'Chờ Lấy Hàng Tại Kho Shop' : 'Đang Đi Giao Cho Khách Hàng';
        subtitle = order.status === 'PICKING_UP' ? 'Bưu tá cần di chuyển đến Shop để nhận kiện sách' : 'Kiện sách đã trên xe, cần giao tận tay người nhận';
        icon = order.status === 'PICKING_UP' ? 'inventory_2' : 'electric_moped';
      } else if (groupBy === 'ZONE') {
        groupKey = `${order.deliveryWard || 'Khu vực'}, ${order.deliveryDistrict || 'Đồng Tháp'}`;
        title = groupKey;
        subtitle = `Địa bàn giao hàng tại ${order.deliveryProvince || 'Đồng Tháp'}`;
        icon = 'location_on';
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

      // Parent row đại diện nhóm
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

  // Phân trang dữ liệu
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (groupBy === 'NONE' ? filteredOrders : groupedRows).slice(start, start + pageSize);
  }, [filteredOrders, groupedRows, groupBy, currentPage, pageSize]);

  // Bulk actions handlers
  const selectedOrderList = useMemo(() => {
    return filteredOrders.filter((o) => selectedIds[o.id]);
  }, [filteredOrders, selectedIds]);

  const handleBulkPickup = async () => {
    const pickingList = selectedOrderList.filter((o) => o.status === 'PICKING_UP');
    if (pickingList.length === 0) return;
    setBulkLoading(true);
    for (const ord of pickingList) {
      await confirmPickup(ord.id);
    }
    setSelectedIds({});
    setBulkLoading(false);
  };

  const handleBulkComplete = async () => {
    const transitList = selectedOrderList.filter((o) => o.status === 'IN_TRANSIT');
    if (transitList.length === 0) return;
    setBulkLoading(true);
    for (const ord of transitList) {
      await completeDelivery(ord.id);
    }
    setSelectedIds({});
    setBulkLoading(false);
  };

  const shipperBulkGroups: BulkActionGroup[] = [
    {
      groupLabel: 'Thao tác giao nhận',
      actions: [
        {
          value: 'BULK_PICKUP',
          label: 'Lấy hàng loạt từ Shop',
          confirmMessage: 'Xác nhận đã nhận hàng từ các Shop được chọn?',
        },
        {
          value: 'BULK_DELIVER',
          label: 'Giao thành công hàng loạt',
          confirmMessage: 'Đánh dấu giao thành công các đơn đang giao được chọn?',
        },
      ],
    },
  ];

  const handleExecuteAction = async (val: string) => {
    if (val === 'BULK_PICKUP') {
      await handleBulkPickup();
    } else if (val === 'BULK_DELIVER') {
      await handleBulkComplete();
    }
  };

  // Định nghĩa các cột cho GroupedDataTable
  const columns: Column<any>[] = [
    {
      key: 'code',
      title: 'Mã Đơn & Hàng Hóa',
      width: '26%',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="flex items-center gap-2 py-1">
              <span className="w-7 h-7 rounded-lg bg-[#003B2B]/10 text-[#003B2B] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[17px]">{row.icon}</span>
              </span>
              <div>
                <strong className="text-sm font-black text-[#003B2B] block">{row.title}</strong>
                <span className="text-[11px] text-slate-500 font-normal">{row.subtitle}</span>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-xs font-bold text-slate-900">{row.code}</strong>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Giao Sách
              </span>
            </div>
            <div className="text-[11.5px] text-slate-600 line-clamp-1">
              {row.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(', ')}
            </div>
            <span className="text-[10px] text-slate-400">
              Nhận ca: {row.acceptedAt || 'Vừa xong'} &bull; {row.distanceKm || 3}km &bull; {(row.totalWeight || 500) / 1000}kg
            </span>
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
            <div className="font-bold text-slate-800 truncate" title={row.shopName}>
              {row.shopName}
            </div>
            <div className="text-slate-500 text-[11px] line-clamp-1" title={row.shopAddress}>
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
        const customerMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`
        )}`;
        return (
          <div className="text-xs space-y-1 py-1">
            <div className="font-bold text-slate-800 truncate" title={row.customerName}>
              {row.customerName}
            </div>
            <div className="text-slate-500 text-[11px] line-clamp-1" title={row.deliveryAddress}>
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
                href={customerMapUrl}
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
      title: 'Cước & Thu Hộ',
      width: '13%',
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
              {isCod ? `COD: ${row.codAmount?.toLocaleString('vi-VN')}đ` : 'Đã TT Online'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng Thái & Thao Tác',
      width: '13%',
      align: 'right',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#003B2B] text-white">
                {row.ordersCount} đơn hàng
              </span>
            </div>
          );
        }

        const isPickingUp = row.status === 'PICKING_UP';
        const isInTransit = row.status === 'IN_TRANSIT';

        return (
          <div className="flex flex-col items-end gap-1.5 py-1">
            {isPickingUp ? (
              <button
                type="button"
                onClick={() => confirmPickup(row.id)}
                className="px-2.5 py-1 rounded-lg bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Bấm sau khi đã nhận kiện hàng từ Shop"
              >
                <span className="material-symbols-outlined text-[13px]">done</span>
                <span>Đã lấy hàng</span>
              </button>
            ) : isInTransit ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => completeDelivery(row.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#003B2B] hover:bg-emerald-900 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Giao thành công tận tay người nhận"
                >
                  <span className="material-symbols-outlined text-[13px]">task_alt</span>
                  <span>Giao xong</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderToFail(row.id)}
                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center cursor-pointer border border-rose-200"
                  title="Báo giao thất bại"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
            ) : null}

            {/* Quick Dispatch Notification Button */}
            <button
              type="button"
              onClick={() =>
                setDispatchModal({
                  open: true,
                  targetRole: isPickingUp ? 'SELLER' : 'USER',
                  targetId: isPickingUp ? row.shopName : row.customerPhone,
                  targetName: isPickingUp ? row.shopName : row.customerName,
                  orderCode: row.code,
                  orderId: row.id,
                })
              }
              className="text-[10.5px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
              title="Phát thông báo nhanh cho Shop hoặc Khách"
            >
              <span className="material-symbols-outlined text-[12px]">notifications_active</span>
              <span>Báo tin</span>
            </button>
          </div>
        );
      },
    },
  ];

  const pickingCount = forwardDeliveries.filter((o) => o.status === 'PICKING_UP').length;
  const transitCount = forwardDeliveries.filter((o) => o.status === 'IN_TRANSIT').length;
  const totalEarningsAll = forwardDeliveries.reduce((sum, o) => sum + o.shippingFee, 0);
  const totalCodAll = forwardDeliveries.reduce((sum, o) => sum + o.codAmount, 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--theme-border,#e8e5df)] pb-3.5">
        <div>
          <h1 className="font-editorial text-xl sm:text-2xl font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">route</span>
            </span>
            <span>Đơn Hàng Đang Thực Hiện ({forwardDeliveries.length})</span>
          </h1>
          <p className="text-xs text-[var(--theme-text-muted,#49454f)] mt-0.5">
            Lấy sách từ các Shop và vận chuyển giao tận tay người nhận trên toàn tuyến.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/shipper/returns"
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-900 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-purple-700">assignment_return</span>
            <span>Mục Thu Hồi &amp; Hoàn Hàng</span>
          </Link>

          <Link
            href="/shipper/available-orders"
            className="px-4 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nhận thêm đơn mới</span>
          </Link>
        </div>
      </div>

      {/* 2. Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đang nhận ca</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {forwardDeliveries.length} đơn
            </div>
            <span className="text-xs text-slate-500">Tổng đơn đang thực hiện</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">route</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Chờ lấy từ Shop</span>
            <div className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-0.5">
              {pickingCount} đơn
            </div>
            <span className="text-xs text-slate-500">Cần di chuyển đến Shop lấy</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-blue-200 dark:border-blue-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đang giao khách</span>
            <div className="text-2xl font-black text-blue-800 dark:text-blue-200 mt-0.5">
              {transitCount} đơn
            </div>
            <span className="text-xs text-slate-500">Đã nhận hàng, đang đi giao</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">electric_moped</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Tiền công dự kiến</span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">
              +{totalEarningsAll.toLocaleString('vi-VN')}đ
            </div>
            <span className="text-xs text-slate-500">Thu COD: {totalCodAll.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
          </div>
        </div>
      </div>

      {/* 3. Universal Filter Bar with Gom nhóm options */}
      <DataTableFilterBar
        tabs={[
          { key: 'ALL', label: 'Tất cả đơn', count: forwardDeliveries.length },
          { key: 'PICKING_UP', label: 'Chờ lấy tại Shop', count: pickingCount },
          { key: 'IN_TRANSIT', label: 'Đang đi giao', count: transitCount },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as any);
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
        searchPlaceholder="Tìm mã đơn, tên shop, người nhận, số điện thoại, địa chỉ..."
        bulkActionGroups={shipperBulkGroups}
        selectedCount={Object.keys(selectedIds).filter((k) => selectedIds[k]).length}
        totalCount={filteredOrders.length}
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                groupBy === 'SHOP'
                  ? 'bg-white dark:bg-neutral-900 text-[#00875A] shadow-xs'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupBy('STATUS');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                groupBy === 'STATUS'
                  ? 'bg-white dark:bg-neutral-900 text-[#00875A] shadow-xs'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Trạng thái
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupBy('ZONE');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                groupBy === 'ZONE'
                  ? 'bg-white dark:bg-neutral-900 text-[#00875A] shadow-xs'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Khu vực
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupBy('NONE');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                groupBy === 'NONE'
                  ? 'bg-white dark:bg-neutral-900 text-[#00875A] shadow-xs'
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900'
              }`}
            >
              Không gom
            </button>
          </div>
        }
      />

      {/* 4. Bulk Action Bar */}
      <DataTableBulkActionBar
        selectedCount={Object.keys(selectedIds).filter((k) => selectedIds[k]).length}
        totalCount={filteredOrders.length}
        onClearSelection={() => setSelectedIds({})}
        actionGroups={shipperBulkGroups}
        onExecuteAction={handleExecuteAction}
        isLoading={bulkLoading}
        itemName="đơn hàng"
      />

      {/* 5. Grouped Data Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
        <GroupedDataTable
          columns={columns}
          data={pagedData}
          keyField="id"
          childrenField="children"
          expandable
          expandedRowRender={(row) => {
            if (row.isGroupHeader) return null;
            return (
              <div className="p-4 bg-slate-50 dark:bg-neutral-800/40 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#00875A]">menu_book</span>
                  <span>Kiện hàng gồm {row.items?.length || 0} sản phẩm:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {row.items?.map((it: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {it.quantity}x
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white truncate" title={it.title}>
                          {it.title}
                        </div>
                        <div className="text-[10px] text-slate-400">Định dạng: {it.format}</div>
                      </div>
                    </div>
                  ))}
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
          emptyTitle="Bạn hiện không có đơn hàng nào đang chạy!"
          emptyMessage="Hãy vào Sàn Đơn Chờ Nhận để lấy thêm đơn sách gia tăng thu nhập."
        />

        {/* 6. Standard Pagination Bar matching Screenshot 2 */}
        <StandardPaginationBar
          currentPage={currentPage}
          totalItems={groupBy === 'NONE' ? filteredOrders.length : groupedRows.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          itemLabel={groupBy === 'NONE' ? 'đơn hàng' : 'nhóm đơn'}
        />
      </div>

      {/* Modal Báo Giao Thất Bại */}
      {selectedOrderToFail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-neutral-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-[28px]">report_problem</span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Báo Cáo Giao Hàng Thất Bại
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Vui lòng chọn chính xác lý do không thể giao kiện sách này cho khách hàng. Hệ thống sẽ ghi nhận lịch sử và kích hoạt quy trình hẹn giao lại hoặc hoàn trả:
            </p>
            <div className="space-y-2 text-xs">
              {[
                'Khách không nghe máy (đã gọi 3 lần)',
                'Khách hẹn giao lại vào ngày mai',
                'Khách từ chối nhận hàng do đổi ý',
                'Địa chỉ nhận hàng không tìm thấy / sai số nhà',
                'Khách không đủ tiền thanh toán COD',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    failReason === reason
                      ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="failReason"
                    checked={failReason === reason}
                    onChange={() => setFailReason(reason)}
                    className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedOrderToFail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  failDelivery(selectedOrderToFail, failReason);
                  setSelectedOrderToFail(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer"
              >
                Xác nhận thất bại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Dispatch Modal */}
      {dispatchModal.open && (
        <QuickDispatchNotificationModal
          isOpen={dispatchModal.open}
          onClose={() => setDispatchModal((prev) => ({ ...prev, open: false }))}
          senderRole="SHIPPER"
          targetRole={dispatchModal.targetRole}
          targetId={dispatchModal.targetId}
          targetName={dispatchModal.targetName}
          orderCode={dispatchModal.orderCode}
          orderId={dispatchModal.orderId}
        />
      )}
    </div>
  );
}
