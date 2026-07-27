import { useState, useEffect } from "react";
import PlatformBadge from "./PlatformBadge";

export default function SessionTab({ API_BASE_URL, API_SECRET_KEY }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "active" | "missing"
  const [filterPlatform, setFilterPlatform] = useState("all"); // "all" | "shopee" | "gofood"

  useEffect(() => {
    fetchSessions();
  }, [API_BASE_URL]);

  const fetchSessions = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/sessions`, {
      headers: { "X-API-Key": API_SECRET_KEY || "" }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch sessions data");
        return res.json();
      })
      .then((data) => {
        setSessions(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal memuat status session dari server.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    try {
      // If it's a Unix timestamp number (seconds)
      const date = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
      if (isNaN(date.getTime())) return String(ts);
      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return String(ts);
    }
  };

  // Filtering logic
  const filteredSessions = sessions.filter((s) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      (s.merchant_name || "").toLowerCase().includes(searchLower) ||
      (s.nama_resto_final || "").toLowerCase().includes(searchLower) ||
      (s.nama_outlet || "").toLowerCase().includes(searchLower) ||
      (s.store_id || "").toLowerCase().includes(searchLower) ||
      (s.phone || "").toLowerCase().includes(searchLower);

    const matchType =
      filterType === "all" ||
      (filterType === "active" && s.has_session) ||
      (filterType === "missing" && !s.has_session);

    const matchPlatform =
      filterPlatform === "all" || s.platform === filterPlatform;

    return matchSearch && matchType && matchPlatform;
  });

  const activeCount = sessions.filter((s) => s.has_session).length;
  const missingCount = sessions.filter((s) => !s.has_session).length;

  return (
    <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dashboard Sesi Login</h2>
          <p className="mt-1 text-sm text-slate-500">
            Status penyimpanan session cookie/profile per merchant Shopee & GoFood
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2 text-[14px] font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Stats Overview */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Outlet</span>
          <p className="mt-1.5 text-2xl font-black text-slate-800">{sessions.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Sesi Aktif</span>
          <p className="mt-1.5 text-2xl font-black text-emerald-800">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Sesi Kosong / Butuh Login</span>
          <p className="mt-1.5 text-2xl font-black text-rose-800">{missingCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari merchant, outlet, store ID atau email login..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-[14px] shadow-inner outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Filter Type Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
                filterType === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua Status
            </button>
            <button
              onClick={() => setFilterType("active")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
                filterType === "active" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-emerald-700"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setFilterType("missing")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
                filterType === "missing" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-rose-700"
              }`}
            >
              Kosong
            </button>
          </div>

          {/* Filter Platform */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setFilterPlatform("all")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
                filterPlatform === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua Platform
            </button>
            <button
              onClick={() => setFilterPlatform("shopee")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
                filterPlatform === "shopee" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-orange-700"
              }`}
            >
              Shopee
            </button>
            <button
              onClick={() => setFilterPlatform("gofood")}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
                filterPlatform === "gofood" ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-red-700"
              }`}
            >
              GoFood
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-slate-500">
          <svg className="mx-auto h-8 w-8 animate-spin text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
          </svg>
          <p className="mt-3 text-sm">Memuat data sesi login...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
          Tidak ada data merchant yang cocok dengan filter pencarian.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-[13px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Merchant & Outlet</th>
                <th className="px-4 py-3.5">Platform</th>
                <th className="px-4 py-3.5">Detail Login / File Sesi</th>
                <th className="px-4 py-3.5">Status Sesi</th>
                <th className="px-4 py-3.5 rounded-r-xl">Terakhir Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-800">
                      {s.nama_resto_final || s.nama_outlet || s.merchant_name}
                    </div>
                    {s.nama_outlet && s.nama_outlet !== (s.nama_resto_final || s.merchant_name) && (
                      <div className="text-[12px] text-slate-400">GSheets: {s.nama_outlet}</div>
                    )}
                    {s.brand && <div className="mt-0.5 text-[12px] text-slate-500">Brand: {s.brand}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <PlatformBadge platform={s.platform} storeId={s.store_id} />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[12.5px] text-slate-600">
                    <div>{s.phone || "-"}</div>
                    {s.session_file && (
                      <div className="mt-0.5 text-[11px] text-slate-400 font-sans break-all max-w-xs">
                        File: {s.session_file}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {s.has_session ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[12.5px] font-bold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[12.5px] font-bold text-rose-700 border border-rose-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        Kosong
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                    {formatTimestamp(s.last_active)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
