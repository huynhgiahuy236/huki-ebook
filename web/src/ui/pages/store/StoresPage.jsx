import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';

export default function StoresPage() {
  const [params, setParams] = useSearchParams();
  const [stores, setStores] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await businessApi.getPublicStores({ page, limit: 12, search: search || undefined });
    if (res.success) {
      setStores(res.data || []);
      setMeta({ total: res.meta?.total || 0, totalPages: res.meta?.totalPages || 1 });
    } else {
      setError(res.error?.message || 'Không thể tải danh sách cửa hàng.');
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <main id="main-content" className="min-h-screen bg-[#f7faf8] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-[#003b2b] p-7 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Đối tác đã xác minh</p>
          <h1 className="mt-2 font-editorial text-4xl font-bold">Gian hàng sách chính hãng</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80">Chỉ hiển thị cửa hàng đang hoạt động, thuộc doanh nghiệp và cửa hàng đều đã được HUKI phê duyệt.</p>
          <label className="relative mt-6 block max-w-xl"><span className="sr-only">Tìm cửa hàng</span><span className="material-symbols-outlined absolute left-4 top-3 text-slate-500">search</span><input defaultValue={search} onKeyDown={(event) => { if (event.key === 'Enter') update('q', event.currentTarget.value.trim()); }} placeholder="Tìm theo tên cửa hàng…" className="h-12 w-full rounded-xl bg-white pl-12 pr-4 text-sm text-slate-900 outline-none" /></label>
        </header>

        <div className="mt-7 flex items-center justify-between"><h2 className="font-editorial text-2xl font-bold">{meta.total} cửa hàng</h2>{search && <button onClick={() => update('q', '')} className="text-sm font-bold text-primary">Xóa tìm kiếm</button>}</div>
        {loading ? <StoreState icon="progress_activity" title="Đang tải cửa hàng…" spinning />
          : error ? <StoreState icon="error" title="Không thể tải cửa hàng" description={error} action={load} />
          : stores.length === 0 ? <StoreState icon="storefront" title="Chưa tìm thấy cửa hàng" description="Hãy thử từ khóa khác." />
          : <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{stores.map((store) => <StoreCard key={store.id} store={store} />)}</section>}

        {!loading && !error && meta.totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang cửa hàng"><button disabled={page <= 1} onClick={() => update('page', String(page - 1))} className="min-h-11 rounded-xl border border-outline-variant bg-white px-4 text-sm font-bold disabled:opacity-40">Trang trước</button><span className="text-sm">{page}/{meta.totalPages}</span><button disabled={page >= meta.totalPages} onClick={() => update('page', String(page + 1))} className="min-h-11 rounded-xl border border-outline-variant bg-white px-4 text-sm font-bold disabled:opacity-40">Trang sau</button></nav>}
      </div>
    </main>
  );
}

function StoreCard({ store }) {
  return <article className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="h-32 bg-[#dff4ec]">{store.banner ? <img src={store.banner} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><span className="material-symbols-outlined text-5xl text-primary/40">storefront</span></div>}</div><div className="p-5"><div className="flex items-center gap-3">{store.logo ? <img src={store.logo} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-black text-white">{store.name.slice(0, 1).toUpperCase()}</span>}<div><h2 className="font-editorial text-xl font-bold">{store.name}</h2><span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><span className="material-symbols-outlined text-sm">verified</span>Đã xác minh</span></div></div><p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-on-surface-variant">{store.description || 'Gian hàng sách chính hãng trên HUKI.'}</p><Link to={`/stores/${store.slug}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">Xem gian hàng</Link></div></article>;
}

function StoreState({ icon, title, description, action, spinning = false }) {
  return <section className="mt-6 rounded-2xl border border-outline-variant bg-white p-12 text-center" role="status"><span className={`material-symbols-outlined text-5xl text-primary ${spinning ? 'animate-spin' : ''}`}>{icon}</span><h2 className="mt-3 font-editorial text-2xl font-bold">{title}</h2>{description && <p className="mt-2 text-sm text-on-surface-variant">{description}</p>}{action && <button onClick={action} className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Thử lại</button>}</section>;
}
