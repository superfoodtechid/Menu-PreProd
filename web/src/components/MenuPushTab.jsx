export default function MenuPushTab() {
  return (
    <main className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <section className="surface-card min-w-0 h-fit p-6 xl:col-span-2">
        <div className="border-b border-red-100 pb-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-red-600">Dalam pengembangan</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Menu Push</h2>
        </div>
        <div className="py-12 text-center text-[15px] text-slate-500">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="font-bold text-slate-800">Fitur segera tersedia</p>
          <p className="mx-auto mt-2 max-w-xs leading-6">Nantinya kamu dapat menyinkronkan struktur menu ke semua platform dari satu tempat.</p>
        </div>
      </section>

      <section className="min-w-0 space-y-6 xl:col-span-3">
        <div className="surface-card flex min-h-[420px] flex-col p-6">
          <div className="border-b border-red-100 pb-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-red-600">Aktivitas</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Status push menu</h2>
          </div>
          <div className="my-auto rounded-2xl border border-dashed border-red-200 bg-red-50/40 px-6 py-14 text-center text-[15px] text-slate-500">
            Belum ada aktivitas yang dapat ditampilkan.
          </div>
        </div>
      </section>
    </main>
  );
}
