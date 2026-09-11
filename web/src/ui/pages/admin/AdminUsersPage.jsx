import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [inspectingUser, setInspectingUser] = useState(null);

  const [users, setUsers] = useState([
    {
      id: 'USR-9021',
      name: 'Nguyễn Văn Hùng',
      email: 'hung.nguyen@gmail.com',
      phone: '0912.345.678',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      tier: 'diamond',
      tierLabel: 'Hội Viên Kim Cương',
      spent: 12450000,
      booksOwned: 84,
      ebooksCount: 52,
      physicalCount: 32,
      devicesCount: 4,
      devicesList: [
        { name: 'iPhone 15 Pro Max', type: 'iOS', lastActive: '10 phút trước', id: 'DEV-01' },
        { name: 'iPad Pro 12.9 M2', type: 'iPadOS', lastActive: 'Hôm qua', id: 'DEV-02' },
        { name: 'MacBook Air M3', type: 'macOS', lastActive: '3 ngày trước', id: 'DEV-03' },
        { name: 'Kindle Paperwhite 11th', type: 'E-Reader', lastActive: '5 ngày trước', id: 'DEV-04' }
      ],
      points: 1240,
      joinedDate: '12/01/2024',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9022',
      name: 'Trần Thị Mai Anh',
      email: 'maianh.tran@techcorp.vn',
      phone: '0988.765.432',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      tier: 'gold',
      tierLabel: 'Hội Viên Vàng',
      spent: 8620000,
      booksOwned: 46,
      ebooksCount: 38,
      physicalCount: 8,
      devicesCount: 2,
      devicesList: [
        { name: 'Samsung Galaxy S24 Ultra', type: 'Android', lastActive: '2 giờ trước', id: 'DEV-05' },
        { name: 'Galaxy Tab S9', type: 'Android', lastActive: 'Hôm qua', id: 'DEV-06' }
      ],
      points: 850,
      joinedDate: '05/02/2024',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9023',
      name: 'Lê Hoàng Long',
      email: 'long.le@fintech.co',
      phone: '0903.112.233',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      tier: 'silver',
      tierLabel: 'Hội Viên Bạc',
      spent: 3450000,
      booksOwned: 19,
      ebooksCount: 14,
      physicalCount: 5,
      devicesCount: 2,
      devicesList: [
        { name: 'iPhone 14', type: 'iOS', lastActive: '4 giờ trước', id: 'DEV-07' },
        { name: 'Dell XPS 15', type: 'Windows Web', lastActive: '1 tuần trước', id: 'DEV-08' }
      ],
      points: 320,
      joinedDate: '18/03/2024',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9024',
      name: 'Phạm Quỳnh Nga',
      email: 'quynhnga.pham@outlook.com',
      phone: '0977.889.900',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      tier: 'diamond',
      tierLabel: 'Hội Viên Kim Cương',
      spent: 15800000,
      booksOwned: 112,
      ebooksCount: 90,
      physicalCount: 22,
      devicesCount: 5,
      devicesList: [
        { name: 'iPhone 15 Plus', type: 'iOS', lastActive: 'Vừa xong', id: 'DEV-09' },
        { name: 'Kobo Libra Colour', type: 'E-Reader', lastActive: '30 phút trước', id: 'DEV-10' },
        { name: 'iPad Mini 6', type: 'iPadOS', lastActive: '2 ngày trước', id: 'DEV-11' },
        { name: 'ThinkPad X1 Carbon', type: 'Windows Web', lastActive: '5 ngày trước', id: 'DEV-12' },
        { name: 'Boox Palma', type: 'E-Ink Android', lastActive: '1 tuần trước', id: 'DEV-13' }
      ],
      points: 1590,
      joinedDate: '20/11/2023',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9025',
      name: 'Vũ Quốc Bảo',
      email: 'bao.vu@crypto.io',
      phone: '0933.445.566',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      tier: 'bronze',
      tierLabel: 'Hội Viên Mới',
      spent: 450000,
      booksOwned: 3,
      ebooksCount: 3,
      physicalCount: 0,
      devicesCount: 3,
      devicesList: [
        { name: 'Xiaomi 13 Pro', type: 'Android', lastActive: '1 ngày trước', id: 'DEV-14' },
        { name: 'Asus ROG Ally', type: 'Windows Web', lastActive: '3 ngày trước', id: 'DEV-15' },
        { name: 'Linux Reader App', type: 'Linux', lastActive: '4 ngày trước', id: 'DEV-16' }
      ],
      points: 40,
      joinedDate: '01/06/2026',
      status: 'warning',
      statusLabel: 'Đăng nhập đa IP'
    }
  ]);

  const handleRevokeDevice = (userId, deviceId) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedList = u.devicesList.filter(d => d.id !== deviceId);
        return { ...u, devicesList: updatedList, devicesCount: updatedList.length };
      }
      return u;
    }));
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser(prev => ({
        ...prev,
        devicesList: prev.devicesList.filter(d => d.id !== deviceId),
        devicesCount: prev.devicesCount - 1
      }));
    }
    showToast('Đã thu hồi chứng chỉ DRM trên thiết bị thành công!', 'success');
  };

  const handleToggleLock = (userId) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const newStatus = u.status === 'locked' ? 'active' : 'locked';
        const newLabel = newStatus === 'locked' ? 'Đã khóa tài khoản' : 'Hoạt động tốt';
        return { ...u, status: newStatus, statusLabel: newLabel };
      }
      return u;
    }));
    showToast('Đã cập nhật trạng thái tài khoản bạn đọc!', 'info');
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser(prev => ({
        ...prev,
        status: prev.status === 'locked' ? 'active' : 'locked',
        statusLabel: prev.status === 'locked' ? 'Hoạt động tốt' : 'Đã khóa tài khoản'
      }));
    }
  };

  const handleRewardPoints = (userId) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, points: u.points + 200 };
      }
      return u;
    }));
    showToast('Đã tặng 200 điểm thưởng HukiXu tri ân bạn đọc!', 'success');
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser(prev => ({ ...prev, points: prev.points + 200 }));
    }
  };

  const filteredUsers = users.filter(user => {
    if (activeTab === 'diamond' && user.tier !== 'diamond') return false;
    if (activeTab === 'gold' && user.tier !== 'gold') return false;
    if (activeTab === 'warning' && user.status !== 'warning') return false;
    if (selectedTier !== 'all' && user.tier !== selectedTier) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone.includes(q) ||
        user.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1480px] mx-auto">
      
      {/* 1. TOP HEADER & INTRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Quản Trị Bạn Đọc &amp; Hội Viên</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              28.560 ĐỘC GIẢ TOÀN SÀN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Danh Sách Độc Giả &amp; Quản Lý Bản Quyền Thiết Bị
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Giám sát hạng hội viên VIP, lịch sử đọc sách, cấp phép thiết bị DRM đọc trực tuyến &amp; bảo vệ tài khoản bạn đọc.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => showToast('Đang xuất danh sách độc giả VIP sang định dạng Excel...', 'info')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Xuất Excel Bạn Đọc</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tổng Bạn Đọc Đã Đăng Ký</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">groups</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">28.560</div>
          <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+12.6% tăng trưởng tháng này</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Hội Viên Kim Cương &amp; Vàng</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">diamond</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">4.820 VIP</div>
          <div className="mt-2 text-xs text-amber-700 font-bold flex items-center gap-1">
            <span>Chiếm 62% tổng doanh thu sàn</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Thiết Bị Đọc DRM Đang Kết Nối</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">devices</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">52.140</div>
          <div className="mt-2 text-xs text-purple-700 font-bold flex items-center gap-1">
            <span>Trung bình 1.8 thiết bị / tài khoản</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cảnh Báo Đăng Nhập Lạ</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">security</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">3 Tài Khoản</div>
          <div className="mt-2 text-xs text-rose-600 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            <span>Tự động hạn chế tải Ebook</span>
          </div>
        </div>

      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { key: 'all', label: 'Tất cả độc giả', count: users.length },
            { key: 'diamond', label: 'VIP Kim Cương', count: users.filter(u => u.tier === 'diamond').length },
            { key: 'gold', label: 'VIP Vàng', count: users.filter(u => u.tier === 'gold').length },
            { key: 'warning', label: 'Cần kiểm tra', count: users.filter(u => u.status === 'warning').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Tìm tên, email, số điện thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>

      </div>

      {/* 4. USERS TABLE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Độc Giả</th>
                <th className="py-3.5 px-3">Hạng Hội Viên</th>
                <th className="py-3.5 px-3">Tủ Sách Sở Hữu</th>
                <th className="py-3.5 px-3">Tổng Chi Tiêu</th>
                <th className="py-3.5 px-3">Thiết Bị DRM</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#F9FAFB] transition-colors group">
                  
                  {/* Reader Profile */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-2xs shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 group-hover:text-[#00875A] transition-colors text-[13px]">
                          {user.name}
                        </span>
                        <span className="text-[11px] text-gray-500">{user.email}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{user.phone} · #{user.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      user.tier === 'diamond' ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' :
                      user.tier === 'gold' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      user.tier === 'silver' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {user.tier === 'diamond' ? 'diamond' : user.tier === 'gold' ? 'workspace_premium' : 'military_tech'}
                      </span>
                      {user.tierLabel}
                    </span>
                  </td>

                  {/* Books owned */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{user.booksOwned} cuốn sách</span>
                      <span className="text-[10px] text-gray-500">
                        {user.ebooksCount} Ebook DRM · {user.physicalCount} Sách in
                      </span>
                    </div>
                  </td>

                  {/* Spent */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-[#00875A] text-xs">
                        {user.spent.toLocaleString()}₫
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {user.points} HukiXu tích lũy
                      </span>
                    </div>
                  </td>

                  {/* DRM Devices */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
                        {user.devicesCount} / 5 máy
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      user.status === 'active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      user.status === 'warning' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        user.status === 'active' ? 'bg-emerald-500' :
                        user.status === 'warning' ? 'bg-rose-500 animate-pulse' : 'bg-gray-400'
                      }`}></span>
                      {user.statusLabel}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setInspectingUser(user)}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#00875A] hover:text-white text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Chi Tiết
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. USER INSPECTOR DRAWER */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setInspectingUser(null)}
          ></div>

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="px-6 py-5 bg-[#F8FAFC] border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={inspectingUser.avatar}
                    alt={inspectingUser.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500"
                  />
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{inspectingUser.name}</h2>
                    <span className="text-xs text-gray-500 font-mono">{inspectingUser.email} · {inspectingUser.tierLabel}</span>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingUser(null)}
                  className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700">
                
                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Tổng Chi Tiêu</span>
                    <span className="font-extrabold text-sm text-[#00875A]">{inspectingUser.spent.toLocaleString()}₫</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Tủ Sách</span>
                    <span className="font-extrabold text-sm text-gray-900">{inspectingUser.booksOwned} cuốn</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Điểm HukiXu</span>
                    <span className="font-extrabold text-sm text-amber-600">{inspectingUser.points} xu</span>
                  </div>
                </div>

                {/* DRM Linked Devices List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-purple-600">devices</span>
                      Thiết Bị Đọc DRM Đã Cấp Quyền ({inspectingUser.devicesList.length}/5)
                    </h4>
                  </div>
                  
                  <div className="space-y-2.5">
                    {inspectingUser.devicesList.map((device) => (
                      <div key={device.id} className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-[18px]">
                              {device.type.includes('iOS') || device.type.includes('Android') ? 'smartphone' : 'laptop'}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{device.name}</div>
                            <span className="text-[10px] text-gray-400">
                              HĐH: {device.type} · Hoạt động: {device.lastActive}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeDevice(inspectingUser.id, device.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors cursor-pointer border border-rose-200"
                          title="Hủy liên kết thiết bị để bạn đọc đổi máy mới"
                        >
                          Thu Hồi DRM
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="font-bold text-gray-900 mb-2">Thao Tác Quản Trị Bạn Đọc:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRewardPoints(inspectingUser.id)}
                      className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">stars</span>
                      <span>Thưởng +200 HukiXu</span>
                    </button>
                    <button
                      onClick={() => handleToggleLock(inspectingUser.id)}
                      className={`px-3 py-2 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 ${
                        inspectingUser.status === 'locked'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {inspectingUser.status === 'locked' ? 'lock_open' : 'lock'}
                      </span>
                      <span>{inspectingUser.status === 'locked' ? 'Mở Khóa Tài Khoản' : 'Khóa Tạm Thời'}</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
