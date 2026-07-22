"use client";

export default function MenuPushTab() {
  return (
    <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <section className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm h-fit space-y-6 transition-colors">
        <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          Menu Push
        </h2>
        <div className="text-zinc-400 dark:text-zinc-500 text-xs py-10 text-center">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">Segera Hadir</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Fitur push menu ke platform akan tersedia dalam versi berikutnya.</p>
        </div>
      </section>

      <section className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm min-h-[350px] flex flex-col transition-colors">
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
            Status Push Menu
          </h2>
          <div className="text-zinc-400 dark:text-zinc-500 text-xs py-16 text-center my-auto">
            Belum ada aktivitas push menu.
          </div>
        </div>
      </section>
    </main>
  );
}
