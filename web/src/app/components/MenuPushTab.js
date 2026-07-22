"use client";

export default function MenuPushTab() {
  return (
    <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <section className="lg:col-span-1 bg-brand-white border border-brand-red p-6 rounded-md h-fit space-y-6">
        <h2 className="text-base font-semibold text-brand-dark pb-2 border-b border-brand-red">
          Menu Push
        </h2>
        <div className="text-brand-muted text-sm py-10 text-center">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-brand-red/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="font-medium text-brand-dark">Segera Hadir</p>
          <p className="text-xs mt-1">Fitur push menu ke platform akan tersedia dalam versi berikutnya.</p>
        </div>
      </section>

      <section className="lg:col-span-2 space-y-6">
        <div className="bg-brand-white border border-brand-red p-6 rounded-md min-h-[350px] flex flex-col">
          <h2 className="text-base font-semibold text-brand-dark pb-2 border-b border-brand-red mb-4">
            Status Push Menu
          </h2>
          <div className="text-brand-muted text-sm py-16 text-center my-auto">
            Belum ada aktivitas push menu.
          </div>
        </div>
      </section>
    </main>
  );
}
