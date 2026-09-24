"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useShipper } from '@/ui/context/ShipperContext';

export default function ShipperWalletView() {
  const { wallet, transactions, requestWithdrawal } = useShipper();

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankInfo, setBankInfo] = useState({
    bank: 'Vietcombank (VCB)',
    account: '0123456789',
    name: 'NGUYEN VAN HUNG',
  });
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(withdrawAmount.replace(/\D/g, ''), 10);
    if (!val || val <= 0 || val > wallet.availableEarnings) return;
    requestWithdrawal(val, bankInfo);
    setWithdrawSuccess(true);
    setTimeout(() => {
      setWithdrawSuccess(false);
      setWithdrawOpen(false);
      setWithdrawAmount('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP 2 MAIN FINANCIAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: VÍ THU NHẬP CƯỚC KHẢ DỤNG */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs flex flex-col justify-between gap-5 relative overflow-hidden hover:border-[#00875A]/40 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                1. Ví Thu Nhập Cước Khả Dụng
              </span>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">savings</span>
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Số dư có thể rút ngay:</span>
              <strong className="text-3xl font-black text-[#00875A] block tracking-tight mt-0.5">
                {wallet.availableEarnings.toLocaleString('vi-VN')}đ
              </strong>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-950 space-y-1">
              <p>• Tổng thu nhập tích lũy: <strong>{wallet.totalEarnings.toLocaleString('vi-VN')}đ</strong></p>
              <p>• Rút tiền 24/7 về tài khoản ngân hàng bưu tá, miễn phí giao dịch.</p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setWithdrawAmount(wallet.availableEarnings.toString());
                setWithdrawOpen(!withdrawOpen);
              }}
              disabled={wallet.availableEarnings <= 0}
              className="w-full py-2.5 rounded-lg bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[17px]">account_balance</span>
              <span>{withdrawOpen ? 'Đóng Khung Rút Tiền' : 'Rút Tiền Về Ngân Hàng'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: CÔNG NỢ THU HỘ COD */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs flex flex-col justify-between gap-5 relative overflow-hidden hover:border-amber-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                2. Công Nợ Tiền Mặt Thu Hộ (COD)
              </span>
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">payments</span>
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Tiền mặt đang tạm giữ cần nộp:</span>
              <strong className={`text-3xl font-black block tracking-tight mt-0.5 ${wallet.codDebt > 0 ? 'text-amber-700' : 'text-gray-800'}`}>
                {wallet.codDebt.toLocaleString('vi-VN')}đ
              </strong>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
              <p>• Hạn mức giữ COD an toàn: <strong>2.000.000đ</strong></p>
              <p>• Quét mã VietQR PayOS để nộp trực tiếp vào quỹ Sàn HuKi Express theo ca.</p>
            </div>
          </div>

          <div>
            <Link
              href="/shipper/wallet/remit"
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
              <span>Nộp Tiền COD Qua PayOS (QR)</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* IN-PAGE WITHDRAWAL PANEL */}
      {withdrawOpen && (
        <div className="bg-white rounded-xl border border-emerald-300 p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-[#00875A] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Rút Tiền Về Tài Khoản Ngân Hàng</h3>
                <span className="text-xs text-gray-500">Tiền chuyển tức thì 24/7 qua NAPAS 247</span>
              </div>
            </div>
            <button
              onClick={() => setWithdrawOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕ Đóng
            </button>
          </div>

          {withdrawSuccess ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#00875A]">check_circle</span>
              <span>Lệnh rút tiền đã được thực hiện thành công! Tiền đang được chuyển về ngân hàng.</span>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-gray-600 font-bold mb-1">Số tiền rút (VNĐ)</label>
                <input
                  type="number"
                  max={wallet.availableEarnings}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Nhập số tiền..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-gray-900 font-bold focus:outline-hidden focus:border-[#00875A] focus:bg-white"
                  required
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Tối đa: {wallet.availableEarnings.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-1">Ngân hàng thụ hưởng</label>
                <input
                  type="text"
                  value={bankInfo.bank}
                  onChange={(e) => setBankInfo({ ...bankInfo, bank: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-gray-900 focus:outline-hidden focus:border-[#00875A] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-1">Số tài khoản &amp; Tên chủ thẻ</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bankInfo.account}
                    onChange={(e) => setBankInfo({ ...bankInfo, account: e.target.value })}
                    className="w-1/2 px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-gray-900 font-mono focus:outline-hidden focus:border-[#00875A] focus:bg-white"
                    required
                  />
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#00875A] hover:bg-[#003B2B] text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Xác Nhận Rút
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">Chủ tài khoản: {bankInfo.name}</span>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 2. TRANSACTIONS LEDGER */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-[20px]">receipt_long</span>
            <h2 className="text-sm font-bold text-[#003B2B] uppercase tracking-wider">
              Lịch Sử Biến Động Số Dư &amp; Đối Soát ({transactions.length})
            </h2>
          </div>
          <span className="text-xs text-gray-400">Tự động cập nhật tức thì</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-[#E2E8F0]">
              <tr>
                <th className="p-3.5">Mã &amp; Thời gian</th>
                <th className="p-3.5">Loại giao dịch</th>
                <th className="p-3.5">Chi tiết nội dung</th>
                <th className="p-3.5">Đơn liên quan</th>
                <th className="p-3.5 text-right">Số tiền biến động</th>
                <th className="p-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {transactions.map((tx) => {
                const isEarning = tx.type === 'EARNING';
                const isCodCollect = tx.type === 'COD_COLLECT';
                const isRemittance = tx.type === 'COD_REMITTANCE';
                const isWithdraw = tx.type === 'WITHDRAWAL';

                return (
                  <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-gray-900">{tx.id}</div>
                      <div className="text-[10px] text-gray-400">{tx.createdAt}</div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isEarning
                            ? 'bg-emerald-100 text-emerald-900'
                            : isCodCollect
                            ? 'bg-amber-100 text-amber-900'
                            : isRemittance
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-purple-100 text-purple-900'
                        }`}
                      >
                        {isEarning
                          ? 'Tiền công ship'
                          : isCodCollect
                          ? 'Thu tiền COD'
                          : isRemittance
                          ? 'Nộp COD về Sàn'
                          : 'Rút tiền về NH'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-gray-800">{tx.title}</div>
                      <div className="text-[11px] text-gray-500">{tx.description}</div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-gray-700">
                      {tx.orderCode || '—'}
                    </td>

                    <td className="p-3.5 text-right">
                      <strong
                        className={`text-sm font-black ${
                          isEarning
                            ? 'text-[#00875A]'
                            : isCodCollect
                            ? 'text-amber-700'
                            : isRemittance
                            ? 'text-blue-700'
                            : 'text-purple-700'
                        }`}
                      >
                        {isEarning || isCodCollect ? '+' : '-'}
                        {tx.amount.toLocaleString('vi-VN')}đ
                      </strong>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Thành công
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
