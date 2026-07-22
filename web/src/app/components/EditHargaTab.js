"use client";

export default function EditHargaTab() {
  return (
    <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <section className="lg:col-span-1 bg-brand-white border border-brand-red p-6 rounded-md h-fit space-y-6">
        <h2 className="text-base font-semibold text-brand-dark pb-2 border-b border-brand-red">
          Edit Harga Sekaligus
        </h2>
        <div className="text-brand-muted text-sm py-10 text-center">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-brand-red/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-medium text-brand-dark">Segera Hadir</p>
          <p className="text-xs mt-1">Fitur edit harga secara massal akan tersedia dalam versi berikutnya.</p>
        </div>
      </section>

      <section className="lg:col-span-2 space-y-6">
        <div className="bg-brand-white border border-brand-red p-6 rounded-md min-h-[350px] flex flex-col">
          <h2 className="text-base font-semibold text-brand-dark pb-2 border-b border-brand-red mb-4">
            Preview Perubahan Harga
          </h2>
          <div className="text-brand-muted text-sm py-16 text-center my-auto">
            Belum ada perubahan harga yang aktif.
          </div>
        </div>
      </section>
    </main>
  );
}
