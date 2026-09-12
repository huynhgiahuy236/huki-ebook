import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const initialForm = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  address: '',
  description: '',
};

const statusLabels = {
  PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Bị từ chối',
  SUSPENDED: 'Tạm ngưng',
  CLOSED: 'Đã đóng',
};

export default function SellerStoresPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();
  const businessId = user?.business?.id || activeBusinessId;
  const creating = location.pathname.endsWith('/new');
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError('');
    let currentBizId = businessId;
    if (!currentBizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          currentBizId = myBiz.data.id;
          setActiveBusinessId(currentBizId);
        }
      } catch (err) {
        console.warn('Could not auto-fetch businessId', err);
      }
    }

    if (!currentBizId) {
      setError('Bạn chưa đăng ký doanh nghiệp hoặc hồ sơ chưa được kích hoạt.');
      setLoading(false);
      return;
    }

    const res = await businessApi.getMyStores(currentBizId);
    if (res.success) {
      setStores(res.data || []);
      setActiveBusinessId(currentBizId);
    } else {
      setError(res.error?.message || 'Không thể tải danh sách cửa hàng.');
    }
    setLoading(false);
  }, [businessId, setActiveBusinessId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const updateName = (name) => {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm((current) => ({ ...current, name, slug }));
  };

  const submit = async (event) => {
    event.preventDefault();
    let currentBizId = businessId || activeBusinessId;
    if (!currentBizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          currentBizId = myBiz.data.id;
          setActiveBusinessId(currentBizId);
        }
      } catch {
        // fallback
      }
    }
    if (!currentBizId) {
      showToast('Không xác định được doanh nghiệp của bạn.', 'error');
      return;
    }
    setSubmitting(true);
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value.trim()),
    );
    const res = await businessApi.createStore(currentBizId, payload);
    setSubmitting(false);
    if (!res.success) {
      showToast(res.error?.message || 'Tạo cửa hàng không thành công.', 'error');
      return;
    }
    showToast('Đã gửi cửa hàng để Admin HUKI phê duyệt.', 'success');
    setForm(initialForm);
    navigate('/seller/stores', { replace: true });
    await loadStores();
  };

  if (loading) return <StateCard icon="progress_activity" title="Đang tải cửa hàng…" spinning />;
  if (error) return <StateCard icon="error" title="Không thể tải cửa hàng" description={error} action={loadStores} />;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-outline-variant pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-tertiary">Kênh người bán</p>
          <h1 className="mt-2 font-editorial text-3xl font-bold text-on-surface">Cửa hàng của doanh nghiệp</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Cửa hàng mới chỉ xuất hiện trên sàn sau khi được Admin phê duyệt.</p>
        </div>
        {!creating && (
          <Link to="/seller/stores/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:opacity-90">
            Tạo cửa hàng
          </Link>
        )}
      </header>

      {creating ? (
        <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-outline-variant bg-white p-6 shadow-sm sm:grid-cols-2">
          <Field label="Tên cửa hàng" required value={form.name} onChange={updateName} />
          <Field label="Đường dẫn (slug)" required value={form.slug} onChange={(slug) => setForm({ ...form, slug })} pattern="[a-z0-9-]+" />
          <Field label="Email liên hệ" required type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <Field label="Số điện thoại" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          <Field label="Địa chỉ" value={form.address} onChange={(address) => setForm({ ...form, address })} className="sm:col-span-2" />
          <label className="sm:col-span-2 text-sm font-semibold text-on-surface">
            Mô tả
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-4 py-3 font-normal outline-none focus:border-primary" />
          </label>
          <div className="sm:col-span-2 flex flex-wrap justify-end gap-3">
            <Link to="/seller/stores" className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold">Hủy</Link>
            <button disabled={submitting} className="min-h-11 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? 'Đang gửi…' : 'Gửi phê duyệt'}
            </button>
          </div>
        </form>
      ) : stores.length === 0 ? (
        <StateCard icon="storefront" title="Chưa có cửa hàng" description="Tạo cửa hàng đầu tiên để bắt đầu đưa sách lên HUKI." action={() => navigate('/seller/stores/new')} actionLabel="Tạo cửa hàng" />
      ) : (
        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {stores.map((store) => (
            <article key={store.id} className="rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-editorial text-xl font-bold text-on-surface">{store.name}</h2>
                  <p className="mt-1 text-xs text-on-surface-variant">/{store.slug}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${store.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {statusLabels[store.status] || store.status}
                </span>
              </div>
              <p className="mt-4 min-h-10 text-sm leading-6 text-on-surface-variant">{store.description || 'Chưa có mô tả cửa hàng.'}</p>
              {store.status === 'APPROVED' && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/seller/product/create-ebook" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">Thêm sách</Link>
                  <Link to={`/stores/${store.slug}`} className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold">Xem trên sàn</Link>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Field({ label, value, onChange, className = '', ...props }) {
  return (
    <label className={`text-sm font-semibold text-on-surface ${className}`}>
      {label}
      <input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-outline-variant bg-white px-4 font-normal outline-none focus:border-primary" />
    </label>
  );
}

function StateCard({ icon, title, description, action, actionLabel = 'Thử lại', spinning = false }) {
  return (
    <section className="mx-auto my-16 w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-outline-variant bg-white p-8 text-center shadow-sm" role="status">
      <span className={`material-symbols-outlined text-5xl text-primary ${spinning ? 'animate-spin' : ''}`} aria-hidden="true">{icon}</span>
      <h1 className="mt-4 font-editorial text-2xl font-bold">{title}</h1>
      {description && <p className="mt-2 text-sm text-on-surface-variant">{description}</p>}
      {action && <button type="button" onClick={action} className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">{actionLabel}</button>}
    </section>
  );
}
