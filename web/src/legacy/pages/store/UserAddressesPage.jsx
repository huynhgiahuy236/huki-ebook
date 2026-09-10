import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function UserAddressesPage() {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      name: 'Nguyễn Văn An',
      phone: '0912 345 678',
      type: 'Nhà riêng',
      address: 'Số 18, Ngõ 42, Đường Hoàng Cầu, Phường Ô Chợ Dừa, Quận Đống Đa, Hà Nội',
      isDefault: true
    },
    {
      id: 2,
      name: 'Nguyễn Văn An (Văn phòng Cty)',
      phone: '0988 123 456',
      type: 'Văn phòng',
      address: 'Tầng 12, Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
      isDefault: false
    }
  ]);

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
      isDefault: formData.isDefault
    };

    if (formData.isDefault) {
      setAddresses([newAddr, ...addresses.map(a => ({ ...a, isDefault: false }))]);
    } else {
      setAddresses([...addresses, newAddr]);
    }

    setShowAddModal(false);
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
    showToast('Đã thêm địa chỉ giao nhận mới!', 'success');
  };

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6">
          <Link to="/profile" className="hover:text-theme-primary font-medium">Tài Khoản</Link>
          <span>/</span>
          <Link to="/settings" className="hover:text-theme-primary font-medium">Cài Đặt</Link>
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
            className="bg-theme-primary text-white px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm hover:bg-theme-primary-hover transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-base">add_location_alt</span>
            <span>Thêm Địa Chỉ Mới</span>
          </button>
        </div>

        {/* Address Cards List */}
        <div className="space-y-4">
          {addresses.map((addr) => (
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
                      className="px-3 py-1.5 rounded-xl bg-theme-bg hover:bg-theme-secondary-subtle text-theme-primary border border-theme-border text-xs font-semibold transition-colors"
                    >
                      Đặt Mặc Định
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-2 rounded-xl text-theme-accent hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Xóa địa chỉ"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Address Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-theme-surface rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-theme-border">
              <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-4">
                <h3 className="font-editorial text-xl font-bold text-on-surface">
                  Thêm Địa Chỉ Giao Hàng Mới
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveNewAddress} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Họ tên người nhận *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nguyễn Văn An"
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface outline-none focus:border-theme-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0912 345 678"
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface outline-none focus:border-theme-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Tỉnh / Thành</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl p-2 text-xs text-on-surface outline-none"
                    >
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Quận / Huyện</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl p-2 text-xs text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Phường / Xã</label>
                    <input
                      type="text"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl p-2 text-xs text-on-surface outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Địa chỉ chi tiết (Số nhà, Tên đường) *</label>
                  <input
                    type="text"
                    required
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Số 18, Ngõ 42, Đường Hoàng Cầu"
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface outline-none focus:border-theme-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded text-theme-primary"
                    />
                    <span>Đặt làm địa chỉ nhận hàng mặc định</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl border border-theme-border text-xs font-bold text-on-surface-variant"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="bg-theme-primary text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-theme-primary-hover"
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
