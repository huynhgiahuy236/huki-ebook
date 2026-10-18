import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useShipper, ShipperOrder } from '@/ui/context/ShipperContext';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '../common';
import { StandardPaginationBar } from '../common/GroupedDataTable';

type GroupByMode = 'SHOP' | 'ZONE' | 'PAYMENT' | 'NONE';

export default function ShipperAvailableOrdersView() {
  const { isOnline, setIsOnline, availableOrders, acceptOrder, refreshOrders, isLoading } = useShipper();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'COD' | 'PREPAID'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByMode>('SHOP');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedOrderIds, setSelectedOrderIds] = useState<Record<string, boolean>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

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
        const matchAddr = order.deliveryAddress.toLowerCase().includes(q);
        const matchWard = (order.deliveryWard || '').toLowerCase().includes(q);
        return matchCode || matchShop || matchCustomer || matchAddr || matchWard;
      }
      return true;
    });
  }, [availableOrders, filterType, searchQuery]);

  // 2. Group orders
  const groupedData = useMemo(() => {
    if (groupBy === 'NONE') {
      const paged = filteredOrders.slice((currentPage - 1) * 10, currentPage * 10);
      return [
        {
          key: 'ALL',
          title: 'Tất Cả Đơn Hàng Chờ Nhận',
          subtitle: `Hiển thị ${paged.length} trên tổng số ${filteredOrders.length} đơn hàng`,
          icon: 'inventory_2',
          orders: paged,
        },
      ];
    }

    const map: Record<string, { key: string; title: string; subtitle: string; icon: string; orders: ShipperOrder[] }> = {};

    filteredOrders.forEach((order) => {
      let groupKey = '';
      let title = '';
      let subtitle = '';
      let icon = 'storefront';

      if (groupBy === 'SHOP') {
        groupKey = order.shopName;
        title = order.shopName;
        subtitle = `${order.shopAddress} • SĐT: ${order.shopPhone}`;
        icon = 'storefront';
      } else if (groupBy === 'ZONE') {
        groupKey = `${order.deliveryWard || 'Khu vực'}, ${order.deliveryDistrict || 'Đồng Tháp'}`;
        title = groupKey;
        subtitle = `Địa bàn giao hàng tập trung tại ${order.deliveryProvince || 'Đồng Tháp'}`;
        icon = 'location_on';
      } else if (groupBy === 'PAYMENT') {
        groupKey = order.paymentMethod;
        title = order.paymentMethod === 'COD' ? 'Đơn Thu Hộ Tiền Mặt (COD)' : 'Đơn Đã Thanh Toán Online';
        subtitle =
          order.paymentMethod === 'COD'
            ? 'Bưu tá thu tiền mặt khi giao sách cho khách'
            : 'Khách đã thanh toán qua thẻ/Ví, chỉ cần giao sách';
        icon = order.paymentMethod === 'COD' ? 'payments' : 'credit_card';
      }

      if (!map[groupKey]) {
        map[groupKey] = {
          key: groupKey,
          title,
          subtitle,
          icon,
          orders: [],
        };
      }
      map[groupKey].orders.push(order);
    });

    return Object.values(map);
  }, [filteredOrders, groupBy]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleSelectAllInGroup = (orders: ShipperOrder[]) => {
    const allSelected = orders.every((o) => selectedOrderIds[o.id]);
    setSelectedOrderIds((prev) => {
      const next = { ...prev };
      orders.forEach((o) => {
        if (allSelected) {
          delete next[o.id];
        } else {
          next[o.id] = true;
        }
      });
      return next;
    });
  };

  const handleBatchAccept = (ordersToAccept: ShipperOrder[]) => {
    ordersToAccept.forEach((o) => acceptOrder(o.id));
    setSelectedOrderIds({});
  };

  const selectedCount = Object.keys(selectedOrderIds).filter((id) => selectedOrderIds[id]).length;
  const totalEarningsAll = filteredOrders.reduce((sum, o) => sum + o.shippingFee, 0);
  const totalCodAll = filteredOrders.reduce((sum, o) => sum + o.codAmount, 0);

  const shipperBulkActionGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        groupLabel: 'Nhận việc & Điều phối tuyến',
        actions: [
          {
            value: 'BATCH_ACCEPT',
            label: `Nhận ${selectedCount} đơn đã chọn vào tuyến giao`,
            confirmTitle: 'Xác nhận nhận đơn hàng loạt',
            confirmMessage: `Bạn có chắc chắn muốn nhận ${selectedCount} đơn hàng này và bắt đầu di chuyển tới shop lấy sách?`,
          },
        ],
      },
    ],
    [selectedCount]
  );

  const handleExecuteBulkAction = async (action: string) => {
    if (action === 'BATCH_ACCEPT') {
      const ordersToAccept = availableOrders.filter((o) => selectedOrderIds[o.id]);
      setBulkLoading(true);
      try {
        handleBatchAccept(ordersToAccept);
        setSelectedOrderIds({});
      } finally {
        setBulkLoading(false);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP METRICS & STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Đơn Chờ Sẵn Sàng</span>
            <div className="text-2xl font-black text-[#003B2B] mt-0.5">{availableOrders.length} đơn</div>
            <span className="text-xs text-gray-500">Đã đóng gói tại kho/shop</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">electric_moped</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex items-center justify-between">
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

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex items-center justify-between">
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

      {/* 2. UNIVERSAL DATA TABLE FILTER BAR WITH CARD CONTAINER FRAME */}
      <DataTableFilterBar
        tabs={[
          { key: 'ALL', label: 'Tất cả đơn', count: availableOrders.length },
          { key: 'COD', label: 'Thu COD', count: availableOrders.filter(o => o.paymentMethod === 'COD').length },
          { key: 'PREPAID', label: 'Đã trả Online', count: availableOrders.filter(o => o.paymentMethod === 'ONLINE_PAYMENT').length },
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
        bulkActionGroups={shipperBulkActionGroups}
        selectedCount={selectedCount}
        totalCount={filteredOrders.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedOrderIds({})}
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
              onClick={() => setGroupBy('SHOP')}
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
              onClick={() => setGroupBy('ZONE')}
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
              onClick={() => setGroupBy('PAYMENT')}
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
              onClick={() => setGroupBy('NONE')}
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

      {/* 3. GROUPED DATA TABLES */}
      {groupedData.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-2xs">
          <span className="material-symbols-outlined text-[42px] text-gray-300">inventory_2</span>
          <p className="text-sm font-bold text-gray-800 mt-2">Không tìm thấy đơn hàng nào phù hợp</p>
          <p className="text-xs text-gray-400 mt-1">
            Vui lòng thử đổi bộ lọc hoặc xóa từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(groupBy === 'NONE' ? groupedData : groupedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)).map((group) => {
            const isCollapsed = !!collapsedGroups[group.key];
            const groupTotalEarnings = group.orders.reduce((sum, o) => sum + o.shippingFee, 0);
            const groupTotalCod = group.orders.reduce((sum, o) => sum + o.codAmount, 0);
            const groupTotalWeight = group.orders.reduce((sum, o) => sum + o.totalWeight, 0);
            const allInGroupSelected = group.orders.length > 0 && group.orders.every((o) => selectedOrderIds[o.id]);

            return (
              <div
                key={group.key}
                className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden transition-all"
              >
                {/* GROUP ACCORDION HEADER */}
                <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                  {/* Left: Collapse Toggle + Group Title */}
                  <div
                    onClick={() => toggleGroupCollapse(group.key)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <button
                      type="button"
                      className="w-7 h-7 rounded-lg bg-white border border-[#CBD5E1] text-gray-600 flex items-center justify-center transition-transform"
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    <div className="w-8 h-8 rounded-lg bg-[#003B2B]/10 text-[#003B2B] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{group.icon}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#003B2B] truncate">{group.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#003B2B] text-white">
                          {group.orders.length} đơn
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{group.subtitle}</p>
                    </div>
                  </div>

                  {/* Right: Group Financial Stats & Quick Bulk Accept */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden md:flex items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Tổng tiền công:</span>
                        <strong className="text-[#00875A] font-bold">+{groupTotalEarnings.toLocaleString('vi-VN')}đ</strong>
                      </div>
                      <div className="w-[1px] h-4 bg-gray-200"></div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Thu COD:</span>
                        <strong className="text-amber-700 font-bold">{groupTotalCod.toLocaleString('vi-VN')}đ</strong>
                      </div>
                      <div className="w-[1px] h-4 bg-gray-200"></div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Khối lượng:</span>
                        <strong className="text-gray-700 font-bold">{(groupTotalWeight / 1000).toFixed(2)} kg</strong>
                      </div>
                    </div>

                    {/* Bulk Accept entire group */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBatchAccept(group.orders);
                      }}
                      className="px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">done_all</span>
                      <span>Nhận Hết ({group.orders.length})</span>
                    </button>
                  </div>
                </div>

                {/* INNER DATA TABLE FOR THIS GROUP */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-[#FAFAFA] text-[11px] font-bold text-gray-500 uppercase border-b border-[#E2E8F0]">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={allInGroupSelected}
                              onChange={() => toggleSelectAllInGroup(group.orders)}
                              className="rounded text-[#00875A] focus:ring-[#00875A] cursor-pointer"
                            />
                          </th>
                          <th className="p-3">Mã đơn & Kiện hàng</th>
                          <th className="p-3">Điểm nhận hàng (Khách)</th>
                          <th className="p-3">Khoảng cách</th>
                          <th className="p-3">Khối lượng</th>
                          <th className="p-3">Hình thức & COD</th>
                          <th className="p-3">Tiền công ship</th>
                          <th className="p-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {group.orders.map((order) => {
                          const isSelected = !!selectedOrderIds[order.id];

                          return (
                            <tr
                              key={order.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-emerald-50/50' : 'hover:bg-gray-50/80'
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOrder(order.id)}
                                  className="rounded text-[#00875A] focus:ring-[#00875A] cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-mono font-bold text-sm text-[#003B2B]">{order.code}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  {order.items?.map((item) => `${item.quantity}x ${item.title}`).join(', ') || '1 kiện sách'}
                                </div>
                                {groupBy !== 'SHOP' && (
                                  <div className="text-[10px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">storefront</span>
                                    <span>{order.shopName}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 max-w-[260px]">
                                <div className="font-bold text-gray-900">{order.customerName}</div>
                                <div className="text-[11px] text-gray-600 truncate mt-0.5">
                                  {order.deliveryAddress}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {order.deliveryWard}, {order.deliveryDistrict}, {order.deliveryProvince} • SĐT: {order.customerPhone}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                  {order.distanceKm} km
                                </span>
                              </td>
                              <td className="p-3 text-gray-600">
                                {order.totalWeight}g
                              </td>
                              <td className="p-3">
                                {order.paymentMethod === 'COD' ? (
                                  <div>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                      Thu COD
                                    </span>
                                    <div className="font-bold text-amber-700 text-xs mt-0.5">
                                      {order.codAmount.toLocaleString('vi-VN')}đ
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      Đã Trả Online
                                    </span>
                                    <div className="text-[10px] text-gray-400 mt-0.5">0đ thu hộ</div>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="font-black text-[#00875A] text-sm">
                                  +{order.shippingFee.toLocaleString('vi-VN')}đ
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => acceptOrder(order.id)}
                                  className="px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">electric_moped</span>
                                  <span>Nhận Đơn</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Universal Standard Pagination Toolbar */}
          <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-neutral-800 shadow-2xs">
            <StandardPaginationBar
              currentPage={currentPage}
              totalItems={groupBy === 'NONE' ? filteredOrders.length : groupedData.length}
              pageSize={groupBy === 'NONE' ? 10 : pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              itemLabel={groupBy === 'NONE' ? 'đơn hàng' : 'nhóm đơn'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
