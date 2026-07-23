const TABS = [
  {
    id: "pull",
    label: "Menu Pull",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    id: "push",
    label: "Menu Push",
    badge: "Segera",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    id: "edit-harga",
    label: "Edit Harga",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function NavHeader({ activeTab, onTabChange }) {
  return (
    <header className="sticky top-0 z-50 border-b border-red-100 bg-white/95 shadow-[0_8px_30px_-20px_rgba(127,29,29,0.45)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-900/20">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5a4.008 4.008 0 000 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-slate-900 sm:text-lg">
                FoodMaster
              </h1>
              <p className="mt-0.5 hidden text-[13px] text-slate-500 sm:block">
                Unified menu operations
              </p>
            </div>
          </div>
        </div>

        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0" aria-label="Menu utama">
          {TABS.filter((tab) => tab.id !== "push").map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`
                group relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[15px] font-semibold transition-all
                ${activeTab === tab.id
                  ? "bg-red-700 text-white shadow-md shadow-red-900/15"
                  : "text-slate-600 hover:bg-red-50 hover:text-red-700"
                }
              `}
            >
              <span className={activeTab === tab.id ? "text-white" : "text-slate-400 group-hover:text-red-600"}>
                {tab.icon}
              </span>
              {tab.label}
              {tab.badge && (
                <span className={activeTab === tab.id ? "rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] text-white" : "rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] text-red-600"}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
