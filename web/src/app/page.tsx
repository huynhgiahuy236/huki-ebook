const foundations = [
  ["01", "Foundation", "Project structure, design system và API client", "Đang bắt đầu"],
  ["02", "Identity", "Login, register, profile và session", "Kế tiếp"],
  ["03", "Catalog", "Home, search, books, stores và taxonomy", "Đã lên kế hoạch"],
  ["04", "Commerce MVP", "Cart, address, shipping fee và COD checkout", "Đã lên kế hoạch"],
] as const;

const commands = [
  "cd E:\\HuKi\\web",
  "npm run dev",
  "Mở http://localhost:3100",
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f5e9d5,_#f7f4ed_42%,_#e9f0e8)] px-5 py-8 text-stone-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-stone-200/80 bg-white/80 p-7 shadow-[0_20px_70px_-35px_rgba(67,48,32,0.35)] backdrop-blur sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-900 text-lg font-bold text-amber-100">H</span>
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-emerald-900">HUKI EBOOK</p>
                <p className="text-sm text-stone-500">Web workspace · Phase 01</p>
              </div>
            </div>
            <span className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">🔴 0 / 90 screens verified</span>
          </div>

          <div className="max-w-3xl space-y-4 pt-5">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-700">Điểm bắt đầu</p>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">Không còn là folder trống. Bắt đầu từ Foundation.</h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              Backend chạy ở port 3000, web chạy ở port 3100. Việc đầu tiên là hoàn thiện API client và auth proof-of-concept trước khi triển khai 90 màn hình.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2" aria-labelledby="roadmap-title">
          <h2 id="roadmap-title" className="sr-only">Roadmap gần nhất</h2>
          {foundations.map(([number, title, description, status]) => (
            <article key={number} className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-sm font-bold text-amber-700">{number}</span>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">{status}</span>
              </div>
              <h3 className="mt-7 text-2xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 leading-6 text-stone-600">{description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="rounded-3xl bg-emerald-950 p-7 text-emerald-50 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Chạy dự án</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/25 font-mono text-sm">
              {commands.map((command, index) => (
                <div key={command} className="flex gap-4 border-b border-white/10 px-5 py-4 last:border-b-0">
                  <span className="text-emerald-400">{index === 2 ? "→" : "$"}</span>
                  <code>{command}</code>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-7 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Nguồn làm việc</p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-stone-700">
              <li><strong>90 screens:</strong> <code>task/web/screens/SCREEN-INVENTORY.md</code></li>
              <li><strong>Screen template:</strong> <code>task/web/screens/SCREEN-TEMPLATE.md</code></li>
              <li><strong>Backend Swagger:</strong> <code>localhost:3000/api/docs</code></li>
              <li><strong>Code web:</strong> <code>web/src</code></li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
