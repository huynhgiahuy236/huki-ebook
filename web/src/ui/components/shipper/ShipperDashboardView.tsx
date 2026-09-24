"use client";

import React from 'react';
import Link from 'next/link';
import { useShipper } from '@/ui/context/ShipperContext';

export default function ShipperDashboardView() {
  const {
    isOnline,
    setIsOnline,
    profile,
    wallet,
    availableOrders,
    activeDeliveries,
    historyOrders,
    acceptOrder,
  } = useShipper();

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Ví Khả Dụng */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs hover:border-[#00875A]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ví Thu Nhập Khả Dụng
            </span>
            <span className="w-9 h-9 rounded-lg bg-emerald-50 text-[#00875A] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#00875A] tracking-tight">
              {wallet.availableEarnings.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
            <span className="text-gray-500">Đã cộng công ship</span>
            <Link
              href="/shipper/wallet"
              className="text-[#00875A] font-bold hover:underline inline-flex items-center gap-0.5"
            >
              <span>Rút tiền</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Stat 2: Tiền COD Tạm Giữ */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tiền COD Tạm Giữ
            </span>
            <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black tracking-tight ${wallet.codDebt > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
              {wallet.codDebt.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
            <span className="text-gray-500">Hạn mức nợ tối đa: 2.000.000đ</span>
            <Link
              href="/shipper/wallet"
              className="text-amber-700 font-bold hover:underline inline-flex items-center gap-0.5"
            >
              <span>Nộp về sàn</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Stat 3: Đơn Đang Giao */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Đơn Đang Giao
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">route</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 tracking-tight">
              {activeDeliveries.length} <span className="text-sm font-semibold text-gray-500">đơn</span>
            </span>
            {activeDeliveries.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 animate-pulse">
                Đang vận chuyển
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
            <span className="text-gray-500">Cần hoàn thành sớm</span>
            <Link
              href="/shipper/active-deliveries"
              className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
            >
              <span>Xem chi tiết</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Stat 4: Sàn Đơn Quanh Bạn */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sàn Đơn Chờ Nhận
            </span>
            <span className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">electric_moped</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700 tracking-tight">
              {availableOrders.length} <span className="text-sm font-semibold text-gray-500">đơn sẵn sàng</span>
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
            <span className="text-gray-500">{profile.activeZone.split('(')[0].trim()}</span>
            <Link
              href="/shipper/available-orders"
              className="text-purple-600 font-bold hover:underline inline-flex items-center gap-0.5"
            >
              <span>Nhận đơn ngay</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Active Delivery & Available Orders Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Deliveries Box */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                <h2 className="text-sm font-bold text-[#003B2B] uppercase tracking-wider">
                  Đơn Hàng Đang Tiến Hành ({activeDeliveries.length})
                </h2>
              </div>
              <Link
                href="/shipper/active-deliveries"
                className="text-xs font-semibold text-[#00875A] hover:underline"
              >
                Xem toàn bộ
              </Link>
            </div>

            {activeDeliveries.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[24px]">task_alt</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Bạn đang không có đơn hàng nào đang giao.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Hãy ghé Sàn đơn chờ nhận để nhận các đơn sách quanh khu vực của bạn!
                </p>
                <Link
                  href="/shipper/available-orders"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">electric_moped</span>
                  <span>Mở Sàn Đơn Chờ Nhận ({availableOrders.length})</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {activeDeliveries.map((delivery) => (
                  <div key={delivery.id} className="p-5 hover:bg-gray-50/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#003B2B]">
                          {delivery.code}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {delivery.status === 'PICKING_UP'
                            ? '1. Đang đi lấy sách từ Shop'
                            : delivery.status === 'IN_TRANSIT'
                            ? '2. Đang đi giao tới khách'
                            : 'Hoàn tất'}
                        </span>
                        <span className="text-xs text-gray-400">• {delivery.distanceKm} km</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Tiền công ship: </span>
                        <strong className="text-sm font-bold text-[#00875A]">
                          +{delivery.shippingFee.toLocaleString('vi-VN')}đ
                        </strong>
                      </div>
                    </div>

                    {/* Routing timeline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] text-xs">
                      <div>
                        <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">storefront</span>
                          <span>Điểm lấy hàng: {delivery.shopName}</span>
                        </div>
                        <div className="text-gray-600 mt-0.5 truncate">{delivery.shopAddress}</div>
                        <div className="text-gray-400 text-[11px]">SĐT Shop: {delivery.shopPhone}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">person_pin_circle</span>
                          <span>Điểm giao: {delivery.customerName}</span>
                        </div>
                        <div className="text-gray-600 mt-0.5 truncate">{delivery.deliveryAddress}</div>
                        <div className="text-gray-400 text-[11px]">
                          Thu COD:{' '}
                          <strong className="text-gray-800">
                            {delivery.codAmount > 0 ? `${delivery.codAmount.toLocaleString('vi-VN')}đ` : '0đ (Đã thanh toán online)'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Link
                        href="/shipper/active-deliveries"
                        className="px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">route</span>
                        <span>Cập nhật tiến trình & Giao hàng</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Orders Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">electric_moped</span>
                <h2 className="text-sm font-bold text-[#003B2B] uppercase tracking-wider">
                  Sàn Đơn Chờ Nhận Quanh Bạn ({availableOrders.length})
                </h2>
              </div>
              <Link
                href="/shipper/available-orders"
                className="text-xs font-semibold text-[#00875A] hover:underline"
              >
                Mở sàn đầy đủ
              </Link>
            </div>

            {availableOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                Hiện không còn đơn chờ nào trong khu vực. Bạn hãy chờ đơn mới đổ về nhé!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-[#E2E8F0]">
                    <tr>
                      <th className="p-3">Mã đơn</th>
                      <th className="p-3">Khoảng cách</th>
                      <th className="p-3">Lộ trình (Shop ➔ Khách)</th>
                      <th className="p-3">Thu hộ COD</th>
                      <th className="p-3">Tiền công</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {availableOrders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#003B2B]">
                          {order.code}
                          <div className="text-[10px] text-gray-400 font-normal">{order.items?.length || 1} món sách</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                            {order.distanceKm} km
                          </span>
                        </td>
                        <td className="p-3 max-w-[240px]">
                          <div className="font-semibold text-gray-800 truncate">{order.shopName}</div>
                          <div className="text-gray-400 text-[10px] truncate">➔ {order.deliveryAddress}</div>
                        </td>
                        <td className="p-3">
                          {order.codAmount > 0 ? (
                            <span className="font-bold text-amber-700">
                              {order.codAmount.toLocaleString('vi-VN')}đ
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">0đ (Đã trả)</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[#00875A] text-sm">
                            +{order.shippingFee.toLocaleString('vi-VN')}đ
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => acceptOrder(order.id)}
                            className="px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                          >
                            Nhận Đơn
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Driver Info & Process */}
        <div className="space-y-6">
          {/* Driver Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#003B2B] to-[#00875A] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                {profile.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-gray-800">{profile.name}</h3>
                  <span className="text-[11px] text-amber-600 font-bold">⭐{profile.rating}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Xe: <strong className="text-gray-700">{profile.licensePlate}</strong>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Khu vực: {profile.activeZone}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#F1F5F9] grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-gray-400 text-[10px] block uppercase">Tổng đơn đã giao</span>
                <strong className="text-sm font-bold text-gray-800">{profile.totalDelivered} đơn</strong>
              </div>
              <div className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-gray-400 text-[10px] block uppercase">Tỷ lệ hoàn thành</span>
                <strong className="text-sm font-bold text-emerald-600">99.2%</strong>
              </div>
            </div>
          </div>

          {/* Quick Financial Action Box */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Quy Trình Dòng Tiền Bưu Tá
              </h3>
              <span className="text-[10px] font-bold text-[#00875A] bg-emerald-50 px-2 py-0.5 rounded">
                Tự Động
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-gray-800">Nhận tiền công ship:</strong>
                  <p className="text-gray-500 text-[11px]">
                    Cộng ngay vào <strong>Ví khả dụng</strong> sau khi giao thành công.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-gray-800">Thu tiền COD của khách:</strong>
                  <p className="text-gray-500 text-[11px]">
                    Tiền mặt tạm tính vào <strong>Nợ COD</strong> của shipper, nộp về sàn theo ca.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-gray-800">Rút tiền & Quyết toán:</strong>
                  <p className="text-gray-500 text-[11px]">
                    Rút tiền công về tài khoản ngân hàng hoặc cấn trừ tiền COD trực tiếp.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/shipper/wallet"
                className="w-full py-2 bg-[#003B2B] hover:bg-[#00875A] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                <span>Quản Lý Ví & Đối Soát COD</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
