import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function UserAddressesPage() {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addresses, setAddresses] = useState(() => {
    try {
      const saved = window.localStorage.getItem('huki.user.addresses');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'Nhà riêng',
    city: 'Hà Nội',
    district: 'Quận Đống Đa',
    ward: 'Phường Ô Chợ Dừa',
    street: '',
    isDefault: false
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('huki.user.addresses', JSON.stringify(addresses));
    } catch {
      // Fallback
    }
  }, [addresses]);

  const handleSetDefault = (id) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
    showToast('Đã đặt làm địa chỉ giao sách mặc định!', 'success');
  };

  const handleDelete = (id) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast('Đã xóa địa chỉ thành công!', 'info');
  };

  const handleSaveNewAddress = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.street) {
      showToast('Vui lòng điền đầy đủ thông tin địa chỉ!', 'error');
      return;
    }

    const newAddr = {
      id: Date.now(),
      name: formData.name,
      phone: formData.phone,
      type: formData.type,
      address: `${formData.street}, ${formData.ward}, ${formData.district}, ${formData.city}`,
      isDefault: formData.isDefault || addresses.length === 0
    };

    if (newAddr.isDefault) {
      setAddresses([newAddr, ...addresses.map(a => ({ ...a, isDefault: false }))]);
    } else {
      setAddresses([...addresses, newAddr]);
    }

    setFormData({
      name: '',
      phone: '',
      type: 'Nhà riêng',
      city: 'Hà Nội',
      district: 'Quận Đống Đa',
      ward: 'Phường Ô Chợ Dừa',
      street: '',
      isDefault: false
    });
    setShowAddModal(false);
    showToast('Đã thêm địa chỉ nhận sách mới!', 'success');
  };

  return (
    <div className="w-full min-h-screen bg-theme-bg text-on-surface py-6 md:py-10 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6">
          <Link to="/profile" className="hover:text-theme-primary font-medium">Tài Khoản</Link>
          <span>/</span>
          <Link to="/settings/security" className="hover:text-theme-primary font-medium">Cài Đặt</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Sổ Địa Chỉ Giao Hàng</span>
        </div>

        {/* Header Bar */}
        <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
              Sổ Địa Chỉ Nhận Sách In
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Quản lý các địa chỉ giao nhận cho đơn hàng Sách Giấy và Combo Hybrid
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-theme-primary text-white px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm hover:bg-theme-primary-hover transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add_location_alt</span>
            <span>Thêm Địa Chỉ Mới</span>
          </button>
        </div>

        {/* Address Cards List */}
        <div className="space-y-4">
          {addresses.length === 0 ? (
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-10 sm:p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-theme-primary/10 text-theme-primary flex items-center justify-center mx-auto mb-3.5">
                <span className="material-symbols-outlined text-3xl">location_off</span>
              </div>
              <h3 className="font-editorial text-lg font-bold text-on-surface mb-1">
                Chưa Có Địa Chỉ Giao Hàng Nào
              </h3>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                Thêm địa chỉ nhà riêng hoặc cơ quan của bạn để nhận các ấn phẩm Sách Giấy và Combo Hybrid được giao tận tay nhanh chóng.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-theme-primary text-white px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm hover:bg-theme-primary-hover transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add_location_alt</span>
                <span>Thêm Địa Chỉ Đầu Tiên</span>
              </button>
            </div>
          ) : (
            addresses.map((addr) => (
              <div
                key={addr.id}
                className={`bg-theme-surface rounded-3xl border p-6 sm:p-8 transition-all relative ${
                  addr.isDefault
                    ? 'border-theme-primary ring-2 ring-theme-primary/10 shadow-sm'
                    : 'border-theme-border hover:border-gray-400'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-base text-on-surface">{addr.name}</span>
                      <span className="text-xs text-on-surface-variant">({addr.phone})</span>
                      <span className="text-[10px] bg-theme-secondary-subtle text-theme-secondary border border-theme-border px-2 py-0.5 rounded-md font-bold">
                        {addr.type}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] bg-theme-primary text-white px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs">check</span>
                          Mặc Định
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-base text-on-surface-variant mt-0.5 shrink-0">
                        location_on
                      </span>
                      <span>{addr.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="px-3 py-1.5 rounded-xl bg-theme-bg hover:bg-theme-secondary-subtle text-theme-primary border border-theme-border text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Đặt Mặc Định
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="p-2 rounded-xl text-theme-accent hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Xóa địa chỉ"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Address Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-theme-surface rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-theme-border">
              <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-4">
                <h3 className="font-editorial text-xl font-bold text-on-surface">
                  Thêm Địa Chỉ Giao Hàng Mới
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-on-surface-variant hover:text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveNewAddress} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Họ và tên người nhận *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-on-surface focus:outline-none focus:border-theme-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      placeholder="0912..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-on-surface focus:outline-none focus:border-theme-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Tỉnh / TP *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-on-surface text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Quận / Huyện *</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-on-surface text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Phường / Xã *</label>
                    <input
                      type="text"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-on-surface text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface mb-1">Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Số 123 Đường Nguyễn Huệ..."
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-on-surface focus:outline-none focus:border-theme-primary"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="addrType"
                        checked={formData.type === 'Nhà riêng'}
                        onChange={() => setFormData({ ...formData, type: 'Nhà riêng' })}
                      />
                      <span>Nhà riêng</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="addrType"
                        checked={formData.type === 'Văn phòng'}
                        onChange={() => setFormData({ ...formData, type: 'Văn phòng' })}
                      />
                      <span>Văn phòng</span>
                    </label>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded text-theme-primary"
                    />
                    <span className="text-xs text-on-surface-variant font-medium">Đặt làm mặc định</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-theme-bg hover:bg-theme-surface-subtle border border-theme-border text-on-surface font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-theme-primary text-white font-bold text-xs hover:bg-theme-primary-hover transition-colors shadow-xs cursor-pointer"
                  >
                    Lưu Địa Chỉ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
