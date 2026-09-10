import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('HUKI render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-dvh bg-background px-4 py-16 flex items-center justify-center">
        <section className="max-w-lg rounded-2xl border border-outline-variant bg-white p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-error" aria-hidden="true">error</span>
          <h1 className="mt-4 font-editorial text-3xl font-bold text-on-surface">Trang gặp sự cố</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Dữ liệu của bạn vẫn được giữ lại. Hãy tải lại trang để tiếp tục.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white">
            Tải lại trang
          </button>
        </section>
      </main>
    );
  }
}
