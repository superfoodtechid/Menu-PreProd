"use client";

import { useState, useEffect, useRef } from "react";

export default function MenuPullTab({ API_BASE_URL }) {
  const [platform, setPlatform] = useState("");
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

  // Active jobs tracked list
  const [activeJobs, setActiveJobs] = useState([]);
  
  const pollingIntervalsRef = useRef({});

  // Fetch outlets based on selected platform
  useEffect(() => {
    if (!platform) {
      setAllOutlets([]);
      setUniqueParentNames([]);
      setCheckedParentNames([]);
      setAvailableBranches([]);
      setCheckedBranchIds([]);
      setSearchQuery("");
      return;
    }

    setLoadingOutlets(true);
    setAllOutlets([]);
    setUniqueParentNames([]);
    setCheckedParentNames([]);
    setAvailableBranches([]);
    setCheckedBranchIds([]);
    setSearchQuery("");

    const url = platform === "all" 
      ? `${API_BASE_URL}/api/outlets`
      : `${API_BASE_URL}/api/outlets?platform=${platform}`;

    fetch(url)
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
        console.error(err);
        alert("Gagal memuat daftar outlet dari server.");
      })
      .finally(() => {
        setLoadingOutlets(false);
      });
  }, [platform, API_BASE_URL]);

  // Update available branches when checkedParentNames or allOutlets changes
  useEffect(() => {
    if (!platform) {
      setAvailableBranches([]);
      setCheckedBranchIds([]);
      return;
    }

    // Filter branches whose parent name is in checkedParentNames
    const filtered = allOutlets.filter((o) => checkedParentNames.includes(o.nama_outlet));
    setAvailableBranches(filtered);
    
    // Automatically check all branches of the selected parents
    setCheckedBranchIds(filtered.map((b) => b.id));
  }, [checkedParentNames, allOutlets, platform]);

  // Clean up all polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervalsRef.current).forEach(clearInterval);
    };
  }, []);

  // Filtered parent names based on search query
  const filteredParents = uniqueParentNames.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    const allFilteredChecked = filteredParents.every((name) => checkedParentNames.includes(name));
    
    if (allFilteredChecked) {
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
  const startPollingJob = (jobId, branchName) => {
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

        startPollingJob(job.id, branchLabel);
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
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Form: Selectors */}
      <section className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm h-fit space-y-6 transition-colors">
        <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          Menu Pull
        </h2>
        
        <form onSubmit={handleTriggerPull} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Aplikator
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={triggering}
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 transition-colors shadow-sm"
            >
              <option value="">Pilih Aplikator</option>
              <option value="shopee">ShopeeFood</option>
              <option value="gofood">GoFood</option>
              <option value="grab">GrabFood</option>
              <option value="all">Semua Aplikator</option>
            </select>
          </div>

          {/* Checklist Selection of Parent Outlets (Multi-select) */}
          {platform && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                <span>Outlet ({checkedParentNames.length}/{uniqueParentNames.length})</span>
                <button
                  type="button"
                  onClick={handleSelectAllParents}
                  disabled={loadingOutlets || triggering}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline normal-case font-semibold disabled:opacity-50 text-xs transition-colors"
                >
                  {filteredParents.every((name) => checkedParentNames.includes(name)) ? "Batal Semua" : "Pilih Semua"}
                </button>
              </div>
              
              {/* Search input field */}
              <input
                type="text"
                placeholder="Cari nama outlet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loadingOutlets || triggering}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm transition-colors"
              />

              <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/60 rounded-lg p-2.5 space-y-1.5">
                {loadingOutlets ? (
                  <div className="text-xs text-zinc-400 font-mono text-center py-2">Memuat daftar outlet...</div>
                ) : filteredParents.length === 0 ? (
                  <div className="text-xs text-zinc-400 font-mono text-center py-2">Tidak ada outlet yang cocok.</div>
                ) : (
                  filteredParents.map((name) => (
                    <label key={name} className="flex items-center space-x-2 text-xs text-zinc-700 dark:text-zinc-200 cursor-pointer hover:text-zinc-900 dark:hover:text-white p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={checkedParentNames.includes(name)}
                        onChange={() => handleParentCheck(name)}
                        disabled={triggering}
                        className="accent-zinc-800 dark:accent-zinc-100"
                      />
                      <span className="font-medium truncate">{name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Checklist Selection of Branches (Multi-select) */}
          {availableBranches.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                <span>Cabang / Brand ({checkedBranchIds.length}/{availableBranches.length})</span>
                <button
                  type="button"
                  onClick={handleSelectAllBranches}
                  disabled={triggering}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline normal-case font-semibold disabled:opacity-50 text-xs transition-colors"
                >
                  {checkedBranchIds.length === availableBranches.length ? "Batal Semua" : "Pilih Semua"}
                </button>
              </div>
              
              <div className="max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/60 rounded-lg p-2.5 space-y-1.5">
                {availableBranches.map((b) => {
                  const branchLabel = b.brand || b.nama_resto_final || b.merchant_name;
                  return (
                    <label key={b.id} className="flex items-start space-x-2 text-xs text-zinc-700 dark:text-zinc-200 cursor-pointer hover:text-zinc-900 dark:hover:text-white p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={checkedBranchIds.includes(b.id)}
                        onChange={() => handleBranchCheck(b.id)}
                        disabled={triggering}
                        className="mt-0.5 accent-zinc-800 dark:accent-zinc-100"
                      />
                      <div className="leading-tight min-w-0 flex-1">
                        <div className="font-medium truncate">{branchLabel}</div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                          ID: {b.store_id || "No Store ID"} | {b.platform?.toUpperCase()}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={checkedBranchIds.length === 0 || triggering}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {triggering ? "Menjalankan..." : `Tarik ${checkedBranchIds.length} Menu`}
          </button>
        </form>
      </section>

      {/* Right Status Panel: Active/Completed Jobs List */}
      <section className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm min-h-[350px] flex flex-col transition-colors">
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
            Status Penarikan Menu
          </h2>

          {activeJobs.length === 0 ? (
            <div className="text-zinc-400 dark:text-zinc-500 text-xs py-16 text-center my-auto">
              Belum ada penarikan menu yang aktif. Silakan pilih outlet dan jalankan.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {activeJobs.map((job) => (
                <div key={job.id} className="bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 p-4 rounded-xl space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{job.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                        PLATFORM: {job.platform.toUpperCase()} | ID: {job.id}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      job.status === "SUCCESS" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" :
                      job.status === "FAILED" ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300" :
                      "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span>Langkah: {job.current_step}</span>
                      <span>{job.progress_pct}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-red-600 dark:bg-rose-500 h-1 transition-all duration-300"
                        style={{ width: `${job.progress_pct}%` }}
                      ></div>
                    </div>
                  </div>

                  {job.error_message && (
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 p-2 rounded-lg">
                      {job.error_message}
                    </div>
                  )}

                  {job.status === "SUCCESS" && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700/60 flex justify-end gap-2">
                      {job.result_metadata?.gspread_url && (
                        <a
                          href={job.result_metadata.gspread_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-700 hover:bg-green-800 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-colors shadow-sm"
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
