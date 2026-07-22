"use client";

import { useState, useEffect, useRef } from "react";

const fmt = (v) => (!v && v !== 0) ? "" : Number(v).toLocaleString("id-ID");
const parse = (s) => parseInt(String(s).replace(/\D/g, ""), 10) || 0;
const group = (items) => items.reduce((a, i) => { (a[i.category] ??= []).push(i); return a; }, {});

function applyAdj(price, mode, type, val) {
  const n = parseFloat(val) || 0;
  if (!n) return price;
  if (type === "pct") {
    const d = Math.round(price * n / 100);
    return mode === "add" ? price + d : Math.max(0, price - d);
  }
  return mode === "add" ? price + n : Math.max(0, price - n);
}

function checkViolation(platform, oldPrice, newPrice) {
  if (newPrice <= oldPrice) return { isViolation: false, message: "" };
  const diff = newPrice - oldPrice;
  const pct = (diff / oldPrice) * 100;
  
  if (platform === "gofood") {
    const limit = Math.min(oldPrice * 0.15, 5000);
    if (diff > limit) return { isViolation: true, message: "GoFood: Maksimal kenaikan 15% atau Rp 5.000 per item." };
  } else if (platform === "grab") {
    if (pct > 15) return { isViolation: true, message: "GrabFood: Maksimal kenaikan 15% (Maks. 10x percobaan per item, maks 15x sebulan)." };
  } else if (platform === "shopee") {
    if (pct > 25) return { isViolation: true, message: "ShopeeFood: Maksimal kenaikan 25% per 24 jam per item." };
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
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* mode */}
        <div className="inline-flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {[["add", "+"], ["sub", "−"]].map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-2 py-1 text-xs font-bold leading-none transition-colors ${
                mode === m
                  ? (m === "add" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")
                  : "bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              }`}
            >{label}</button>
          ))}
        </div>
        {/* type */}
        <div className="inline-flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {[["nominal", "Rp"], ["pct", "%"]].map(([t, label]) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-2 py-1 text-xs font-semibold leading-none transition-colors ${
                type === t ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              }`}
            >{label}</button>
          ))}
        </div>
        {/* input + apply */}
        <div className="flex items-center flex-1 min-w-0 gap-1.5">
          <input type="number" min="0"
            placeholder={type === "nominal" ? "1000" : "10"}
            value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fire(mode, type, val)}
            className="flex-1 min-w-[60px] border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
          />
          <button type="button" onClick={() => fire(mode, type, val)} disabled={!val}
            className="text-xs font-semibold px-3 py-1 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 shrink-0"
          >{buttonText}</button>
        </div>
      </div>
      {/* quick chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {chips.map((v) => (
          <button key={v} type="button"
            onClick={() => { setVal(String(v)); fire(mode, type, v); }}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
              mode === "add"
                ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                : "border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60"
            }`}
          >{mode === "add" ? "+" : "−"}{type === "nominal" ? fmt(v) : `${v}%`}</button>
        ))}
      </div>
    </div>
  );
}

function PlatformBadge({ platform, storeId, dark = false, className = "" }) {
  const p = (platform || "").toLowerCase();
  let dotColor = "bg-zinc-400";
  let labelColor = dark ? "text-zinc-300" : "text-zinc-700 dark:text-zinc-200";
  let storeColor = dark ? "text-zinc-400" : "text-zinc-400 dark:text-zinc-400";

  if (p.includes("gofood") || p.includes("go")) {
    dotColor = "bg-rose-500";
    labelColor = dark ? "text-rose-400" : "text-rose-600 dark:text-rose-400";
  } else if (p.includes("grab")) {
    dotColor = "bg-emerald-500";
    labelColor = dark ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400";
  } else if (p.includes("shopee")) {
    dotColor = "bg-orange-500";
    labelColor = dark ? "text-orange-400" : "text-orange-600 dark:text-orange-400";
  } else if (p.includes("all") || p.includes("semua")) {
    dotColor = "bg-indigo-500";
    labelColor = dark ? "text-indigo-300" : "text-indigo-600 dark:text-indigo-400";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono leading-none ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className={`font-bold tracking-tight ${labelColor}`}>{platform?.toUpperCase()}</span>
      {storeId && <span className={`font-medium ${storeColor}`}>· {storeId}</span>}
    </span>
  );
}

