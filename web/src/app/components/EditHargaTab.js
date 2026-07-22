"use client";

import { useState, useEffect } from "react";

// ─── Dummy data ───────────────────────────────────────────────────────────────
const DUMMY_MENU = {
  "AGSA – Ayam Geprek Suroboyo Ampel": [
    { id: "m1", category: "Ayam", name: "Ayam Geprek Original", price: 25000 },
    { id: "m2", category: "Ayam", name: "Ayam Geprek Keju", price: 28000 },
    { id: "m3", category: "Ayam", name: "Ayam Geprek Mozarella", price: 32000 },
    { id: "m4", category: "Minuman", name: "Es Teh Manis", price: 5000 },
    { id: "m5", category: "Minuman", name: "Es Jeruk", price: 7000 },
    { id: "m6", category: "Tambahan", name: "Nasi Putih", price: 5000 },
    { id: "m7", category: "Tambahan", name: "Tempe Goreng", price: 4000 },
  ],
  "Ayam Bakar Ori": [
    { id: "m8",  category: "Ayam Bakar", name: "Ayam Bakar Madu", price: 30000 },
    { id: "m9",  category: "Ayam Bakar", name: "Ayam Bakar Kecap", price: 28000 },
    { id: "m10", category: "Ayam Bakar", name: "Paket Hemat", price: 35000 },
    { id: "m11", category: "Minuman", name: "Es Teh Manis", price: 5000 },
    { id: "m12", category: "Minuman", name: "Jus Alpukat", price: 12000 },
  ],
  default: [
    { id: "d1", category: "Menu Utama", name: "Paket Nasi Ayam", price: 25000 },
    { id: "d2", category: "Menu Utama", name: "Paket Nasi Ikan", price: 22000 },
    { id: "d3", category: "Minuman", name: "Es Teh Manis", price: 5000 },
    { id: "d4", category: "Minuman", name: "Air Mineral", price: 4000 },
    { id: "d5", category: "Snack", name: "Kentang Goreng", price: 10000 },
  ],
};

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
        <div className="inline-flex rounded-md overflow-hidden border border-zinc-200">
          {[["add", "+"], ["sub", "−"]].map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-2 py-1 text-xs font-bold leading-none transition-colors ${
                mode === m
                  ? (m === "add" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")
                  : "bg-white text-zinc-400 hover:text-zinc-600"
              }`}
            >{label}</button>
          ))}
        </div>
        {/* type */}
        <div className="inline-flex rounded-md overflow-hidden border border-zinc-200">
          {[["nominal", "Rp"], ["pct", "%"]].map(([t, label]) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-2 py-1 text-xs font-semibold leading-none transition-colors ${
                type === t ? "bg-zinc-800 text-white" : "bg-white text-zinc-400 hover:text-zinc-600"
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
            className="flex-1 min-w-[60px] border border-zinc-200 rounded-md px-2 py-1 text-xs text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-300"
          />
          <button type="button" onClick={() => fire(mode, type, val)} disabled={!val}
            className="text-xs font-semibold px-3 py-1 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 transition-colors disabled:opacity-30 shrink-0"
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
                ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                : "border-rose-200 text-rose-600 hover:bg-rose-50"
            }`}
          >{mode === "add" ? "+" : "−"}{type === "nominal" ? fmt(v) : `${v}%`}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Branch Card ──────────────────────────────────────────────────────────────
function BranchCard({ branch, edits, onChange, onBulkAdj, onReset, onSave, onApplyToAll, totalBranches, saving, saved }) {
  const label = branch.brand || branch.nama_resto_final || branch.merchant_name;
  const items = DUMMY_MENU[label] || DUMMY_MENU["default"];
  const groups = group(items);
  const changed = items.filter((i) => (edits[i.id] ?? i.price) !== i.price).length;
  const [showAdj, setShowAdj] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
      {/* header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-800 truncate">{label}</h3>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
            {branch.platform?.toUpperCase()} · {branch.store_id || "—"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {changed > 0 && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              {changed}
            </span>
          )}
          <button type="button" onClick={() => setShowAdj(!showAdj)}
            title="Sesuaikan semua harga cabang ini"
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              showAdj ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
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
        <div className="px-4 pb-3 border-t border-zinc-50 pt-3">
          <AdjustBar onApply={(m, t, v) => onBulkAdj([branch.id], m, t, v)} buttonText="Terapkan" />
        </div>
      )}

      {/* menu items */}
      <div className="flex-1 overflow-y-auto max-h-64 px-4 pb-2">
        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat} className="mt-3 first:mt-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 mb-1.5">{cat}</p>
            <div className="space-y-1">
              {items.map((item) => {
                const cur = edits[item.id] ?? item.price;
                const diff = cur !== item.price;
                const pct = item.price > 0 ? ((cur - item.price) / item.price) * 100 : 0;
                const pctFmt = (pct > 0 ? "+" : "") + (Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)) + "%";

                return (
                  <div key={item.id}
                    className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                      diff ? "bg-amber-50" : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs text-zinc-700 truncate font-medium">{item.name}</p>
                      {diff && (
                        <p className="text-[10px] font-medium text-amber-700 flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="line-through text-zinc-400 font-normal">Rp {fmt(item.price)}</span>
                          <span className="text-amber-500 font-bold">»</span>
                          <span className="font-semibold text-amber-700">Rp {fmt(cur)}</span>
                          <span className={`text-[9px] font-bold px-1 rounded ${
                            pct > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            ({pctFmt})
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-zinc-400">Rp</span>
                      <input type="text" inputMode="numeric"
                        value={fmt(cur)}
                        onChange={(e) => onChange(branch.id, item.id, e.target.value)}
                        className={`w-20 text-right text-xs font-semibold rounded-md px-2 py-1 border transition-colors focus:outline-none focus:ring-1 ${
                          diff
                            ? "border-amber-300 text-amber-700 bg-white focus:ring-amber-300"
                            : "border-zinc-200 text-zinc-700 bg-zinc-50 focus:ring-zinc-400 focus:bg-white"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="px-4 py-2.5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onReset(branch.id, items)}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
          >Reset</button>
          {totalBranches > 1 && (
            <button type="button" onClick={() => onApplyToAll(branch.id)}
              title="Salin harga cabang ini ke semua cabang terpilih"
              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
            >
              Terapkan ke Semua Cabang
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <button type="button" onClick={() => onSave(branch.id)}
            disabled={saving || changed === 0}
            className="text-[11px] font-semibold px-3 py-1 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 transition-colors disabled:opacity-30"
          >{saving ? "..." : `Simpan`}</button>
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
        : active ? "bg-zinc-800 text-white"
        : "bg-zinc-100 text-zinc-400"
      }`}>{done ? "✓" : number}</span>
      <span className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
        active || done ? "text-zinc-700" : "text-zinc-300"
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
  const [checkedIds, setCheckedIds] = useState([]);
  const [edits, setEdits] = useState({});
  const [saveState, setSaveState] = useState({});

  // fetch outlets
  useEffect(() => {
    if (!platform) {
      setAllOutlets([]); setUniqueParents([]); setSelectedParent("");
      setBranches([]); setCheckedIds([]); setSearch(""); setEdits({});
      return;
    }
    setLoading(true);
    setAllOutlets([]); setUniqueParents([]); setSelectedParent("");
    setBranches([]); setCheckedIds([]); setSearch(""); setEdits({});
    const url = platform === "all" ? `${API_BASE_URL}/api/outlets` : `${API_BASE_URL}/api/outlets?platform=${platform}`;
    fetch(url).then(r => r.json())
      .then(data => {
        setAllOutlets(data);
        setUniqueParents(Array.from(new Set(data.map(o => o.nama_outlet).filter(Boolean))).sort());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [platform, API_BASE_URL]);

  // update branches when parent changes
  useEffect(() => {
    if (!selectedParent) { setBranches([]); setCheckedIds([]); return; }
    const filtered = allOutlets.filter(o => o.nama_outlet === selectedParent);
    setBranches(filtered);
    setCheckedIds(filtered.map(b => b.id));
    const e = {};
    filtered.forEach(b => {
      const l = b.brand || b.nama_resto_final || b.merchant_name;
      const items = DUMMY_MENU[l] || DUMMY_MENU["default"];
      e[b.id] = {};
      items.forEach(i => { e[b.id][i.id] = i.price; });
    });
    setEdits(e);
  }, [selectedParent, allOutlets]);

  const filtered = uniqueParents.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  const preview = branches.filter(b => checkedIds.includes(b.id));

  const selectParent = (n) => { setSelectedParent(n); setSaveState({}); };
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
        const b = branches.find(x => x.id === bid); if (!b) return;
        const l = b.brand || b.nama_resto_final || b.merchant_name;
        const items = DUMMY_MENU[l] || DUMMY_MENU["default"];
        const be = { ...(p[bid] || {}) };
        items.forEach(i => { be[i.id] = applyAdj(be[i.id] ?? i.price, mode, type, val); });
        n[bid] = be;
      });
      return n;
    });
    setSaveState(p => { const n = { ...p }; targets.forEach(id => { n[id] = null; }); return n; });
  };

  const [pushing, setPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  const pushToOFD = () => {
    setPushing(true);
    setPushSuccess(false);
    setTimeout(() => {
      setPushing(false);
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3500);
    }, 1500);
  };

  const resetOne = (bid, items) => {
    const r = {}; items.forEach(i => { r[i.id] = i.price; });
    setEdits(p => ({ ...p, [bid]: r }));
    setSaveState(p => ({ ...p, [bid]: null }));
  };

  const applyBranchToAll = (sourceBranchId) => {
    const sourceEdits = edits[sourceBranchId];
    if (!sourceEdits) return;
    setEdits(p => {
      const n = { ...p };
      checkedIds.forEach(bid => {
        if (bid !== sourceBranchId) {
          n[bid] = { ...sourceEdits };
        }
      });
      return n;
    });
    setSaveState(p => {
      const n = { ...p };
      checkedIds.forEach(id => { n[id] = null; });
      return n;
    });
  };

  const resetAll = () => {
    if (!window.confirm(`Reset harga semua ${preview.length} cabang?`)) return;
    setEdits(p => {
      const n = { ...p };
      preview.forEach(b => {
        const l = b.brand || b.nama_resto_final || b.merchant_name;
        const items = DUMMY_MENU[l] || DUMMY_MENU["default"];
        const r = {}; items.forEach(i => { r[i.id] = i.price; }); n[b.id] = r;
      });
      return n;
    });
    setSaveState({});
  };

  const save = (bid) => {
    setSaveState(p => ({ ...p, [bid]: "saving" }));
    setTimeout(() => setSaveState(p => ({ ...p, [bid]: "saved" })), 1200);
  };

  return (
    <main className="flex flex-col gap-6">
      {/* ── Top: Controls ── */}
      <section className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

          {/* 1: Aplikator */}
          <div>
            <StepLabel number={1} label="Aplikator" active={!platform} done={!!platform} />
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="">Pilih Aplikator</option>
              <option value="shopee">ShopeeFood</option>
              <option value="gofood">GoFood</option>
              <option value="grab">GrabFood</option>
              <option value="all">Semua Aplikator</option>
            </select>
          </div>

          {/* 2: Outlet */}
          <div>
            <StepLabel number={2} label="Outlet" active={!!platform && !selectedParent} done={!!selectedParent} />
            {!platform ? (
              <div className="h-9 rounded-lg border border-dashed border-zinc-200 flex items-center justify-center text-[11px] text-zinc-300">
                —
              </div>
            ) : (
              <div className="space-y-1.5">
                <input type="text" placeholder="Cari..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-300"
                />
                <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-200 p-1 space-y-0.5">
                  {loading ? (
                    <p className="text-[11px] text-zinc-300 text-center py-2">Memuat...</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-[11px] text-zinc-300 text-center py-2">Tidak ditemukan</p>
                  ) : filtered.map(name => (
                    <button key={name} type="button" onClick={() => selectParent(name)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all ${
                        selectedParent === name
                          ? "bg-zinc-800 text-white font-medium"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >{name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3: Cabang */}
          <div>
            <div className="flex items-center justify-between">
              <StepLabel number={3} label={`Cabang${branches.length ? ` (${checkedIds.length})` : ""}`}
                active={!!selectedParent && checkedIds.length === 0} done={checkedIds.length > 0} />
              {branches.length > 0 && (
                <button type="button" onClick={toggleAll}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 underline mb-2.5 transition-colors"
                >{checkedIds.length === branches.length ? "Batal" : "Semua"}</button>
              )}
            </div>
            {!selectedParent ? (
              <div className="h-9 rounded-lg border border-dashed border-zinc-200 flex items-center justify-center text-[11px] text-zinc-300">
                —
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-200 p-1.5 space-y-1">
                {branches.map(b => {
                  const l = b.brand || b.nama_resto_final || b.merchant_name;
                  const on = checkedIds.includes(b.id);
                  return (
                    <label key={b.id} className={`flex items-center gap-2 text-xs cursor-pointer rounded-md px-2 py-1.5 transition-all ${
                      on ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-50"
                    }`}>
                      <input type="checkbox" checked={on} onChange={() => toggleBranch(b.id)}
                        className="accent-white" />
                      <div className="min-w-0 leading-tight">
                        <div className="font-medium truncate">{l}</div>
                        <div className={`text-[9px] font-mono ${on ? "text-zinc-400" : "text-zinc-400"}`}>
                          {b.platform?.toUpperCase()} · {b.store_id || "—"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── Middle: Global Bulk Adjust ── */}
      {preview.length > 0 && (
        <section className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-1">
              <StepLabel number={4} label="Sesuaikan Semua" active={true} done={false} className="mb-0" />
              <button type="button" onClick={resetAll}
                className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 underline transition-colors"
              >
                Reset Semua Harga
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 ml-7">
              Terapkan ke <strong>{preview.length} cabang</strong> sekaligus.
            </p>
          </div>
          <div className="shrink-0 bg-zinc-50/50 p-2.5 rounded-lg border border-zinc-100 flex flex-col gap-2.5">
            <AdjustBar onApply={(m, t, v) => bulkAdj([], m, t, v)} buttonText="Terapkan untuk Semua" />

            <div className="pt-2 border-t border-zinc-200/80 flex flex-col gap-1.5">
              <button type="button" onClick={pushToOFD} disabled={pushing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {pushing ? "Memproses Push ke OFD..." : `Push Update Harga ke OFD (${preview.length} Cabang)`}
              </button>
              {pushSuccess && (
                <p className="text-[10px] font-semibold text-emerald-600 text-center">
                  ✓ Harga berhasil di-update ke OFD!
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom: Cards ── */}
      <section>
        {preview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-16 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500">Pilih outlet dan cabang di atas</p>
            <p className="text-xs text-zinc-400 mt-0.5">Harga menu akan muncul di sini</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            preview.length === 1 ? "grid-cols-1 max-w-lg" :
            preview.length === 2 ? "grid-cols-1 lg:grid-cols-2" :
            "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
          }`}>
            {preview.map(branch => (
              <BranchCard key={branch.id} branch={branch}
                edits={edits[branch.id] || {}}
                onChange={changePrice} onBulkAdj={bulkAdj}
                onReset={resetOne} onSave={save}
                onApplyToAll={applyBranchToAll}
                totalBranches={preview.length}
                saving={saveState[branch.id] === "saving"}
                saved={saveState[branch.id] === "saved"}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
