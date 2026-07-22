"use client";

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

export default function NavHeader({ activeTab, onTabChange, theme = "light", onToggleTheme }) {
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        {/* Top row: branding + theme toggle */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center shadow-md">
              <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5a4.008 4.008 0 000 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-brand-dark dark:text-zinc-100 leading-none">
                FoodMaster Menu Portal
              </h1>
              <p className="text-[11px] text-brand-muted dark:text-zinc-400 mt-0.5">
                Kelola menu ShopeeFood, GoFood & GrabFood
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-brand-muted dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Backend terhubung
            </div>

            {/* Day / Night Mode Toggle Button */}
            <button type="button" onClick={onToggleTheme}
              title={isDark ? "Beralih ke Mode Siang (Light)" : "Beralih ke Mode Malam (Dark)"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all shadow-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-amber-400 dark:border-zinc-700"
            >
              {isDark ? (
                <>
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Siang</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Malam</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg
                transition-all duration-200 relative
                ${activeTab === tab.id
                  ? "text-brand-red dark:text-rose-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-b-white dark:border-b-zinc-900 -mb-px"
                  : "text-brand-muted dark:text-zinc-400 hover:text-brand-dark dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }
              `}
            >
              <span className={`transition-colors duration-200 ${
                activeTab === tab.id ? "text-brand-red dark:text-rose-400" : "text-brand-muted dark:text-zinc-400 group-hover:text-brand-dark dark:group-hover:text-zinc-100"
              }`}>
                {tab.icon}
              </span>
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-red dark:bg-rose-500 rounded-full"></span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
