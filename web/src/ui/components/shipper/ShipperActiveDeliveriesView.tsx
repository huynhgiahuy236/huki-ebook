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
  
  // Double-Lock: strictly 10 items / page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Lựa chọn nhiều đơn (Bulk Action)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal báo giao thất bại
  const [selectedOrderToFail, setSelectedOrderToFail] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('Khách không nghe máy (đã gọi 3 lần)');

  // Modal chụp ảnh bằng chứng giao hàng (POD - BUG-04-003)
  const [podModalOrder, setPodModalOrder] = useState<ShipperOrder | null>(null);
  const [podImagePreview, setPodImagePreview] = useState<string | null>(null);
  const [podReceiverNote, setPodReceiverNote] = useState<string>('Khách đã nhận sách và kiểm tra nguyên vẹn');
  const [podSubmitting, setPodSubmitting] = useState(false);

  const handleOpenPod = (order: ShipperOrder) => {
    setPodModalOrder(order);
    setPodImagePreview(null);
    setPodReceiverNote('Khách đã nhận sách và kiểm tra nguyên vẹn');
  };

  const handlePodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPodImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPodDelivery = async () => {
    if (!podModalOrder) return;
    if (!podImagePreview) {
      alert('Vui lòng chụp hoặc tải ảnh bằng chứng giao hàng (POD) trước khi hoàn tất!');
      return;
    }
    setPodSubmitting(true);
    try {
      await completeDelivery(podModalOrder.id, `POD_VERIFIED: ${podReceiverNote}`, podImagePreview);
      setPodModalOrder(null);
    } finally {
      setPodSubmitting(false);
    }
  };

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
      if (activeTab === 'PICKING_UP' && order.status !== 'PICKING_UP') return false;
      if (activeTab === 'IN_TRANSIT' && order.status !== 'IN_TRANSIT') return false;
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

  // Phân trang Double-Lock
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
      groupLabel: 'Thao tác kho vận',
      actions: [
        {
          value: 'BULK_PICKUP',
          label: 'Lấy hàng loạt từ Shop',
          confirmMessage: 'Xác nhận đã nhận hàng từ các Shop được chọn?',
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

  // 5 CỘT VÀNG CHUẨN MỰC (Seller Standard: ~46px height)
  const columns: Column<any>[] = [
    {
      key: 'code',
      title: 'Mã Đơn & Sách',
      width: '26%',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="flex items-center gap-2 py-0.5">
              <span className="w-7 h-7 rounded-lg bg-[#003B2B]/10 text-[#003B2B] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[16px]">{row.icon}</span>
              </span>
              <div>
                <strong className="text-xs font-black text-[#003B2B] block">{row.title}</strong>
                <span className="text-[10px] text-slate-500 font-normal">{row.subtitle}</span>
              </div>
            </div>
          );
        }

        const isPickingUp = row.status === 'PICKING_UP';
        const firstItem = row.items?.[0];
        const itemTitle = row.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(', ') || '1 kiện sách';
        const itemCover = firstItem?.coverImage || firstItem?.coverUrl || firstItem?.bookCoverUrl;

        return (
          <div className="flex items-center gap-2 py-0.5">
            <div className="w-7 h-9 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
              {itemCover ? (
                <img src={itemCover} alt={itemTitle} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-[13px]">menu_book</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <strong className="font-mono text-xs font-bold text-slate-900">{row.code}</strong>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                    isPickingUp ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  {isPickingUp ? 'Chờ lấy Shop' : 'Đang giao'}
                </span>
              </div>
              <div className="text-[11px] text-slate-700 font-medium break-words line-clamp-1 leading-snug" title={itemTitle}>
                {itemTitle}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {row.distanceKm || 3}km • {(row.totalWeight || 500) / 1000}kg
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'shop',
      title: 'Điểm Lấy Hàng (Shop)',
      width: '23%',
      render: (_, row) => {
        if (row.isGroupHeader) return null;
        const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.shopAddress)}`;
        return (
          <div className="text-xs py-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-slate-800 break-words line-clamp-1 text-xs" title={row.shopName}>
                {row.shopName}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={`tel:${row.shopPhone}`} className="text-[#00875A] hover:underline" title="Gọi Shop">
                  <span className="material-symbols-outlined text-[13px] align-middle">call</span>
                </a>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-[#00875A] text-[#00875A] hover:text-white transition-colors text-[10px] font-bold"
                  title="Mở chỉ đường Google Maps tới Shop"
                >
                  <span className="material-symbols-outlined text-[12px] align-middle">directions</span>
                  <span className="hidden sm:inline">Chỉ đường</span>
                </a>
              </div>
            </div>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-[#00875A] hover:underline text-[10.5px] break-words line-clamp-1 leading-tight mt-0.5 block"
              title={`Bấm để mở Google Maps chỉ đường: ${row.shopAddress}`}
            >
              {row.shopAddress}
            </a>
          </div>
        );
      },
    },
    {
      key: 'customer',
      title: 'Điểm Giao Hàng (Khách)',
      width: '23%',
      render: (_, row) => {
        if (row.isGroupHeader) return null;
        const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;
        const customerMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`;
        return (
          <div className="text-xs py-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-slate-800 break-words line-clamp-1 text-xs" title={row.customerName}>
                {row.customerName}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={`tel:${row.customerPhone}`} className="text-[#00875A] hover:underline" title="Gọi Khách">
                  <span className="material-symbols-outlined text-[13px] align-middle">call</span>
                </a>
                <a
                  href={customerMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-[#00875A] text-[#00875A] hover:text-white transition-colors text-[10px] font-bold"
                  title="Mở chỉ đường Google Maps tới Khách"
                >
                  <span className="material-symbols-outlined text-[12px] align-middle">directions</span>
                  <span className="hidden sm:inline">Chỉ đường</span>
                </a>
              </div>
            </div>
            <a
              href={customerMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-[#00875A] hover:underline text-[10.5px] break-words line-clamp-1 leading-tight mt-0.5 block"
              title={`Bấm để mở Google Maps chỉ đường: ${fullAddr}`}
            >
              {row.deliveryAddress}, {row.deliveryWard}
            </a>
          </div>
        );
      },
    },
    {
      key: 'finance',
      title: 'Cước & Thu Hộ',
      width: '14%',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="text-xs text-right py-0.5">
              <div className="text-[#00875A] font-bold">
                +${row.groupEarning?.toLocaleString('vi-VN')}đ
              </div>
              <div className="text-[10.5px] text-amber-700 font-medium">
                COD: ${row.groupCod?.toLocaleString('vi-VN')}đ
              </div>
            </div>
          );
        }

        const isCod = row.paymentMethod === 'COD';
        return (
          <div className="text-xs py-0.5">
            <div className="text-[#00875A] font-bold text-xs">
              +${row.shippingFee?.toLocaleString('vi-VN')}đ
            </div>
            {isCod ? (
              <div className="mt-0.5">
                <span className="font-mono text-xs font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-200 inline-block shadow-2xs">
                  COD: ${row.codAmount?.toLocaleString('vi-VN')}đ
                </span>
              </div>
            ) : (
              <div className="text-[10.5px] font-medium text-slate-400 mt-0.5">
                Đã TT Online
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng Thái & Thao Tác',
      width: '14%',
      align: 'right',
      render: (_, row) => {
        if (row.isGroupHeader) {
          return (
            <div className="text-right py-0.5">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#003B2B] text-white">
                {row.ordersCount} đơn
              </span>
            </div>
          );
        }

        const isPickingUp = row.status === 'PICKING_UP';
        const isInTransit = row.status === 'IN_TRANSIT';

        return (
          <div className="flex items-center justify-end gap-1 py-0.5">
            {isPickingUp ? (
              <button
                type="button"
                onClick={() => confirmPickup(row.id)}
                className="px-2.5 py-1 rounded-lg bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Bấm sau khi đã nhận kiện hàng từ Shop"
              >
                <span className="material-symbols-outlined text-[13px]">done</span>
                <span>Đã lấy</span>
              </button>
            ) : isInTransit ? (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenPod(row)}
                  className="px-2.5 py-1 rounded-lg bg-[#003B2B] hover:bg-emerald-900 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Chụp ảnh POD và xác nhận giao thành công"
                >
                  <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                  <span>Giao xong (POD)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderToFail(row.id)}
                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center cursor-pointer border border-rose-200"
                  title="Báo giao thất bại"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </>
            ) : null}

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
              className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer border border-slate-200"
              title="Phát thông báo nhanh"
            >
              <span className="material-symbols-outlined text-[13px]">notifications_active</span>
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
      {/* 1. Compact Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-[#003B2B] uppercase tracking-wider">
            Tuyến Giao Đang Chạy ({forwardDeliveries.length} đơn)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/shipper/returns"
            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-900 flex items-center gap-1 shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-[14px] text-purple-700">assignment_return</span>
            <span>Thu Hồi &amp; Hoàn Sách</span>
          </Link>
          <Link
            href="/shipper/available-orders"
            className="px-3 py-1 rounded-lg bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Nhận đơn mới</span>
          </Link>
        </div>
      </div>

      {/* 2. Stat Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200/80 dark:border-neutral-800 p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đang nhận ca</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {forwardDeliveries.length} đơn
            </div>
            <span className="text-xs text-slate-500">Tổng đơn đang thực hiện</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">route</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Chờ lấy từ Shop</span>
            <div className="text-lg sm:text-xl font-bold text-amber-800 dark:text-amber-200 mt-0.5">
              {pickingCount} đơn
            </div>
            <span className="text-xs text-slate-500">Cần di chuyển đến Shop lấy</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-blue-200 dark:border-blue-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đang giao khách</span>
            <div className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-200 mt-0.5">
              {transitCount} đơn
            </div>
            <span className="text-xs text-slate-500">Đã nhận hàng, đang đi giao</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">electric_moped</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Tiền công dự kiến</span>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">
              +{totalEarningsAll.toLocaleString('vi-VN')}đ
            </div>
            <span className="text-xs text-slate-500">Thu COD: {totalCodAll.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
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
            const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;
            const customerMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`;
            const shopMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.shopAddress)}`;
            const isCod = row.paymentMethod === 'COD';
            const isPickingUp = row.status === 'PICKING_UP';
            const isInTransit = row.status === 'IN_TRANSIT';

            return (
              <div className="p-4 bg-slate-50 dark:bg-neutral-800/40 rounded-xl space-y-4 text-xs">
                {/* 3-CARD MASTER-DETAIL CONTAINER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  {/* Card 1: Tuyến Đường & Chỉ Đường */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2.5">
                    <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                      <span className="material-symbols-outlined text-[15px] text-[#00875A]">route</span>
                      <span>Lộ Trình Vận Chuyển ({row.distanceKm || 3} km)</span>
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
                          {isCod ? (
                            <span className="font-mono text-base sm:text-lg font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 shadow-2xs">
                              ${row.codAmount?.toLocaleString('vi-VN')}đ
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">0đ (Đã TT Online)</span>
                          )}
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

                    {/* Action buttons inside drawer */}
                    <div className="pt-2 flex items-center gap-2">
                      {isPickingUp ? (
                        <button
                          type="button"
                          onClick={() => confirmPickup(row.id)}
                          className="flex-1 py-2 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">done</span>
                          <span>Đã Lấy Hàng Từ Shop</span>
                        </button>
                      ) : isInTransit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenPod(row)}
                            className="flex-1 py-2 bg-[#003B2B] hover:bg-emerald-950 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                            <span>Giao Hàng Thành Công (Chụp POD)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderToFail(row.id)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Báo Thất Bại
                          </button>
                        </>
                      ) : null}
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
          emptyTitle="Bạn hiện không có đơn hàng nào đang chạy!"
          emptyMessage="Hãy vào Sàn Đơn Chờ Nhận để lấy thêm đơn sách gia tăng thu nhập."
        />

        {/* 6. Standard Pagination Bar (Double-Lock: 10 items/page) */}
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!failReason || !failReason.trim()}
                onClick={() => {
                  if (!failReason || !failReason.trim()) return;
                  failDelivery(selectedOrderToFail, failReason.trim());
                  setSelectedOrderToFail(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
      {/* Modal Chụp Ảnh Xác Thực Giao Hàng (Proof of Delivery - POD - BUG-04-003) */}
      {podModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-neutral-800 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-[#003B2B]">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-[#003B2B] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Xác Thực Giao Hàng (POD)
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Đơn #{podModalOrder.code}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPodModalOrder(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Thông tin đơn và tiền COD cần thu */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Khách nhận:</span>
                <strong className="text-slate-800">{podModalOrder.customerName} ({podModalOrder.customerPhone})</strong>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                <span className="text-slate-700 text-right">{podModalOrder.deliveryAddress}, {podModalOrder.deliveryWard}</span>
              </div>
              {podModalOrder.paymentMethod === 'COD' ? (
                <div className="pt-2 border-t border-slate-200 dark:border-neutral-700 flex items-center justify-between">
                  <span className="text-rose-700 font-bold uppercase text-[11px]">Tiền mặt COD phải thu:</span>
                  <span className="font-mono text-xl font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                    {podModalOrder.codAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 dark:border-neutral-700 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold text-[11px]">Thanh toán:</span>
                  <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    Đã thanh toán Online (Thu 0đ)
                  </span>
                </div>
              )}
            </div>

            {/* Bước Chụp / Tải ảnh POD */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. Ảnh Chụp Bằng Chứng Giao Hàng <span className="text-rose-600">*</span>:
              </label>
              {podImagePreview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black/5 aspect-video flex items-center justify-center">
                  <img src={podImagePreview} alt="POD Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setPodImagePreview(null)}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    <span>Chụp lại</span>
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                  <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Bấm để chụp ảnh hoặc tải ảnh kiện hàng trao tay
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Hỗ trợ Camera trực tiếp từ điện thoại hoặc file PNG, JPG
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePodFileChange}
                  />
                </label>
              )}
            </div>

            {/* Ghi chú nhận hàng */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. Ghi chú giao nhận:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  'Khách ký nhận trực tiếp',
                  'Người nhà nhận thay',
                  'Để trước cửa theo yêu cầu',
                  'Giao bảo vệ tòa nhà',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPodReceiverNote(preset)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      podReceiverNote === preset
                        ? 'bg-[#003B2B] text-white border-[#003B2B] font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={podReceiverNote}
                onChange={(e) => setPodReceiverNote(e.target.value)}
                placeholder="Nhập ghi chú chi tiết nếu có..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#003B2B]"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPodModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!podImagePreview || podSubmitting}
                onClick={handleConfirmPodDelivery}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#003B2B] hover:bg-emerald-950 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-all"
              >
                {podSubmitting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang hoàn tất...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Xác Nhận Đã Giao Thành Công</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
