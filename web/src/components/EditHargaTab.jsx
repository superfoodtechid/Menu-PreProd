import { useState, useEffect, useRef, useCallback } from "react";
import PlatformBadge from "./PlatformBadge";

const fmt = (v) => (!v && v !== 0) ? "" : Number(v).toLocaleString("id-ID");
const parse = (s) => parseInt(String(s).replace(/\D/g, ""), 10) || 0;
const group = (items) => items.reduce((a, i) => { (a[i.category] ??= []).push(i); return a; }, {});

function applyAdj(price, mode, type, val) {
  const n = parseFloat(val) || 0;
  if (!n) return price;
  if (type === "pct") {
    const d = Math.round(price * n / 100);
    return mode === "add" ? price + d : Math.max(1, price - d);
  }
  return mode === "add" ? price + n : Math.max(1, price - n);
}

function checkViolation(platform, oldPrice, newPrice) {
  if (newPrice <= oldPrice) return { isViolation: false, message: "" };
  const diff = newPrice - oldPrice;
  const pct = (diff / oldPrice) * 100;
  
  if (platform === "gofood") {
    if (pct > 15) return { isViolation: true, message: "GoFood: Maksimal kenaikan 15%." };
  } else if (platform === "grab") {
    if (pct > 15) return { isViolation: true, message: "GrabFood: Maksimal kenaikan 15% dan maks. 15x per bulan." };
  } else if (platform === "shopee") {
    if (pct > 25) return { isViolation: true, message: "ShopeeFood: Maksimal kenaikan 25% dan maks. 1x per hari." };
  }
  return { isViolation: false, message: "" };
}

// ─── Inline Adjust Controls ──────────────────────────────────────────────────
const CHIPS_NOM = [500, 1000, 2000, 5000];
const CHIPS_PCT = [5, 10, 15, 20];

