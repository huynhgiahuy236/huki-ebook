import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function OrderReturnPage() {
  const { id = 'HUKI-8892401' } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedItems, setSelectedItems] = useState({ 'atomic-habits': true });
  const [quantities, setQuantities] = useState({ 'atomic-habits': 1, 'psychology-money': 1 });
  const [reason, setReason] = useState('defect-printing');
  const [resolution, setResolution] = useState('replace-new');
  const [additionalNote, setAdditionalNote] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([
    { id: 1, name: 'anh_gay_sach_rach_1.jpg', size: '2.4 MB' },
    { id: 2, name: 'video_unbox_kiem_tra.mp4', size: '14.8 MB' }
  ]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const toggleItem = (itemId) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newFiles = files.map((f, i) => ({
        id: Date.now() + i,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
      showToast(`Đã tải lên ${files.length} tệp bằng chứng!`, 'success');
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    showToast('Đã xóa tệp đính kèm.', 'info');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasAnySelected = Object.values(selectedItems).some(Boolean);
    if (!hasAnySelected) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm sách cần đổi trả!', 'error');
      return;
    }
    setShowSuccessModal(true);
  };

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumbs */}
      <nav className="text-body-sm text-on-surface-variant flex items-center gap-2 mb-6">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/orders" className="hover:text-primary transition-colors">Lịch sử đơn hàng</Link>
        <span>/</span>
        <Link to={`/orders/${id}`} className="hover:text-primary transition-colors">Đơn hàng #{id}</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">Yêu Cầu Đổi Trả Sách In</span>
      </nav>

      {/* Title Header Card */}
      <div className="bg-theme-surface p-6 sm:p-8 rounded-3xl border border-theme-border shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
              Yêu Cầu Đổi Trả & Bảo Hành Sách In
            </h1>
            <span className="bg-[#fea619]/20 text-[#855300] px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              Đơn hàng #{id}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Hoàn tất biểu mẫu bên dưới để kích hoạt quy trình đổi trả hoặc bảo hành miễn phí 100%.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-theme-bg px-4 py-3 rounded-2xl border border-theme-border shrink-0">
          <span className="material-symbols-outlined text-[#ac2c19] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
          <div>
            <p className="text-[11px] text-on-surface-variant uppercase font-semibold">Thời hạn đổi trả</p>
            <p className="text-sm font-bold text-[#ac2c19]">Còn 6 ngày trong hạn 7 ngày</p>
          </div>
        </div>
      </div>

      {/* 7-Day Guarantee Assurance Banner */}
      <div className="bg-theme-secondary-subtle/50 border border-theme-border p-5 rounded-3xl mb-8 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-theme-secondary text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
        </div>
        <div>
          <h3 className="font-bold text-sm sm:text-base text-theme-primary mb-1">Chính Sách Đổi Trả 7 Ngày Miễn Phí Từ HUKI</h3>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Quý khách được quyền đổi trả hoàn toàn miễn phí trong vòng 7 ngày kể từ khi nhận hàng đối với các sự cố về vận chuyển, lỗi in ấn từ nhà xuất bản, thiếu trang hoặc rách gáy sách. Nhân viên bưu tá sẽ đến tận nhà thu hồi sách cũ và trao sách mới nguyên seal 0đ chi phí.
          </p>
        </div>
      </div>

      {/* Step-by-Step Interactive Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Select Items */}
        <div className="bg-theme-surface border border-theme-border p-6 sm:p-8 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme-border">
            <div className="w-8 h-8 rounded-full bg-theme-primary text-white flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <h2 className="font-bold text-base text-on-surface">Chọn sản phẩm cần đổi trả</h2>
              <p className="text-xs text-on-surface-variant">Chọn sản phẩm sách trong đơn hàng #{id} cần yêu cầu đổi mới hoặc hoàn tiền</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Item 1 */}
            <div
              onClick={() => toggleItem('atomic-habits')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer ${
                selectedItems['atomic-habits'] ? 'border-theme-primary bg-theme-secondary-subtle/40' : 'border-theme-border bg-theme-surface'
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={!!selectedItems['atomic-habits']}
                  onChange={() => {}}
                  className="w-5 h-5 text-theme-primary rounded border-slate-300 focus:ring-theme-primary"
                />
                <img
                  className="w-16 h-22 object-cover rounded-xl shadow-sm shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjgnwa9G3UcVqohHuu1ky9tGqqJaffDqENIcbnvbC4V33nXAN1RzXK7Infa5ig737CMNvJKpKbHxlGbnf3XMJix08LNjSVTkIjgsxwLgd6uSps5RzGkLczuULkinxoH_ey7coA1DnldeLUGG3ukev7R3FZaugpryH9VAvys10Il-8M0pk-q1fyN5ZiMXarjiRWn4dokVSirk_wdiZOqubfbC8Rey2_o4SyHyPrIDlrP2vAaptd6TudTg"
                  alt="Atomic Habits"
                />
                <div>
                  <span className="bg-[#ac2c19]/10 text-[#ac2c19] text-[10px] font-bold px-2 py-0.5 rounded mr-2">Sách In Giấy</span>
                  <h4 className="font-semibold text-sm text-on-surface">Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ</h4>
                  <p className="text-xs text-on-surface-variant">Tác giả: James Clear • Alpha Books Official</p>
                  <p className="text-sm font-bold text-[#ac2c19] mt-1">129.000đ</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-center text-xs" onClick={(e) => e.stopPropagation()}>
                <label className="text-on-surface-variant font-medium">Số lượng:</label>
                <select
                  value={quantities['atomic-habits']}
                  onChange={(e) => setQuantities(prev => ({ ...prev, 'atomic-habits': Number(e.target.value) }))}
                  className="bg-theme-surface border border-theme-border rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  <option value={1}>1 cuốn</option>
                  <option value={2}>2 cuốn</option>
                </select>
              </div>
            </div>

            {/* Item 2 */}
            <div
              onClick={() => toggleItem('psychology-money')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer ${
                selectedItems['psychology-money'] ? 'border-theme-primary bg-theme-secondary-subtle/40' : 'border-theme-border bg-theme-surface'
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={!!selectedItems['psychology-money']}
                  onChange={() => {}}
                  className="w-5 h-5 text-theme-primary rounded border-slate-300 focus:ring-theme-primary"
                />
                <img
                  className="w-16 h-22 object-cover rounded-xl shadow-sm shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPtM4fEF50qiA3LJT6VRKZ4N7fTPN6jOoxh2ryBnzedt5FA5_VTRim9wYpzGX1LBNImhplf6XFrSgwnvdVFanZ2TEFWln9kRUk0j0FDd54xHUJJql6Lw3bHytmH2n_PbDCsDtu9_o0sUCgc9ZNUl--xR6TmfF825RDGooi07RHZ-74OyLPkpqUkrYgxkbp054QNKTO5hp82EqWyeC1yqcp0rOHERKeBFh7vHjCmZu9qxm5Dvs0BJkEaw"
                  alt="Psychology of Money"
                />
                <div>
                  <span className="bg-[#ac2c19]/10 text-[#ac2c19] text-[10px] font-bold px-2 py-0.5 rounded mr-2">Sách In Giấy</span>
                  <h4 className="font-semibold text-sm text-on-surface">Tâm Lý Học Về Tiền (The Psychology of Money)</h4>
                  <p className="text-xs text-on-surface-variant">Tác giả: Morgan Housel • 1980 Books</p>
                  <p className="text-sm font-bold text-[#ac2c19] mt-1">135.000đ</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-center text-xs" onClick={(e) => e.stopPropagation()}>
                <label className="text-on-surface-variant font-medium">Số lượng:</label>
                <select
                  value={quantities['psychology-money']}
                  onChange={(e) => setQuantities(prev => ({ ...prev, 'psychology-money': Number(e.target.value) }))}
                  className="bg-theme-surface border border-theme-border rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  <option value={1}>1 cuốn</option>
                  <option value={2}>2 cuốn</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Reason for return */}
        <div className="bg-theme-surface border border-theme-border p-6 sm:p-8 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme-border">
            <div className="w-8 h-8 rounded-full bg-theme-primary text-white flex items-center justify-center font-bold text-sm">2</div>
            <div>
              <h2 className="font-bold text-base text-on-surface">Lý do đổi trả & bảo hành</h2>
              <p className="text-xs text-on-surface-variant">Chọn lý do chính xác để chúng tôi xử lý nhanh nhất trong 2 giờ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'defect-printing', title: 'Lỗi in ấn từ NXB (Thiếu trang, mờ chữ, ngược trang)' },
              { id: 'defect-shipping', title: 'Hư hại do vận chuyển (Rách bìa, móp gáy, gãy góc)' },
              { id: 'wrong-item', title: 'Giao sai tựa sách hoặc sai ấn bản' },
              { id: 'seal-broken', title: 'Sách bị bóc màng co seal hoặc đã qua sử dụng' },
              { id: 'other', title: 'Lý do khác (Vui lòng ghi chú chi tiết bên dưới)' }
            ].map(r => (
              <label
                key={r.id}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  reason === r.id ? 'border-theme-primary bg-theme-secondary-subtle/40' : 'border-theme-border hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="mt-0.5 text-theme-primary focus:ring-theme-primary"
                />
                <span className="text-xs sm:text-sm font-medium text-on-surface">{r.title}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Ghi chú chi tiết cho NXB:</label>
            <textarea
              rows={3}
              value={additionalNote}
              onChange={(e) => setAdditionalNote(e.target.value)}
              placeholder="Mô tả cụ thể vị trí lỗi (ví dụ: Trang 45-56 bị mất chữ, góc gáy sách bị rách khi nhận bưu phẩm)..."
              className="w-full p-3 rounded-2xl border border-theme-border text-xs sm:text-sm focus:outline-none focus:border-theme-primary"
            ></textarea>
          </div>
        </div>

        {/* Step 3: Evidence Upload */}
        <div className="bg-theme-surface border border-theme-border p-6 sm:p-8 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme-border">
            <div className="w-8 h-8 rounded-full bg-theme-primary text-white flex items-center justify-center font-bold text-sm">3</div>
            <div>
              <h2 className="font-bold text-base text-on-surface">Hình ảnh / Video bằng chứng sự cố</h2>
              <p className="text-xs text-on-surface-variant">Tải lên tối thiểu 1 hình ảnh hoặc video mở hộp để được duyệt tự động</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-theme-primary/40 rounded-3xl p-6 text-center bg-theme-secondary-subtle/20 hover:bg-theme-secondary-subtle/40 transition-colors relative cursor-pointer mb-4">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <span className="material-symbols-outlined text-4xl text-theme-secondary mb-2">cloud_upload</span>
            <p className="font-bold text-sm text-on-surface">Kéo thả hình ảnh hoặc Bấm để tải lên</p>
            <p className="text-xs text-on-surface-variant mt-1">Hỗ trợ JPG, PNG, MP4 (Tối đa 25MB mỗi tệp)</p>
          </div>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uploadedFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded-2xl text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-theme-secondary">image</span>
                    <span className="font-medium text-on-surface truncate">{file.name}</span>
                    <span className="text-on-surface-variant">({file.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition-colors ml-2"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 4: Resolution Preference */}
        <div className="bg-theme-surface border border-theme-border p-6 sm:p-8 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme-border">
            <div className="w-8 h-8 rounded-full bg-theme-primary text-white flex items-center justify-center font-bold text-sm">4</div>
            <div>
              <h2 className="font-bold text-base text-on-surface">Phương thức giải quyết mong muốn</h2>
              <p className="text-xs text-on-surface-variant">Lựa chọn cách bạn muốn Huki xử lý bồi hoàn</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'replace-new',
                title: 'Đổi Cuốn Sách Mới 100%',
                desc: 'Bưu tá giao sách mới tận nhà và thu hồi cuốn cũ đồng thời 0đ phí.',
                badge: 'Khuyên dùng'
              },
              {
                id: 'refund-wallet',
                title: 'Hoàn Tiền Vào Ví Xu Huki',
                desc: 'Nhận xu ngay sau 5 phút + Tặng thêm Voucher giảm 10% đơn kế tiếp.',
                badge: 'Nhanh nhất'
              },
              {
                id: 'refund-bank',
                title: 'Hoàn Về Tài Khoản Ngân Hàng',
                desc: 'Chuyển khoản hoàn tiền lại thẻ thanh toán gốc trong 24-48 giờ làm việc.',
                badge: 'Tự động'
              }
            ].map(method => (
              <label
                key={method.id}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  resolution === method.id ? 'border-theme-primary bg-theme-secondary-subtle/40' : 'border-theme-border hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="radio"
                      name="resolution"
                      checked={resolution === method.id}
                      onChange={() => setResolution(method.id)}
                      className="text-theme-primary focus:ring-theme-primary"
                    />
                    <span className="bg-theme-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {method.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface mb-1">{method.title}</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{method.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit & Cancel Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            to={`/orders/${id}`}
            className="px-6 py-3 rounded-2xl border border-theme-border hover:bg-theme-bg text-sm font-semibold text-on-surface transition-colors"
          >
            Hủy Bỏ
          </Link>
          <button
            type="submit"
            className="px-8 py-3.5 bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
            Gửi Yêu Cầu Đổi Trả Bảo Hành
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-theme-surface rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-4 shadow-2xl border border-theme-border">
            <div className="w-16 h-16 rounded-full bg-theme-secondary-subtle text-theme-secondary flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3 className="font-editorial text-2xl font-bold text-on-surface">Đã Tiếp Nhận Yêu Cầu!</h3>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Mã yêu cầu <strong>#RMA-8892401</strong> đã được gửi tới Alpha Books Official Store. Đội ngũ kiểm duyệt sẽ xử lý và liên hệ bạn trong vòng 2 giờ.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigate(`/orders/${id}`)}
                className="w-full py-3 bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                Quay Lại Chi Tiết Đơn Hàng
              </button>
              <Link
                to="/seller/chat"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-on-surface font-semibold text-xs rounded-xl transition-colors"
              >
                Chat Trực Tiếp Với NXB
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