// ─── Branch Card ──────────────────────────────────────────────────────────────
function BranchCard({ branch, items = [], edits, onChange, onBulkAdj, onReset, onSave, onApplyToAll, totalBranches, saving, saved }) {
  const label = branch.brand || branch.nama_resto_final || branch.merchant_name;
  const groups = group(items);
  const changed = items.filter((i) => (edits[i.id] ?? i.price) !== i.price).length;
  const [showAdj, setShowAdj] = useState(false);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{label}</h3>
          <div className="mt-1">
            <PlatformBadge platform={branch.platform} storeId={branch.store_id} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {changed > 0 && (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-full">
              {changed}
            </span>
          )}
          <button type="button" onClick={() => setShowAdj(!showAdj)}
            title="Sesuaikan semua harga cabang ini"
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              showAdj ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* per-card adjust (toggle) */}
      {showAdj && (
        <div className="px-4 pb-3 border-t border-zinc-50 dark:border-zinc-800/80 pt-3">
          <AdjustBar onApply={(m, t, v) => onBulkAdj([branch.id], m, t, v)} buttonText="Terapkan" />
        </div>
      )}

      {/* menu items */}
      <div className="flex-1 overflow-y-auto max-h-64 px-4 pb-2">
        {items.length === 0 ? (
          branch.last_sync_at ? (
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-6">Tidak ada item menu ditemukan.</p>
          ) : (
            <div className="text-center py-6 px-3 bg-amber-50/50 dark:bg-amber-950/40 rounded-lg border border-dashed border-amber-200 dark:border-amber-900/60">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">⚠️ Menu belum di-sync</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Silakan lakukan tarik menu pada tab "Menu Pull" terlebih dahulu.</p>
            </div>
          )
        ) : (
          Object.entries(groups).map(([cat, items]) => (
            <div key={cat} className="mt-3 first:mt-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 mb-1.5">{cat}</p>
              <div className="space-y-1">
                {items.map((item) => {
                  const cur = edits[item.id] ?? item.price;
                  const diff = cur !== item.price;
                  const pct = item.price > 0 ? ((cur - item.price) / item.price) * 100 : 0;
                  const pctFmt = (pct > 0 ? "+" : "") + (Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)) + "%";
                  const { isViolation, message: violationMsg } = checkViolation(branch.platform, item.price, cur);

                  return (
                    <div key={item.id}
                      className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                        isViolation
                          ? "bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
                          : diff
                          ? "bg-amber-50 dark:bg-amber-950/40"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-1">
                          <p className={`text-xs truncate font-medium ${isViolation ? "text-rose-900 dark:text-rose-300 font-semibold" : "text-zinc-700 dark:text-zinc-200"}`}>{item.name}</p>
                          {isViolation && (
                            <span title={violationMsg} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold cursor-help shrink-0 shadow-sm">!</span>
                          )}
                        </div>
                        {diff && (
                          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="line-through text-zinc-400 dark:text-zinc-500 font-normal">Rp {fmt(item.price)}</span>
                            <span className="text-amber-500 font-bold">»</span>
                            <span className={`font-semibold ${isViolation ? "text-rose-700 dark:text-rose-400 font-bold" : "text-amber-700 dark:text-amber-400"}`}>Rp {fmt(cur)}</span>
                            <span className={`text-[9px] font-bold px-1 rounded ${
                              isViolation
                                ? "bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200"
                                : pct > 0 ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                            }`}>
                              ({pctFmt})
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] ${isViolation ? "text-rose-500 font-medium" : "text-zinc-400 dark:text-zinc-500"}`}>Rp</span>
                        <input type="text" inputMode="numeric"
                          value={fmt(cur)}
                          onChange={(e) => onChange(branch.id, item.id, e.target.value)}
                          className={`w-20 text-right text-xs font-semibold rounded-md px-2 py-1 border transition-colors focus:outline-none focus:ring-1 ${
                            isViolation
                              ? "border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300 bg-white dark:bg-zinc-800 focus:ring-rose-400 ring-1 ring-rose-300 dark:ring-rose-800"
                              : diff
                              ? "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-white dark:bg-zinc-800 focus:ring-amber-300"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/80 focus:ring-zinc-400 focus:bg-white dark:focus:bg-zinc-800"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* footer */}
      <div className="px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onReset(branch.id, items)}
            className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2 py-0.5 rounded transition-all shadow-sm"
          >Reset</button>
          {totalBranches > 1 && (
            <button type="button" onClick={() => onApplyToAll(branch.id)}
              title="Salin harga cabang ini ke semua cabang terpilih"
              className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2 py-0.5 rounded transition-colors"
            >
              Terapkan ke Semua Cabang
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-zinc-400 dark:text-zinc-500 animate-pulse">Menyimpan...</span>}
          {saved && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Tersimpan ✓</span>}
          <button type="button" onClick={() => onSave([branch.id])} disabled={saving}
            className="text-[10px] font-semibold px-2.5 py-1 rounded bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30"
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
      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${
        done ? "bg-emerald-500 text-white"
        : active ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
      }`}>{done ? "✓" : number}</span>
      <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
        active || done ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"
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
  const [selectedParents, setSelectedParents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [checkedIds, setCheckedIds] = useState([]);
  const [branchMenus, setBranchMenus] = useState({});
  const [edits, setEdits] = useState({});
  const [saveState, setSaveState] = useState({});

  const [openPlatformDropdown, setOpenPlatformDropdown] = useState(false);
  const [openOutletDropdown, setOpenOutletDropdown] = useState(false);
  const [openBranchDropdown, setOpenBranchDropdown] = useState(false);

  const [pushing, setPushing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPushConfirm, setShowPushConfirm] = useState(false);
  const [pushViolations, setPushViolations] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  
  const pollingIntervalsRef = useRef({});

  // fetch outlets
  useEffect(() => {
    if (!platform) {
      setAllOutlets([]); setUniqueParents([]); setSelectedParents([]);
      setBranches([]); setCheckedIds([]); setSearch(""); setEdits({}); setBranchMenus({});
      setOpenOutletDropdown(false); setOpenBranchDropdown(false);
      return;
    }
    setLoading(true);
    setAllOutlets([]); setUniqueParents([]); setSelectedParents([]);
    setBranches([]); setCheckedIds([]); setSearch(""); setEdits({}); setBranchMenus({});
    const url = platform === "all" ? `${API_BASE_URL}/api/outlets` : `${API_BASE_URL}/api/outlets?platform=${platform}`;
    fetch(url).then(r => r.json())
      .then(data => {
        setAllOutlets(data);
        setUniqueParents(Array.from(new Set(data.map(o => o.nama_outlet).filter(Boolean))).sort());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [platform, API_BASE_URL]);

  const fetchMenus = async (filteredBranches = branches) => {
    setLoading(true);
    const menusMap = {};
    const editsMap = {};
    await Promise.all(filteredBranches.map(async (b) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/outlets/${b.id}/menu-items`);
        if (res.ok) {
          const items = await res.json();
          menusMap[b.id] = items;
          editsMap[b.id] = {};
          items.forEach(i => { editsMap[b.id][i.id] = i.price; });
        } else {
          menusMap[b.id] = [];
        }
      } catch (err) {
        menusMap[b.id] = [];
      }
    }));
    setBranchMenus(menusMap);
    setEdits(editsMap);
    setLoading(false);
  };

  // update branches when parent changes
  useEffect(() => {
    if (selectedParents.length === 0) { setBranches([]); setCheckedIds([]); setBranchMenus({}); setEdits({}); return; }
    const filtered = allOutlets.filter(o => selectedParents.includes(o.nama_outlet));
    setBranches(filtered);
    setCheckedIds(filtered.map(b => b.id));
    fetchMenus(filtered);
  }, [selectedParents, allOutlets]);

  // Clean up polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const filtered = uniqueParents.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  const preview = branches.filter(b => checkedIds.includes(b.id));

  const toggleParent = (n) => {
    setSelectedParents(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
    setSaveState({});
  };

  const toggleAllParents = () => {
    if (selectedParents.length === uniqueParents.length) {
      setSelectedParents([]);
    } else {
      setSelectedParents([...uniqueParents]);
    }
    setSaveState({});
  };

  const toggleBranch = (id) => setCheckedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setCheckedIds(checkedIds.length === branches.length ? [] : branches.map(b => b.id));

  const changePrice = (bid, iid, raw) => {
    setEdits(p => ({ ...p, [bid]: { ...p[bid], [iid]: parse(raw) } }));
    setSaveState(p => ({ ...p, [bid]: null }));
  };

  const bulkAdj = (bids, mode, type, val) => {
    const targets = bids.length ? bids : checkedIds;
    setEdits(p => {
      const n = { ...p };
      targets.forEach(bid => {
        const items = branchMenus[bid] || [];
        const be = { ...(p[bid] || {}) };
        items.forEach(i => { be[i.id] = applyAdj(be[i.id] ?? i.price, mode, type, val); });
        n[bid] = be;
      });
      return n;
    });
    setSaveState(p => { const n = { ...p }; targets.forEach(id => { n[id] = null; }); return n; });
  };

  const startPollingJob = (jobId, branchName) => {
    if (pollingIntervalsRef.current[jobId]) {
      clearInterval(pollingIntervalsRef.current[jobId]);
    }

    pollingIntervalsRef.current[jobId] = setInterval(() => {
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
            clearInterval(pollingIntervalsRef.current[jobId]);
            delete pollingIntervalsRef.current[jobId];
            fetchMenus();
          }
        })
        .catch((err) => {
          console.error(err);
          clearInterval(pollingIntervalsRef.current[jobId]);
          delete pollingIntervalsRef.current[jobId];
        });
    }, 2000);
  };

  const triggerPriceUpdate = async (bidsToUpdate) => {
    setPushing(true);
    const targets = Array.isArray(bidsToUpdate) ? bidsToUpdate : [bidsToUpdate];
    const newJobsList = [];

    for (const bid of targets) {
      const branch = branches.find(x => x.id === bid);
      if (!branch) continue;
      const label = branch.brand || branch.nama_resto_final || branch.merchant_name;

      const branchEdits = edits[bid] || {};
      const branchItems = branchMenus[bid] || [];
      const updates = [];

      branchItems.forEach(i => {
        const curPrice = branchEdits[i.id];
        if (curPrice !== undefined && curPrice !== i.price) {
          updates.push({
            item_id: i.id,
            category_id: i.category_id || "",
            new_price: curPrice
          });
        }
      });

      if (updates.length === 0) continue;

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
          startPollingJob(job.id, label);
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

    if (newJobsList.length > 0) {
      setActiveJobs(p => [...newJobsList, ...p]);
    }
    setPushing(false);
  };

  const checkAndPushToOFD = () => {
    const violations = [];
    preview.forEach(b => {
      const items = branchMenus[b.id] || [];
      items.forEach(item => {
        const cur = edits[b.id]?.[item.id] ?? item.price;
        const { isViolation } = checkViolation(b.platform, item.price, cur);
        if (isViolation) violations.push(item.name);
      });
    });

    if (violations.length > 0) {
      setPushViolations(violations);
      setShowPushConfirm(true);
    } else {
      executePush();
    }
  };

  const executePush = async () => {
    setShowPushConfirm(false);
    await triggerPriceUpdate(checkedIds);
    setShowSuccessModal(true);
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

  return (
    <main className="flex flex-col gap-6">
      {/* ── Top: Controls ── */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-5 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

          {/* 1: Aplikator */}
          <div className="relative">
            <StepLabel number={1} label="Aplikator" active={!platform} done={!!platform} />
            <button type="button"
              onClick={() => {
                setOpenPlatformDropdown(!openPlatformDropdown);
                setOpenOutletDropdown(false);
                setOpenBranchDropdown(false);
              }}
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-left font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all shadow-sm"
            >
              <span className="truncate flex items-center gap-1.5">
                {platform ? (
                  <PlatformBadge platform={platform === "all" ? "Semua Aplikator" : platform} />
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
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-1.5 space-y-0.5 animate-scale-up">
                  {[
                    ["shopee", "ShopeeFood"],
                    ["gofood", "GoFood"],
                    ["grab", "GrabFood"],
                    ["all", "Semua Aplikator"]
                  ].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => {
                        setPlatform(val);
                        setOpenPlatformDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-all ${
                        platform === val
                          ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <PlatformBadge platform={val === "all" ? "Semua Aplikator" : val} dark={platform === val} />
                      {platform === val && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 2: Outlet (Multi-select) */}
          <div className="relative">
            <StepLabel number={2} label={`Outlet ${selectedParents.length > 0 ? `(${selectedParents.length})` : ""}`} active={!!platform && selectedParents.length === 0} done={selectedParents.length > 0} />
            <button type="button"
              disabled={!platform || loading}
              onClick={() => {
                setOpenOutletDropdown(!openOutletDropdown);
                setOpenPlatformDropdown(false);
                setOpenBranchDropdown(false);
              }}
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-left font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-40 transition-all shadow-sm"
            >
              <span className={`truncate ${selectedParents.length > 0 ? "text-zinc-800 dark:text-zinc-100 font-semibold" : "text-zinc-400 dark:text-zinc-400"}`}>
                {loading
                  ? "Memuat..."
                  : !platform
                  ? "Pilih Aplikator dulu"
                  : selectedParents.length === 0
                  ? "Pilih Outlet..."
                  : selectedParents.length === uniqueParents.length
                  ? `Semua Outlet (${uniqueParents.length})`
                  : `${selectedParents.length} dari ${uniqueParents.length} Outlet`}
              </span>
              <svg className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${openOutletDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openOutletDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenOutletDropdown(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-2.5 space-y-2 animate-scale-up min-w-[240px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Terpilih ({selectedParents.length}/{uniqueParents.length})
                    </span>
                    <button type="button" onClick={toggleAllParents}
                      className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {selectedParents.length === uniqueParents.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>

                  <input type="text" placeholder="Cari outlet..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1 text-xs bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />

                  <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                    {filtered.length === 0 ? (
                      <p className="text-center text-xs text-zinc-400 py-3">Tidak ada outlet cocok</p>
                    ) : (
                      filtered.map(name => {
                        const on = selectedParents.includes(name);
                        return (
                          <label key={name} className="flex items-center space-x-2 px-2 py-1 rounded-md text-xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                            <input type="checkbox" checked={on} onChange={() => toggleParent(name)} className="accent-zinc-800 dark:accent-zinc-100 rounded" />
                            <span className={`truncate ${on ? "text-zinc-800 dark:text-zinc-100 font-medium" : "text-zinc-600 dark:text-zinc-400"}`}>{name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3: Cabang */}
          <div className="relative">
            <StepLabel number={3} label={`Cabang ${branches.length > 0 ? `(${checkedIds.length})` : ""}`} active={selectedParents.length > 0} done={checkedIds.length > 0} />
            <button type="button"
              disabled={selectedParents.length === 0}
              onClick={() => {
                setOpenBranchDropdown(!openBranchDropdown);
                setOpenPlatformDropdown(false);
                setOpenOutletDropdown(false);
              }}
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-left font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-40 transition-all shadow-sm"
            >
              <span className="truncate text-zinc-800 dark:text-zinc-100 font-semibold">
                {selectedParents.length === 0
                  ? "Pilih Outlet dulu"
                  : checkedIds.length === branches.length
                  ? `Semua Cabang (${branches.length})`
                  : `${checkedIds.length} dari ${branches.length} Cabang`}
              </span>
              <svg className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${openBranchDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openBranchDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenBranchDropdown(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-2.5 space-y-2 animate-scale-up min-w-[260px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Terpilih ({checkedIds.length}/{branches.length})
                    </span>
                    <button type="button" onClick={toggleAll}
                      className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {checkedIds.length === branches.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                    {branches.map(b => {
                      const on = checkedIds.includes(b.id);
                      const l = b.brand || b.nama_resto_final || b.merchant_name;
                      return (
                        <label key={b.id} className="flex items-start space-x-2 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                          <input type="checkbox" checked={on} onChange={() => toggleBranch(b.id)} className="accent-zinc-800 dark:accent-zinc-100 rounded mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className={`block truncate ${on ? "text-zinc-800 dark:text-zinc-100 font-medium" : "text-zinc-600 dark:text-zinc-400"}`}>{l}</span>
                            <div className="mt-0.5">
                              <PlatformBadge platform={b.platform} storeId={b.store_id} dark={on} />
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── Middle: Global Bulk Adjust ── */}
      {preview.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div>
            <StepLabel number={4} label="Sesuaikan Semua" active={true} done={false} className="mb-1" />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-400 ml-7">
              Terapkan ke <strong>{preview.length} cabang</strong> sekaligus.
            </p>
          </div>
          <div className="shrink-0 bg-zinc-50/50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 flex flex-col gap-2.5">
            <AdjustBar onApply={(m, t, v) => bulkAdj([], m, t, v)} buttonText="Terapkan untuk Semua" />

            <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2">
              <button type="button" onClick={resetAll}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 rounded-md transition-colors shrink-0"
              >
                Reset Harga
              </button>
              <button type="button" onClick={checkAndPushToOFD} disabled={pushing}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {pushing ? "Memproses Push ke OFD..." : `Push Update Harga ke OFD (${preview.length} Cabang)`}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Active Jobs Section ── */}
      {activeJobs.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-5 space-y-4 transition-colors">
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
            Status Pembaruan Harga ke Merchant Portal
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {activeJobs.map(job => (
              <div key={job.id} className="border border-zinc-150 dark:border-zinc-800 p-4 rounded-lg flex flex-col gap-2.5 bg-zinc-50/40 dark:bg-zinc-800/40">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{job.name}</div>
                    <div className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                      JOB ID: {job.id} · PLATFORM: {job.platform?.toUpperCase()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    job.status === "SUCCESS" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" :
                    job.status === "FAILED" ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300" :
                    "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                  }`}>{job.status}</span>
                </div>
                
                {/* progress bar */}
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${
                    job.status === "SUCCESS" ? "bg-emerald-500" :
                    job.status === "FAILED" ? "bg-rose-500" :
                    "bg-amber-500"
                  }`} style={{ width: `${job.progress_pct}%` }} />
                </div>
                
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  {job.current_step || "Mengantre..."}
                </div>
                {job.error_message && (
                  <div className="text-[10px] text-rose-500 font-mono">
                    Error: {job.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom: Cards ── */}
      <section>
        {preview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-16 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pilih outlet dan cabang di atas</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Harga menu akan muncul di sini</p>
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
                onChange={changePrice} onBulkAdj={bulkAdj}
                onReset={resetOne} onSave={triggerPriceUpdate}
                onApplyToAll={applyBranchToAll}
                totalBranches={preview.length}
                saving={saveState[branch.id] === "saving"}
                saved={saveState[branch.id] === "saved"}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Pop-up Push Confirmation Modal ── */}
      {showPushConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowPushConfirm(false)}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-100 dark:border-zinc-800 text-center space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Peringatan Limitasi OFD</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Terdapat <strong>{pushViolations.length} item</strong> yang melebihi batas maksimal kenaikan harga OFD (GoFood 15%/5k, Grab 15%, Shopee 25%).
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 italic">
                Apakah Anda yakin ingin tetap memproses push update harga ini?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setShowPushConfirm(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Batal
              </button>
              <button type="button" onClick={executePush}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Tetap Push
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
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-100 dark:border-zinc-800 text-center space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Update Harga Berhasil!</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Perubahan harga telah sukses diproses dan di-update ke OFD untuk <strong>{preview.length} cabang</strong>.
              </p>
            </div>
            <button type="button" onClick={() => setShowSuccessModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-md"
            >
              OK, Mengerti
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