function AdjustBar({ onApply, buttonText = "OK" }) {
  const [mode, setMode] = useState("add");
  const [type, setType] = useState("nominal");
  const [val, setVal] = useState("");

  const fire = (m, t, v) => { const n = parseFloat(v); if (n) onApply(m, t, n); };
  const chips = type === "nominal" ? CHIPS_NOM : CHIPS_PCT;

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[13px] font-bold uppercase tracking-wider text-slate-500">Arah perubahan harga</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Arah perubahan harga">
          <button
            type="button"
            onClick={() => setMode("add")}
            aria-pressed={mode === "add"}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-bold transition ${
              mode === "add"
                ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
            }`}
          >
            <span aria-hidden="true">↑</span>
            Increase Price
          </button>
          <button
            type="button"
            onClick={() => setMode("sub")}
            aria-pressed={mode === "sub"}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-bold transition ${
              mode === "sub"
                ? "border-red-700 bg-red-700 text-white shadow-sm"
                : "border-red-200 bg-red-50 text-red-700 hover:border-red-300"
            }`}
          >
            <span aria-hidden="true">↓</span>
            Decrease Price
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <p className="mb-1 text-[13px] font-semibold text-slate-500">Metode</p>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
            {[["nominal", "Rp"], ["pct", "%"]].map(([t, label]) => (
              <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t}
                className={`px-3 py-2 text-[13px] font-semibold leading-none transition-colors ${
                  type === t ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >{label}</button>
            ))}
          </div>
        </div>
        <label className="min-w-[110px] flex-1">
          <span className="mb-1 block text-[13px] font-semibold text-slate-500">Nilai perubahan</span>
          <input type="number" min="0"
            placeholder={type === "nominal" ? "1000" : "10"}
            value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fire(mode, type, val)}
            className={`w-full rounded-lg border bg-white px-3 py-1.5 text-[15px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 ${mode === "add" ? "border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100" : "border-red-200 focus:border-red-400 focus:ring-red-100"}`}
          />
        </label>
        <button type="button" onClick={() => fire(mode, type, val)} disabled={!val}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 ${mode === "add" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-red-700 hover:bg-red-800"}`}
        >{buttonText}</button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[13px] text-slate-400">Nilai cepat:</span>
        {chips.map((v) => (
          <button key={v} type="button"
            onClick={() => setVal(String(v))}
            className={`rounded-full border bg-white px-2.5 py-0.5 text-[13px] font-semibold transition-colors ${mode === "add" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-red-200 text-red-700 hover:bg-red-50"}`}
          >{mode === "add" ? "+" : "−"}{type === "nominal" ? fmt(v) : `${v}%`}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Branch Card ──────────────────────────────────────────────────────────────
// ─── Branch Card ──────────────────────────────────────────────────────────────
function BranchCard({ branch, items = [], edits, verification = {}, itemEditMode = "single", selectedItemIds = [], onToggleSelectItem, onChange, onBulkAdj, onReset, onSave, onApplyToAll, totalBranches, saving, saved }) {
  const label = branch.brand || branch.nama_resto_final || branch.merchant_name;
  const groups = group(items);
  const changed = items.filter((i) => (edits[i.id] ?? i.price) !== i.price).length;
  const [showAdj, setShowAdj] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-[0_14px_35px_-28px_rgba(127,29,29,0.5)] transition-all hover:border-red-200">
      {/* header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-zinc-800 truncate">{label}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
            <PlatformBadge platform={branch.platform} storeId={branch.store_id || "No Store ID"} />
            {branch.cabang && (
              <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                Cabang: {branch.cabang}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {changed > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[13px] font-bold text-amber-700">
              {changed} berubah
            </span>
          )}
          <button type="button" onClick={() => setShowAdj(!showAdj)}
            title="Sesuaikan semua harga brand ini"
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              showAdj ? "bg-red-700 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick per-card adjust (toggle) */}
      {showAdj && (
        <div className="px-4 pb-3 border-b border-zinc-100 pt-3 bg-slate-50/50">
          <AdjustBar onApply={(m, t, v) => onBulkAdj([branch.id], m, t, v)} buttonText="Terapkan" />
        </div>
      )}

      {/* menu items */}
      <div className="flex-1 overflow-y-auto max-h-64 px-4 pb-2">
        {items.length === 0 ? (
          <p className="text-center text-[15px] text-zinc-400 py-6">Tidak ada item menu ditemukan.</p>
        ) : (
          Object.entries(groups).map(([cat, items]) => (
            <div key={cat} className="mt-3 first:mt-0">
              <p className="text-[13px] font-bold uppercase tracking-wider text-zinc-455 mb-1.5">{cat}</p>
              <div className="space-y-1">
                {items.map((item) => {
                  const cur = edits[item.id] ?? item.price;
                  const diff = cur !== item.price;
                  const pct = item.price > 0 ? ((cur - item.price) / item.price) * 100 : 0;
                  const pctFmt = (pct > 0 ? "+" : "") + (Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)) + "%";
                  const { isViolation, message: violationMsg } = checkViolation(branch.platform, item.price, cur);
                  const ver = verification[item.id];
                  const isChecked = selectedItemIds.includes(item.id);

                  return (
                    <div key={item.id}
                      className={`flex flex-col gap-1 py-1.5 px-2 rounded-lg transition-colors ${
                        isViolation
                          ? "border border-red-200 bg-red-50"
                          : isChecked
                          ? "bg-amber-100/70 border border-amber-200"
                          : diff
                          ? "bg-amber-50/70"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 mr-3 flex items-center gap-2">
                          {itemEditMode === "multi" && (
                            <input type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleSelectItem && onToggleSelectItem(item.id)}
                              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[15px] truncate font-medium text-zinc-700">{item.name}</p>
                              {isViolation && (
                                <span title={violationMsg} className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full bg-red-600 text-[13px] font-bold text-white shadow-sm">!</span>
                              )}
                            </div>
                            {diff && (
                              <p className="text-[13px] font-medium text-zinc-650 flex items-center gap-1 mt-0.5 flex-wrap">
                                <span className="line-through text-zinc-400 font-normal">Rp {fmt(item.price)}</span>
                                <span className="text-zinc-400">→</span>
                                <span className="font-semibold text-zinc-750">Rp {fmt(cur)}</span>
                                <span className={`rounded px-1 text-[13px] font-bold ${pct > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                  ({pctFmt})
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[13px] text-zinc-400">Rp</span>
                          <input type="text" inputMode="numeric"
                            value={fmt(cur)}
                            onChange={(e) => onChange(branch.id, item.id, e.target.value)}
                            className={`w-24 text-right text-[15px] font-semibold rounded-md px-2 py-1 border transition-colors focus:outline-none focus:ring-1 ${
                              isViolation
                                ? "border-red-400 bg-white text-red-700 focus:border-red-500 focus:ring-red-200"
                                : diff
                                ? "border-amber-300 bg-white text-slate-700 focus:ring-amber-200"
                                : "border-slate-200 bg-slate-50 text-slate-700 focus:ring-red-200 focus:bg-white"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Verification Post-Pull Compare Badge */}
                      {ver && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-[12px]">
                          {ver.status === "VERIFIED" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                              ✓ Terverifikasi Sesuai di Portal (Rp {fmt(ver.actualPrice)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                              ⏳ Menunggu Sinkron Portal (Target: Rp {fmt(ver.targetPrice)} / Aktual: Rp {fmt(ver.actualPrice)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-2 border-t border-red-100 bg-red-50/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onReset(branch.id, items)}
            className="text-[13px] font-semibold text-zinc-500 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-all shadow-sm"
          >Reset</button>
          {totalBranches > 1 && (
            <button type="button" onClick={() => onApplyToAll(branch.id)}
              title="Salin harga brand ini ke semua brand terpilih"
              className="text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors"
            >
              Terapkan ke Semua Brand
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[13px] text-zinc-400 animate-pulse">Menyimpan...</span>}
          {saved && <span className="text-[13px] font-semibold text-emerald-700">Tersimpan ✓</span>}
          <button type="button" onClick={() => onSave([branch.id])} disabled={saving || changed === 0}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >Simpan</button>
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepLabel({ number, label, active, done, className = "mb-2.5" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`w-6 h-6 rounded-full text-[13px] font-bold flex items-center justify-center shrink-0 transition-colors ${
        done ? "bg-red-700 text-white"
        : active ? "bg-red-100 text-red-700 ring-4 ring-red-50"
        : "bg-slate-100 text-slate-400"
      }`}>{done ? "✓" : number}</span>
      <span className={`text-[15px] font-bold uppercase tracking-wider transition-colors ${
        active || done ? "text-slate-700" : "text-slate-400"
      }`}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EditHargaTab({ API_BASE_URL = "http://localhost:18800" }) {
  const [platform, setPlatform] = useState("");
  const [allOutlets, setAllOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [uniqueParents, setUniqueParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [checkedIds, setCheckedIds] = useState([]);
  const [branchMenus, setBranchMenus] = useState({});
  const [edits, setEdits] = useState({});
  const [saveState, setSaveState] = useState({});
  const [verificationMap, setVerificationMap] = useState({}); // { [bid]: { [itemId]: { targetPrice, actualPrice, status } } }

  // GSheet auto-sync state
  const [gsheetSyncing, setGsheetSyncing] = useState(false);
  const [gsheetSyncedAt, setGsheetSyncedAt] = useState(null);

  // Auto-pull sync state
  const [syncPhase, setSyncPhase] = useState("idle"); // "idle" | "syncing" | "done"
  const [syncJobs, setSyncJobs] = useState([]);
  const syncPollingRef = useRef({});

  const [openPlatformDropdown, setOpenPlatformDropdown] = useState(false);
  const [openOutletDropdown, setOpenOutletDropdown] = useState(false);
  const [openBranchDropdown, setOpenBranchDropdown] = useState(false);

  const [pushing, setPushing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPushConfirmModal, setShowPushConfirmModal] = useState(false);
  const [pushSummaryList, setPushSummaryList] = useState([]); // [{ branchId, branchName, updates: [{ id, name, category, oldPrice, newPrice, pct, isViolation, violationMsg }] }]
  const [intendedPushPrices, setIntendedPushPrices] = useState({}); // { [bid]: { [itemId]: targetPrice } }

  const [activeJobs, setActiveJobs] = useState([]);
  const pushPollingIntervalsRef = useRef({});

  // Item Selection Edit Controls state in Step 4
  const [itemEditMode, setItemEditMode] = useState("single"); // "single" | "multi" | "all"
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const toggleSelectItem = (itemId) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllVisibleItems = (previewBranches) => {
    const allIds = [];
    previewBranches.forEach(b => {
      const items = branchMenus[b.id] || [];
      items.forEach(i => allIds.push(i.id));
    });
    setSelectedItemIds(allIds);
  };

  const deselectAllItems = () => {
    setSelectedItemIds([]);
  };

  // Trigger GSheet sync from backend POST /api/sync-sheets
  const triggerGSheetSync = useCallback(async () => {
    setGsheetSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sync-sheets`, { method: "POST" });
      if (res.ok) {
        setGsheetSyncedAt(new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error("GSheet sync error:", err);
    } finally {
      setGsheetSyncing(false);
    }
  }, [API_BASE_URL]);

  // Clear auto-pull polling intervals
  const clearSyncPolling = useCallback(() => {
    Object.values(syncPollingRef.current).forEach(clearInterval);
    syncPollingRef.current = {};
  }, []);

  // fetch outlets when platform changes
  useEffect(() => {
    clearSyncPolling();
    if (!platform) {
      setAllOutlets([]); setUniqueParents([]); setSelectedParent("");
      setBranches([]); setSelectedBrandId(""); setCheckedIds([]); setSearch(""); setEdits({}); setBranchMenus({});
      setSyncPhase("idle"); setSyncJobs([]); setVerificationMap({});
      setOpenOutletDropdown(false); setOpenBranchDropdown(false);
      return;
    }
    setLoading(true);
    setAllOutlets([]); setUniqueParents([]); setSelectedParent("");
    setBranches([]); setSelectedBrandId(""); setCheckedIds([]); setSearch(""); setEdits({}); setBranchMenus({});
    setSyncPhase("idle"); setSyncJobs([]); setVerificationMap({});

    // Sync GSheet first when platform is selected
    triggerGSheetSync().then(() => {
      const url = `${API_BASE_URL}/api/outlets?platform=${platform}`;
      return fetch(url).then(r => r.json())
        .then(data => {
          setAllOutlets(data);
          setUniqueParents(Array.from(new Set(data.map(o => o.nama_outlet).filter(Boolean))).sort());
        });
    }).catch((err) => console.error("Error fetching outlets:", err))
      .finally(() => setLoading(false));
  }, [platform, API_BASE_URL, clearSyncPolling, triggerGSheetSync]);

  // Fetch menu items and run verification check against intended push prices
  const fetchMenusAndVerify = useCallback(async (targetBranches, targetIntendedPrices = intendedPushPrices) => {
    setLoading(true);
    const menusMap = {};
    const editsMap = {};
    const newVerifications = { ...verificationMap };

    await Promise.all(targetBranches.map(async (b) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/outlets/${b.id}/menu-items`);
        if (res.ok) {
          const items = await res.json();
          menusMap[b.id] = items;
          editsMap[b.id] = {};
          
          const branchIntended = targetIntendedPrices[b.id] || {};
          const branchVer = {};

          items.forEach(i => {
            editsMap[b.id][i.id] = i.price;
            if (branchIntended[i.id] !== undefined) {
              const targetP = branchIntended[i.id];
              const isMatch = i.price === targetP;
              branchVer[i.id] = {
                targetPrice: targetP,
                actualPrice: i.price,
                status: isMatch ? "VERIFIED" : "PENDING_SYNC"
              };
            }
          });

          if (Object.keys(branchVer).length > 0) {
            newVerifications[b.id] = branchVer;
          }
        } else {
          menusMap[b.id] = [];
        }
      } catch {
        menusMap[b.id] = [];
      }
    }));

    setBranchMenus(menusMap);
    setEdits(editsMap);
    setVerificationMap(newVerifications);
    setLoading(false);
  }, [API_BASE_URL, intendedPushPrices, verificationMap]);

  // Clean up polling intervals on unmount
  useEffect(() => {
    const pushIntervals = pushPollingIntervalsRef.current;
    const syncIntervals = syncPollingRef.current;
    return () => {
      Object.values(pushIntervals).forEach(clearInterval);
      Object.values(syncIntervals).forEach(clearInterval);
    };
  }, []);

  // Trigger real-time Auto-Pull for chosen brand
  const triggerAutoPull = useCallback(async (targetBranches, customIntendedPrices = intendedPushPrices) => {
    if (!targetBranches || targetBranches.length === 0) return;
    clearSyncPolling();
    setSyncPhase("syncing");

    const initialJobs = targetBranches.map(b => ({
      id: null,
      branchId: b.id,
      name: b.brand || b.nama_resto_final || b.merchant_name,
      storeId: b.store_id,
      platform: b.platform,
      status: "PENDING",
      progress_pct: 0,
      current_step: "Mengantrekan tugas penarikan real-time...",
      error_message: null
    }));
    setSyncJobs(initialJobs);

    const createdJobs = [];
    for (const b of targetBranches) {
      const label = b.brand || b.nama_resto_final || b.merchant_name;
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs/pull?outlet_id=${b.id}`, {
          method: "POST"
        });
        if (res.ok) {
          const job = await res.json();
          createdJobs.push({
            id: job.id,
            branchId: b.id,
            name: label,
            storeId: b.store_id,
            platform: b.platform,
            status: job.status,
            progress_pct: job.progress_pct,
            current_step: job.current_step,
            error_message: null
          });
        } else {
          createdJobs.push({
            id: `err-${b.id}`,
            branchId: b.id,
            name: label,
            storeId: b.store_id,
            platform: b.platform,
            status: "FAILED",
            progress_pct: 0,
            current_step: "Gagal memicu tugas di backend.",
            error_message: "Response status error"
          });
        }
      } catch (err) {
        createdJobs.push({
          id: `err-${b.id}`,
          branchId: b.id,
          name: label,
          storeId: b.store_id,
          platform: b.platform,
          status: "FAILED",
          progress_pct: 0,
          current_step: "Gagal menghubungkan ke server.",
          error_message: err.message
        });
      }
    }

    setSyncJobs(createdJobs);

    const activeJobIds = createdJobs.filter(j => j.id && !j.id.startsWith("err-")).map(j => j.id);
    if (activeJobIds.length === 0) {
      fetchMenusAndVerify(targetBranches, customIntendedPrices);
      setSyncPhase("done");
      return;
    }

    activeJobIds.forEach(jobId => {
      syncPollingRef.current[jobId] = setInterval(() => {
        fetch(`${API_BASE_URL}/api/jobs/${jobId}`)
          .then(r => r.ok ? r.json() : null)
          .then(job => {
            if (!job) return;
            setSyncJobs(prev => prev.map(j => j.id === jobId ? {
              ...j,
              status: job.status,
              progress_pct: job.progress_pct,
              current_step: job.current_step,
              error_message: job.error_message
            } : j));

            if (job.status === "SUCCESS" || job.status === "FAILED") {
              clearInterval(syncPollingRef.current[jobId]);
              delete syncPollingRef.current[jobId];

              if (Object.keys(syncPollingRef.current).length === 0) {
                fetchMenusAndVerify(targetBranches, customIntendedPrices);
                setSyncPhase("done");
              }
            }
          })
          .catch(err => console.error("Error polling sync job:", err));
      }, 2000);
    });

  }, [API_BASE_URL, clearSyncPolling, fetchMenusAndVerify, intendedPushPrices]);

  // When selected parent (Outlet) changes
  const handleSelectOutlet = (name) => {
    setSelectedParent(name);
    setOpenOutletDropdown(false);
    const targetBranches = allOutlets.filter(o => o.nama_outlet === name);
    setBranches(targetBranches);
    setSelectedBrandId("");
    setCheckedIds([]);
    setSyncPhase("idle");
    triggerGSheetSync();
  };

  // When selected brand changes (Single Select)
  const handleSelectBrand = (branchId) => {
    setSelectedBrandId(branchId);
    setCheckedIds([branchId]);
    setOpenBranchDropdown(false);
    setSyncPhase("idle");
    triggerGSheetSync();
  };

  // Start Pull & Edit
  const handleStartPullAndEdit = () => {
    const targetBranches = branches.filter(b => b.id === selectedBrandId);
    if (targetBranches.length > 0) {
      triggerAutoPull(targetBranches);
    }
  };

  // Skip pull and jump straight to editing
  const handleSkipSync = () => {
    clearSyncPolling();
    const targetBranches = branches.filter(b => b.id === selectedBrandId);
    fetchMenusAndVerify(targetBranches);
    setSyncPhase("done");
  };

  const filtered = uniqueParents.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  const selectedBrandObj = branches.find(b => b.id === selectedBrandId);
  const preview = branches.filter(b => checkedIds.includes(b.id));

  const totalChanges = preview.reduce((total, branch) => {
    const items = branchMenus[branch.id] || [];
    return total + items.filter(item => (edits[branch.id]?.[item.id] ?? item.price) !== item.price).length;
  }, 0);

  const changePrice = (bid, iid, raw) => {
    setEdits(p => ({ ...p, [bid]: { ...p[bid], [iid]: parse(raw) } }));
    setSaveState(p => ({ ...p, [bid]: null }));
  };

  const bulkAdj = (bids, mode, type, val, targetItemIds = null) => {
    const targets = bids.length ? bids : checkedIds;
    setEdits(p => {
      const n = { ...p };
      targets.forEach(bid => {
        const items = branchMenus[bid] || [];
        const be = { ...(p[bid] || {}) };
        items.forEach(i => {
          if (!targetItemIds || targetItemIds.includes(i.id)) {
            be[i.id] = applyAdj(be[i.id] ?? i.price, mode, type, val);
          }
        });
        n[bid] = be;
      });
      return n;
    });
    setSaveState(p => { const n = { ...p }; targets.forEach(id => { n[id] = null; }); return n; });
  };

  const startPollingPushJob = (jobId, branchId) => {
    if (pushPollingIntervalsRef.current[jobId]) {
      clearInterval(pushPollingIntervalsRef.current[jobId]);
    }

    pushPollingIntervalsRef.current[jobId] = setInterval(() => {
      fetch(`${API_BASE_URL}/api/jobs/${jobId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch job");
          return res.json();
        })
        .then((job) => {
          setActiveJobs((prevJobs) =>
            prevJobs.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    status: job.status,
                    progress_pct: job.progress_pct,
                    current_step: job.current_step,
                    error_message: job.error_message,
                  }
                : j
            )
          );

          if (job.status === "SUCCESS" || job.status === "FAILED") {
            clearInterval(pushPollingIntervalsRef.current[jobId]);
            delete pushPollingIntervalsRef.current[jobId];

            if (job.status === "SUCCESS") {
              // Trigger Auto-Pull & Compare verification automatically upon push completion
              const targetBranch = branches.filter(b => b.id === branchId);
              if (targetBranch.length > 0) {
                triggerAutoPull(targetBranch);
              }
            }
          }
        })
        .catch((err) => {
          console.error(err);
          clearInterval(pushPollingIntervalsRef.current[jobId]);
          delete pushPollingIntervalsRef.current[jobId];
        });
    }, 2000);
  };

  const triggerPriceUpdate = async (bidsToUpdate) => {
    setPushing(true);
    const targets = Array.isArray(bidsToUpdate) ? bidsToUpdate : [bidsToUpdate];
    const newJobsList = [];
    const newIntended = { ...intendedPushPrices };

    for (const bid of targets) {
      const branch = branches.find(x => x.id === bid);
      if (!branch) continue;
      const label = branch.brand || branch.nama_resto_final || branch.merchant_name;

      const branchEdits = edits[bid] || {};
      const branchItems = branchMenus[bid] || [];
      const updates = [];
      const branchIntendedMap = {};

      branchItems.forEach(i => {
        const curPrice = branchEdits[i.id];
        if (curPrice !== undefined && curPrice !== i.price) {
          updates.push({
            item_id: i.id,
            category_id: i.category_id || "",
            new_price: curPrice
          });
          branchIntendedMap[i.id] = curPrice;
        }
      });

      if (updates.length === 0) continue;

      newIntended[bid] = { ...(newIntended[bid] || {}), ...branchIntendedMap };

      try {
        setSaveState(p => ({ ...p, [bid]: "saving" }));
        const res = await fetch(`${API_BASE_URL}/api/jobs/push-price`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: bid,
            updates: updates
          })
        });

        if (res.ok) {
          const job = await res.json();
          newJobsList.push({
            id: job.id,
            name: label,
            platform: branch.platform,
            status: job.status,
            progress_pct: job.progress_pct,
            current_step: job.current_step,
            error_message: null
          });
          startPollingPushJob(job.id, bid);
          setSaveState(p => ({ ...p, [bid]: "saved" }));
        } else {
          setSaveState(p => ({ ...p, [bid]: null }));
          alert(`Gagal memicu update harga untuk ${label}`);
        }
      } catch (err) {
        setSaveState(p => ({ ...p, [bid]: null }));
        console.error(err);
      }
    }

    setIntendedPushPrices(newIntended);
    if (newJobsList.length > 0) {
      setActiveJobs(p => [...newJobsList, ...p]);
    }
    setPushing(false);
    return newJobsList.length;
  };

  // Open rich push summary modal before sending update
  const openPushConfirmationModal = (bidsToUpdate = checkedIds) => {
    const targets = Array.isArray(bidsToUpdate) ? bidsToUpdate : [bidsToUpdate];
    const summary = [];

    targets.forEach(bid => {
      const branch = branches.find(x => x.id === bid);
      if (!branch) return;
      const bLabel = branch.brand || branch.nama_resto_final || branch.merchant_name;
      const branchItems = branchMenus[bid] || [];
      const itemUpdates = [];

      branchItems.forEach(item => {
        const curPrice = edits[bid]?.[item.id] ?? item.price;
        if (curPrice !== item.price) {
          const diff = curPrice - item.price;
          const pct = item.price > 0 ? (diff / item.price) * 100 : 0;
          const { isViolation, message: violationMsg } = checkViolation(branch.platform, item.price, curPrice);
          itemUpdates.push({
            id: item.id,
            name: item.name,
            category: item.category,
            oldPrice: item.price,
            newPrice: curPrice,
            diff: diff,
            pct: pct,
            isViolation: isViolation,
            violationMsg: violationMsg
          });
        }
      });

      if (itemUpdates.length > 0) {
        summary.push({
          branchId: bid,
          branchName: bLabel,
          platform: branch.platform,
          storeId: branch.store_id,
          updates: itemUpdates
        });
      }
    });

    if (summary.length === 0) {
      alert("Tidak ada perubahan harga yang terdeteksi.");
      return;
    }

    setPushSummaryList(summary);
    setShowPushConfirmModal(true);
  };

  const executePushFromModal = async () => {
    setShowPushConfirmModal(false);
    const targetBids = pushSummaryList.map(s => s.branchId);
    const queuedJobs = await triggerPriceUpdate(targetBids);
    if (queuedJobs > 0) {
      setShowSuccessModal(true);
    }
  };

  const resetOne = (bid, items) => {
    const r = {}; items.forEach(i => { r[i.id] = i.price; });
    setEdits(p => ({ ...p, [bid]: r }));
    setSaveState(p => ({ ...p, [bid]: null }));
  };

  const resetAll = () => {
    setEdits(p => {
      const n = { ...p };
      preview.forEach(b => {
        const items = branchMenus[b.id] || [];
        const r = {}; items.forEach(i => { r[i.id] = i.price; }); n[b.id] = r;
      });
      return n;
    });
    setSaveState({});
  };

  const applyBranchToAll = (sourceBranchId) => {
    const sourceEdits = edits[sourceBranchId];
    if (!sourceEdits) return;
    setEdits(p => {
      const n = { ...p };
      preview.forEach(b => {
        n[b.id] = { ...(n[b.id] || {}), ...sourceEdits };
      });
      return n;
    });
    setSaveState({});
  };

  const completedSyncCount = syncJobs.filter(j => j.status === "SUCCESS" || j.status === "FAILED").length;
  const totalSummaryItems = pushSummaryList.reduce((acc, s) => acc + s.updates.length, 0);

  return (
    <main className="flex flex-col gap-6">
      {/* ── Top: Controls ── */}
      <section className="surface-card p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-red-100 pb-4 gap-2">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-red-600">Pengaturan harga</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Tentukan target perubahan</h2>
            <p className="mt-1 text-[15px] text-slate-500">Pilih aplikator, outlet, dan brand (single-select), lalu lakukan tarik menu real-time sebelum melakukan perubahan harga.</p>
          </div>
          <div className="flex items-center gap-2 text-[13px] font-medium shrink-0">
            {gsheetSyncing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700 border border-amber-200 animate-pulse">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing GSheet...
              </span>
            ) : gsheetSyncedAt ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                GSheet Synced ({gsheetSyncedAt})
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">

          {/* 1: Aplikator */}
          <div className="relative">
            <StepLabel number={1} label="Aplikator" active={!platform} done={!!platform} />
            <button type="button"
              disabled={syncPhase === "syncing"}
              onClick={() => {
                setOpenPlatformDropdown(!openPlatformDropdown);
                setOpenOutletDropdown(false);
                setOpenBranchDropdown(false);
              }}
              className="field-control flex items-center justify-between text-left font-medium"
            >
              <span className="truncate flex items-center gap-1.5">
                {platform ? (
                  <PlatformBadge platform={platform} />
                ) : (
                  <span className="text-zinc-400">Pilih Aplikator...</span>
                )}
              </span>
              <svg className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${openPlatformDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openPlatformDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenPlatformDropdown(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-red-100 p-1.5 space-y-0.5 animate-scale-up">
                  {[
                    ["shopee", "ShopeeFood"],
                    ["gofood", "GoFood"],
                    ["grab", "GrabFood"]
                  ].map(([val]) => (
                    <button key={val} type="button"
                      onClick={() => {
                        setPlatform(val);
                        setOpenPlatformDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-[15px] flex items-center justify-between transition-all ${
                        platform === val
                          ? "bg-slate-50 text-slate-800 font-medium"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <PlatformBadge platform={val} selected={platform === val} />
                      {platform === val && <span className="text-[15px]">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 2: Outlet (Single Select) */}
          <div className="relative">
            <StepLabel number={2} label={selectedParent ? `Outlet (1)` : "Outlet"} active={!!platform && !selectedParent} done={!!selectedParent} />
            <button type="button"
              disabled={!platform || loading || syncPhase === "syncing"}
              onClick={() => {
                setOpenOutletDropdown(!openOutletDropdown);
                setOpenPlatformDropdown(false);
                setOpenBranchDropdown(false);
              }}
              className="field-control flex items-center justify-between text-left font-medium"
            >
              <span className={`truncate ${selectedParent ? "text-zinc-800 font-semibold" : "text-zinc-400"}`}>
                {loading
                  ? "Memuat..."
                  : !platform
                  ? "Pilih Aplikator dulu"
                  : selectedParent || "Pilih Outlet..."}
              </span>
              <svg className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${openOutletDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openOutletDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenOutletDropdown(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-red-100 p-2.5 space-y-2 animate-scale-up min-w-[240px]">
                  <input type="text" placeholder="Cari outlet..." value={search} onChange={e => setSearch(e.target.value)}
                    className="field-control py-2" autoFocus
                  />

                  <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                    {filtered.length === 0 ? (
                      <p className="text-center text-[15px] text-zinc-400 py-3">Tidak ada outlet cocok</p>
                    ) : (
                      filtered.map(name => {
                        const isSelected = selectedParent === name;
                        return (
                          <button key={name} type="button"
                            onClick={() => handleSelectOutlet(name)}
                            className={`w-full text-left px-2.5 py-2 rounded-md text-[15px] flex items-center justify-between transition-colors ${
                              isSelected ? "bg-red-50 text-red-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="truncate">{name}</span>
                            {isSelected && <span className="text-red-700 font-bold">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3: Brand (Single Select) */}
          <div className="relative">
            <StepLabel number={3} label={selectedBrandId ? "Brand (1)" : "Brand"} active={!!selectedParent && !selectedBrandId} done={!!selectedBrandId} />
            <button type="button"
              disabled={!selectedParent || syncPhase === "syncing"}
              onClick={() => {
                setOpenBranchDropdown(!openBranchDropdown);
                setOpenPlatformDropdown(false);
                setOpenOutletDropdown(false);
              }}
              className="field-control flex items-center justify-between text-left font-medium"
            >
              <span className={`truncate font-semibold ${!selectedBrandObj ? "text-slate-400" : "text-slate-800"}`}>
                {!selectedParent
                  ? "Pilih Outlet dulu"
                  : selectedBrandObj
                  ? (selectedBrandObj.brand || selectedBrandObj.nama_resto_final || selectedBrandObj.merchant_name)
                  : "Pilih Brand..."}
              </span>
              <svg className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${openBranchDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openBranchDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenBranchDropdown(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-red-100 p-2.5 space-y-2 animate-scale-up min-w-[280px]">
                  <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                    {branches.map(b => {
                      const isSelected = selectedBrandId === b.id;
                      const l = b.brand || b.nama_resto_final || b.merchant_name;
                      return (
                        <button key={b.id} type="button"
                          onClick={() => handleSelectBrand(b.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-md text-[15px] flex items-center justify-between transition-colors ${
                            isSelected ? "bg-red-50 text-red-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate">{l}</span>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] font-normal">
                              <PlatformBadge platform={b.platform} storeId={b.store_id || "No Store ID"} />
                              {b.cabang && <span className="text-slate-400">· Cabang: {b.cabang}</span>}
                            </div>
                          </div>
                          {isSelected && <span className="text-red-700 font-bold ml-2">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Start Pull Button */}
        {selectedBrandId && (
          <div className="pt-2 border-t border-red-100 flex justify-end">
            <button
              type="button"
              disabled={syncPhase === "syncing"}
              onClick={handleStartPullAndEdit}
              className="primary-action gap-2 px-6 py-2.5 text-[15px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncPhase === "syncing"
                ? "Sedang Menarik Menu Real-Time..."
                : `Tarik Real-Time Menu & Edit Harga`}
            </button>
          </div>
        )}
      </section>

      {/* ── Auto-Pull Syncing Loading Section ── */}
      {syncPhase === "syncing" && (
        <section className="surface-card p-6 space-y-5 border-2 border-red-200 bg-red-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white shadow-md">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Menarik data menu real-time...</h3>
                <p className="text-[13px] text-slate-500">
                  Brand: <strong>{selectedBrandObj ? (selectedBrandObj.brand || selectedBrandObj.nama_resto_final || selectedBrandObj.merchant_name) : selectedParent}</strong> ({completedSyncCount}/{syncJobs.length} selesai)
                </p>
              </div>
            </div>

            <button type="button" onClick={handleSkipSync}
              className="self-start sm:self-auto rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Lewati & Edit Langsung
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {syncJobs.map(job => (
              <div key={job.branchId || job.id} className="rounded-xl border border-red-100 bg-white p-4 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-slate-800 truncate">{job.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
                      <PlatformBadge platform={job.platform} storeId={job.storeId} />
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[13px] font-bold uppercase tracking-wider ${
                    job.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" :
                    job.status === "FAILED" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {job.status === "SUCCESS" ? "SELESAI ✓" : job.status === "FAILED" ? "GAGAL ✗" : `${job.progress_pct}%`}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-1.5 transition-all duration-300 ${
                    job.status === "SUCCESS" ? "bg-emerald-500" :
                    job.status === "FAILED" ? "bg-red-500" :
                    "bg-red-600"
                  }`} style={{ width: `${job.progress_pct}%` }} />
                </div>

                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 truncate">{job.current_step || "Mengantrekan..."}</span>
                  {job.error_message && (
                    <span className="text-red-600 font-medium truncate ml-2">{job.error_message}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Middle: Global Bulk Adjust & Mode Switcher (Step 4: Sesuaikan Harga) ── */}
      {syncPhase === "done" && preview.length > 0 && (
        <section className="surface-card p-5 lg:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-red-100 pb-4">
            <div>
              <StepLabel number={4} label="Sesuaikan Harga" active={true} done={false} className="mb-1" />
              <p className="text-[13px] text-zinc-500 ml-8">
                Terapkan ke <strong>{preview.length} brand</strong> terpilih. Saat ini ada <strong className="text-red-700">{totalChanges} perubahan</strong>.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Mode Edit:</span>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button type="button" onClick={() => setItemEditMode("single")}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                    itemEditMode === "single" ? "bg-red-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >Single Select Item</button>
                <button type="button" onClick={() => setItemEditMode("multi")}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                    itemEditMode === "multi" ? "bg-red-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >Multi Select Item ({selectedItemIds.length})</button>
                <button type="button" onClick={() => setItemEditMode("all")}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                    itemEditMode === "all" ? "bg-red-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >Apply to All Item</button>
              </div>
            </div>
          </div>

          {/* Sub-bar for Multi Select Item */}
          {itemEditMode === "multi" && (
            <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[13px]">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => selectAllVisibleItems(preview)} className="font-bold text-red-700 hover:underline">
                  ✓ Pilih Semua Item ({preview.reduce((acc, b) => acc + (branchMenus[b.id] || []).length, 0)})
                </button>
                <span className="text-amber-300">|</span>
                <button type="button" onClick={deselectAllItems} className="font-medium text-slate-600 hover:underline">
                  Batal Pilih
                </button>
              </div>
              <span className="font-bold text-amber-800">{selectedItemIds.length} item terpilih</span>
            </div>
          )}

          {/* Adjust Bar & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
            <div className="flex-1 min-w-0">
              <AdjustBar
                onApply={(m, t, v) => {
                  if (itemEditMode === "multi") {
                    if (selectedItemIds.length === 0) {
                      alert("Pilih setidaknya 1 item terlebih dahulu.");
                      return;
                    }
                    bulkAdj([], m, t, v, selectedItemIds);
                  } else {
                    bulkAdj([], m, t, v);
                  }
                }}
                buttonText={
                  itemEditMode === "multi"
                    ? `Terapkan ke ${selectedItemIds.length} Item Terpilih`
                    : itemEditMode === "all"
                    ? "Terapkan ke Semua Item"
                    : "Terapkan Perubahan"
                }
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
              <button type="button" onClick={resetAll}
                className="px-3.5 py-2 text-[14px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors shrink-0"
              >
                Reset Harga
              </button>
              <button type="button" onClick={() => openPushConfirmationModal(checkedIds)} disabled={pushing || totalChanges === 0}
                className="primary-action gap-2 px-5 py-2 text-[14px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {pushing ? "Mengirim job..." : `Push ${totalChanges} Perubahan`}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Active Push Price Jobs Section ── */}
      {activeJobs.length > 0 && (
        <section className="surface-card space-y-4 p-5">
          <h3 className="text-[15px] font-semibold text-zinc-700 uppercase tracking-wider">
            Status Pembaruan Harga ke Merchant Portal
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {activeJobs.map(job => (
              <div key={job.id} className="border border-red-100 p-4 rounded-lg flex flex-col gap-2.5 bg-red-50/30">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[15px] font-semibold text-zinc-700">{job.name}</div>
                    <div className="text-[13px] text-zinc-400">
                      JOB ID: {job.id} · PLATFORM: {job.platform?.toUpperCase()}
                    </div>
                  </div>
                  <span className={`text-[13px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    job.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" :
                    job.status === "FAILED" ? "bg-red-100 text-red-700" :
                    job.status === "PARTIAL_SUCCESS" ? "bg-amber-100 text-amber-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{job.status}</span>
                </div>
                
                {/* progress bar */}
                <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${
                    job.status === "SUCCESS" ? "bg-emerald-500" :
                    job.status === "FAILED" ? "bg-red-500" :
                    job.status === "PARTIAL_SUCCESS" ? "bg-amber-500" :
                    "bg-red-600"
                  }`} style={{ width: `${job.progress_pct}%` }} />
                </div>
                
                <div className="text-[13px] text-zinc-500 font-medium">
                  {job.current_step || "Mengantre..."}
                </div>
                {job.error_message && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[13px] text-red-700">
                    Error: {job.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom: Cards (only when syncPhase === "done") ── */}
      {syncPhase === "done" && (
        <section>
          {preview.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white/60 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-700">Belum ada brand dipilih</p>
              <p className="mt-1 text-[15px] text-slate-500">Selesaikan langkah 1–3 lalu klik tombol tarik real-time untuk mulai mengedit harga.</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${
              preview.length === 1 ? "grid-cols-1 max-w-lg" :
              preview.length === 2 ? "grid-cols-1 lg:grid-cols-2" :
              "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
            }`}>
              {preview.map(branch => (
                <BranchCard key={branch.id} branch={branch}
                  items={branchMenus[branch.id] || []}
                  edits={edits[branch.id] || {}}
                  verification={verificationMap[branch.id] || {}}
                  itemEditMode={itemEditMode}
                  selectedItemIds={selectedItemIds}
                  onToggleSelectItem={toggleSelectItem}
                  onChange={changePrice} onBulkAdj={bulkAdj}
                  onReset={resetOne} onSave={(bids) => openPushConfirmationModal(bids)}
                  onApplyToAll={applyBranchToAll}
                  totalBranches={preview.length}
                  saving={saveState[branch.id] === "saving"}
                  saved={saveState[branch.id] === "saved"}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Pop-up Push Rich Confirmation Summary Modal ── */}
      {showPushConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowPushConfirmModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-red-100 space-y-4 animate-scale-up max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ringkasan Update Harga Sebelum Push</h3>
                <p className="text-[13px] text-zinc-500 mt-0.5">
                  Tinjau daftar rincian <strong>{totalSummaryItems} item</strong> yang akan dikirim ke Merchant Portal.
                </p>
              </div>
              <button type="button" onClick={() => setShowPushConfirmModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg font-bold"
              >×</button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pushSummaryList.map(summary => (
                <div key={summary.branchId} className="rounded-xl border border-red-100 bg-red-50/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-red-100 pb-2">
                    <span className="font-bold text-slate-800 text-[15px]">{summary.branchName}</span>
                    <PlatformBadge platform={summary.platform} storeId={summary.storeId} />
                  </div>

                  <div className="space-y-2">
                    {summary.updates.map(u => (
                      <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-white p-2.5 border border-zinc-100 gap-1 text-[13px]">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 truncate">{u.name}</p>
                          <span className="text-[12px] text-slate-400 uppercase tracking-wider">{u.category}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="line-through text-slate-400">Rp {fmt(u.oldPrice)}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-slate-900">Rp {fmt(u.newPrice)}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[12px] font-bold ${u.diff > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            ({u.diff > 0 ? "+" : ""}{u.pct.toFixed(1)}%)
                          </span>
                          {u.isViolation && (
                            <span title={u.violationMsg} className="rounded bg-red-600 text-white text-[12px] font-bold px-1.5 py-0.5">! Batas</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button type="button" onClick={() => setShowPushConfirmModal(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[14px] rounded-xl transition-colors"
              >
                Batal
              </button>
              <button type="button" onClick={executePushFromModal}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-[14px] rounded-xl transition-colors shadow-md flex items-center gap-1.5"
              >
                <span>Konfirmasi & Push Update</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pop-up Success Modal ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowSuccessModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-red-100 text-center space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-8 ring-emerald-50/60">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Update mulai diproses</h3>
              <p className="text-[15px] text-zinc-500 mt-1">
                Job untuk <strong>{preview.length} brand</strong> sudah dikirim. Pantau status job di bagian bawah. Setelah job selesai, sistem akan otomatis melakukan tarik ulang menu untuk membandingkan kesesuaian harga.
              </p>
            </div>
            <button type="button" onClick={() => setShowSuccessModal(false)}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold text-[15px] py-2.5 rounded-xl transition-colors shadow-md"
            >
              Lihat status
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
