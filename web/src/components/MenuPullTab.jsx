import { useState, useEffect, useRef } from "react";
import PlatformBadge from "./PlatformBadge";

const PLATFORM_OPTIONS = ["shopee", "gofood", "grab"];

function StepLabel({ number, label, active, done }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors ${
        done ? "bg-red-700 text-white"
          : active ? "bg-red-100 text-red-700 ring-4 ring-red-50"
            : "bg-slate-100 text-slate-400"
      }`}>{done ? "✓" : number}</span>
      <span className={`text-[15px] font-bold uppercase tracking-wider ${active || done ? "text-slate-700" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

export default function MenuPullTab({ API_BASE_URL }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [allOutlets, setAllOutlets] = useState([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Parent name selection (Multi-Select)
  const [uniqueParentNames, setUniqueParentNames] = useState([]);
  const [checkedParentNames, setCheckedParentNames] = useState([]);

  // Branch list and check state (Multi-Select)
  const [availableBranches, setAvailableBranches] = useState([]);
  const [checkedBranchIds, setCheckedBranchIds] = useState([]);
  const [openPlatformDropdown, setOpenPlatformDropdown] = useState(false);
  const [openOutletDropdown, setOpenOutletDropdown] = useState(false);
  const [openBranchDropdown, setOpenBranchDropdown] = useState(false);

  // Active jobs tracked list
  const [activeJobs, setActiveJobs] = useState([]);
  
  const pollingIntervalsRef = useRef({});

  // Fetch outlets based on selected platforms
  useEffect(() => {
    if (selectedPlatforms.length === 0) {
      setAllOutlets([]);
      setUniqueParentNames([]);
      setCheckedParentNames([]);
      setAvailableBranches([]);
      setCheckedBranchIds([]);
      setSearchQuery("");
      return;
    }

    const controller = new AbortController();
    setLoadingOutlets(true);
    setAllOutlets([]);
    setUniqueParentNames([]);
    setCheckedParentNames([]);
    setAvailableBranches([]);
    setCheckedBranchIds([]);
    setSearchQuery("");

    const params = new URLSearchParams();
    selectedPlatforms.forEach((platform) => params.append("platform", platform));
    const url = `${API_BASE_URL}/api/outlets?${params.toString()}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch outlets");
        return res.json();
      })
      .then((data) => {
        setAllOutlets(data);
        
        // Extract unique parent names (nama_outlet)
        const parents = Array.from(new Set(data.map((o) => o.nama_outlet).filter(Boolean))).sort();
        setUniqueParentNames(parents);
        
        // Check all parents by default
        setCheckedParentNames(parents);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        alert("Gagal memuat daftar outlet dari server.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingOutlets(false);
      });

    return () => controller.abort();
  }, [selectedPlatforms, API_BASE_URL]);

  // Update available branches when checkedParentNames or allOutlets changes
  useEffect(() => {
    if (selectedPlatforms.length === 0) {
      setAvailableBranches([]);
      setCheckedBranchIds([]);
      return;
    }

    // Filter branches whose parent name is in checkedParentNames
    const filtered = allOutlets.filter((o) => checkedParentNames.includes(o.nama_outlet));
    setAvailableBranches(filtered);
    
    // Automatically check all branches of the selected parents
    setCheckedBranchIds(filtered.map((b) => b.id));
  }, [checkedParentNames, allOutlets, selectedPlatforms]);

  // Clean up all polling intervals on unmount
  useEffect(() => {
    const pollingIntervals = pollingIntervalsRef.current;
    return () => {
      Object.values(pollingIntervals).forEach(clearInterval);
    };
  }, []);

  // Filtered parent names based on search query
  const filteredParents = uniqueParentNames.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const allFilteredParentsChecked = filteredParents.length > 0
    && filteredParents.every((name) => checkedParentNames.includes(name));

  const handlePlatformCheck = (value) => {
    setSelectedPlatforms((current) => current.includes(value)
      ? current.filter((platform) => platform !== value)
      : [...current, value]);
  };

  const handleSelectAllPlatforms = () => {
    setSelectedPlatforms((current) => current.length === PLATFORM_OPTIONS.length ? [] : [...PLATFORM_OPTIONS]);
  };

  // Toggle single parent name checkbox
  const handleParentCheck = (parentName) => {
    setCheckedParentNames((prev) =>
      prev.includes(parentName)
        ? prev.filter((name) => name !== parentName)
        : [...prev, parentName]
    );
  };

  // Toggle select all parents (targets currently filtered visible items)
  const handleSelectAllParents = () => {
    if (allFilteredParentsChecked) {
      // Uncheck only the filtered parents
      setCheckedParentNames((prev) => prev.filter((name) => !filteredParents.includes(name)));
    } else {
      // Check all filtered parents
      setCheckedParentNames((prev) => {
        const newSelection = [...prev];
        filteredParents.forEach((name) => {
          if (!newSelection.includes(name)) {
            newSelection.push(name);
          }
        });
        return newSelection;
      });
    }
  };

  // Toggle single branch checkbox
  const handleBranchCheck = (branchId) => {
    setCheckedBranchIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  // Toggle select all branches
  const handleSelectAllBranches = () => {
    if (checkedBranchIds.length === availableBranches.length) {
      setCheckedBranchIds([]);
    } else {
      setCheckedBranchIds(availableBranches.map((b) => b.id));
    }
  };

  // Poll progress for a specific job
  const startPollingJob = (jobId) => {
    if (pollingIntervalsRef.current[jobId]) {
      clearInterval(pollingIntervalsRef.current[jobId]);
    }

    pollingIntervalsRef.current[jobId] = setInterval(() => {
      fetch(`${API_BASE_URL}/api/jobs/${jobId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch job status");
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
                    result_metadata: job.result_metadata,
                  }
                : j
            )
          );

          if (job.status === "SUCCESS" || job.status === "FAILED") {
            clearInterval(pollingIntervalsRef.current[jobId]);
            delete pollingIntervalsRef.current[jobId];
            
            // Check if all active jobs are done to reset triggering state
            const stillRunning = Object.keys(pollingIntervalsRef.current).length > 0;
            if (!stillRunning) {
              setTriggering(false);
            }
          }
        })
        .catch((err) => {
          console.error(err);
          clearInterval(pollingIntervalsRef.current[jobId]);
          delete pollingIntervalsRef.current[jobId];
          if (Object.keys(pollingIntervalsRef.current).length === 0) {
            setTriggering(false);
          }
        });
    }, 2000);
  };

  // Trigger Pull Jobs for all checked branches
  const handleTriggerPull = async (e) => {
    e.preventDefault();
    if (checkedBranchIds.length === 0) return;

    setTriggering(true);

    // Filter branches details that are checked
    const targets = availableBranches.filter((b) => checkedBranchIds.includes(b.id));
    
    // Prepare jobs container
    const newJobsList = [];

    for (const target of targets) {
      const branchLabel = target.brand || target.nama_resto_final || target.merchant_name;
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs/pull?outlet_id=${target.id}`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Failed to trigger job");
        const job = await res.json();

        newJobsList.push({
          id: job.id,
          name: branchLabel,
          platform: target.platform,
          status: job.status,
          progress_pct: job.progress_pct,
          current_step: job.current_step,
          error_message: null,
        });

        startPollingJob(job.id);
      } catch (err) {
        console.error(err);
        newJobsList.push({
          id: `err-${Math.random()}`,
          name: branchLabel,
          platform: target.platform,
          status: "FAILED",
          progress_pct: 0,
          current_step: "Gagal memicu tugas di backend.",
          error_message: err.message,
        });
      }
    }

    setActiveJobs((prev) => [...newJobsList, ...prev]);
    if (Object.keys(pollingIntervalsRef.current).length === 0) {
      setTriggering(false);
    }
  };

  return (
    <main className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      {/* Left Form: Selectors */}
      <section className="surface-card min-w-0 h-fit space-y-6 p-5 sm:p-6 xl:col-span-2">
        <div className="border-b border-red-100 pb-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-red-600">Langkah 1</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Pilih menu sumber</h2>
          <p className="mt-1 text-[15px] leading-6 text-slate-500">Ambil data menu terbaru sebelum melakukan perubahan harga.</p>
        </div>
        
        <form onSubmit={handleTriggerPull} className="space-y-5">
          <div className="relative">
            <StepLabel number={1} label={`Aplikator ${selectedPlatforms.length ? `(${selectedPlatforms.length})` : ""}`} active={selectedPlatforms.length === 0} done={selectedPlatforms.length > 0} />
            <button
              type="button"
              disabled={triggering}
              onClick={() => {
                setOpenPlatformDropdown(!openPlatformDropdown);
                setOpenOutletDropdown(false);
                setOpenBranchDropdown(false);
              }}
              className="field-control flex items-center justify-between text-left font-medium"
              aria-expanded={openPlatformDropdown}
            >
              {selectedPlatforms.length > 0 ? (
                <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                  {selectedPlatforms.map((platform) => <PlatformBadge key={platform} platform={platform} />)}
                </span>
              ) : (
                <span className="text-slate-400">Pilih Aplikator...</span>
              )}
              <svg className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${openPlatformDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openPlatformDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenPlatformDropdown(false)} />
                <div className="absolute left-0 right-0 top-full z-30 mt-1 space-y-1 rounded-xl border border-red-100 bg-white p-2.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-1 pb-2">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">Terpilih ({selectedPlatforms.length}/{PLATFORM_OPTIONS.length})</span>
                    <button type="button" onClick={handleSelectAllPlatforms} className="text-[13px] font-bold text-red-700 hover:underline">
                      {selectedPlatforms.length === PLATFORM_OPTIONS.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>
                  {PLATFORM_OPTIONS.map((value) => {
                    const checked = selectedPlatforms.includes(value);
                    return (
                      <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-slate-50">
                        <input type="checkbox" checked={checked} onChange={() => handlePlatformCheck(value)} className="h-4 w-4 accent-red-700" />
                        <PlatformBadge platform={value} selected={checked} />
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <StepLabel number={2} label={`Outlet ${checkedParentNames.length ? `(${checkedParentNames.length})` : ""}`} active={selectedPlatforms.length > 0 && checkedParentNames.length === 0} done={checkedParentNames.length > 0} />
            <button
              type="button"
              disabled={selectedPlatforms.length === 0 || loadingOutlets || triggering}
              onClick={() => {
                setOpenOutletDropdown(!openOutletDropdown);
                setOpenPlatformDropdown(false);
                setOpenBranchDropdown(false);
              }}
              className="field-control flex items-center justify-between text-left font-medium"
              aria-expanded={openOutletDropdown}
            >
              <span className={`truncate ${checkedParentNames.length ? "font-semibold text-slate-800" : "text-slate-400"}`}>
                {loadingOutlets ? "Memuat..."
                  : selectedPlatforms.length === 0 ? "Pilih Aplikator dulu"
                    : checkedParentNames.length === 0 ? "Pilih Outlet..."
                      : checkedParentNames.length === uniqueParentNames.length ? `Semua Outlet (${uniqueParentNames.length})`
                        : `${checkedParentNames.length} dari ${uniqueParentNames.length} Outlet`}
              </span>
              <svg className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${openOutletDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openOutletDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenOutletDropdown(false)} />
                <div className="absolute left-0 right-0 top-full z-30 mt-1 min-w-[260px] space-y-2 rounded-xl border border-red-100 bg-white p-2.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">Terpilih ({checkedParentNames.length}/{uniqueParentNames.length})</span>
                    <button type="button" onClick={handleSelectAllParents} disabled={!filteredParents.length} className="text-[13px] font-bold text-red-700 hover:underline disabled:text-slate-300">
                      {allFilteredParentsChecked ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>
                  <input type="text" placeholder="Cari outlet..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} className="field-control py-2" autoFocus />
                  <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
                    {filteredParents.length === 0 ? (
                      <p className="py-3 text-center text-[15px] text-slate-400">Tidak ada outlet cocok</p>
                    ) : filteredParents.map((name) => {
                      const checked = checkedParentNames.includes(name);
                      return (
                        <label key={name} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[15px] transition hover:bg-red-50/50">
                          <input type="checkbox" checked={checked} onChange={() => handleParentCheck(name)} className="h-4 w-4 accent-red-700" />
                          <span className={checked ? "font-medium text-slate-800" : "text-slate-500"}>{name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <StepLabel number={3} label={`Cabang ${availableBranches.length ? `(${checkedBranchIds.length})` : ""}`} active={checkedParentNames.length > 0 && checkedBranchIds.length === 0} done={checkedBranchIds.length > 0} />
            <button
              type="button"
              disabled={availableBranches.length === 0 || triggering}
              onClick={() => {
                setOpenBranchDropdown(!openBranchDropdown);
                setOpenPlatformDropdown(false);
                setOpenOutletDropdown(false);
              }}
              className="field-control flex items-center justify-between text-left font-medium"
              aria-expanded={openBranchDropdown}
            >
              <span className={`truncate ${checkedBranchIds.length ? "font-semibold text-slate-800" : "text-slate-400"}`}>
                {checkedParentNames.length === 0 ? "Pilih Outlet dulu"
                  : checkedBranchIds.length === availableBranches.length ? `Semua Cabang (${availableBranches.length})`
                    : `${checkedBranchIds.length} dari ${availableBranches.length} Cabang`}
              </span>
              <svg className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${openBranchDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openBranchDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenBranchDropdown(false)} />
                <div className="absolute left-0 right-0 top-full z-30 mt-1 min-w-[280px] space-y-2 rounded-xl border border-red-100 bg-white p-2.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">Terpilih ({checkedBranchIds.length}/{availableBranches.length})</span>
                    <button type="button" onClick={handleSelectAllBranches} className="text-[13px] font-bold text-red-700 hover:underline">
                      {checkedBranchIds.length === availableBranches.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>
                  <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
                    {availableBranches.map((branch) => {
                      const checked = checkedBranchIds.includes(branch.id);
                      const branchLabel = branch.brand || branch.nama_resto_final || branch.merchant_name;
                      return (
                        <label key={branch.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-red-50/50">
                          <input type="checkbox" checked={checked} onChange={() => handleBranchCheck(branch.id)} className="mt-1 h-4 w-4 accent-red-700" />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[15px] ${checked ? "font-medium text-slate-800" : "text-slate-500"}`}>{branchLabel}</span>
                            <PlatformBadge platform={branch.platform} storeId={branch.store_id || "No Store ID"} className="mt-1" />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={checkedBranchIds.length === 0 || triggering}
            className="primary-action w-full"
          >
            {triggering ? "Menjalankan..." : `Tarik ${checkedBranchIds.length} Menu`}
          </button>
        </form>
      </section>

      {/* Right Status Panel: Active/Completed Jobs List */}
      <section className="min-w-0 space-y-6 xl:col-span-3">
        <div className="surface-card flex min-h-[420px] flex-col p-5 sm:p-6">
          <div className="mb-4 border-b border-red-100 pb-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-red-600">Aktivitas</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Status penarikan menu</h2>
          </div>

          {activeJobs.length === 0 ? (
            <div className="my-auto rounded-2xl border border-dashed border-red-200 bg-red-50/40 px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">↓</div>
              <p className="font-semibold text-slate-700">Belum ada aktivitas</p>
              <p className="mt-1 text-[15px] text-slate-500">Pilih platform dan outlet, lalu tarik menu untuk melihat progres.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {activeJobs.map((job) => (
                <div key={job.id} className="space-y-3 rounded-xl border border-red-100 bg-red-50/25 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[15px] font-semibold text-zinc-800">{job.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={job.platform} />
                        <span className="text-[13px] text-slate-400">ID: {job.id}</span>
                      </div>
                    </div>
                    <span className={`text-[13px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      job.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" :
                      job.status === "FAILED" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[13px] text-zinc-400">
                      <span>Langkah: {job.current_step}</span>
                      <span>{job.progress_pct}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 transition-all duration-300 ${job.status === "FAILED" ? "bg-red-500" : job.status === "SUCCESS" ? "bg-emerald-500" : "bg-red-600"}`}
                        style={{ width: `${job.progress_pct}%` }}
                      ></div>
                    </div>
                  </div>

                  {job.error_message && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[13px] text-red-700">
                      {job.error_message}
                    </div>
                  )}

                  {job.status === "SUCCESS" && (
                    <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2">
                      {job.result_metadata?.gspread_url && (
                        <a
                          href={job.result_metadata.gspread_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="secondary-action gap-1.5 px-3 py-1.5 text-[13px]"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H6v-2h6v2zm8-4H6v-2h14v2zm0-4H6V7h14v2z" />
                          </svg>
                          Buka Google Sheets
                        </a>
                      )}
                      <a
                        href={`${API_BASE_URL}/api/jobs/download/${job.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-red-700 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-red-800"
                      >
                        Unduh Excel C5
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
