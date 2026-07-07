"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
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

  // Dynamic API base URL configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18800";

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
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="border-b border-slate-800 pb-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          FoodMaster Menu Portal
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Penarikan data menu terintegrasi ShopeeFood dan GoFood.
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Selectors */}
        <section className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-lg h-fit space-y-6">
          <h2 className="text-base font-semibold text-slate-200 pb-2 border-b border-slate-800">
            Menu Pull
          </h2>
          
          <form onSubmit={handleTriggerPull} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Aplikator
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={triggering}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-700 disabled:opacity-50"
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
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Outlet ({checkedParentNames.length}/{uniqueParentNames.length})</span>
                  <button
                    type="button"
                    onClick={handleSelectAllParents}
                    disabled={loadingOutlets || triggering}
                    className="text-slate-300 hover:text-white underline normal-case font-normal disabled:opacity-50 text-xs"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 placeholder-slate-600"
                />

                <div className="max-h-48 overflow-y-auto border border-slate-800 bg-slate-950 rounded p-3 space-y-2">
                  {loadingOutlets ? (
                    <div className="text-xs text-slate-500 font-mono">Memuat daftar outlet...</div>
                  ) : filteredParents.length === 0 ? (
                    <div className="text-xs text-slate-500 font-mono">Tidak ada outlet yang cocok.</div>
                  ) : (
                    filteredParents.map((name) => (
                      <label key={name} className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={checkedParentNames.includes(name)}
                          onChange={() => handleParentCheck(name)}
                          disabled={triggering}
                          className="accent-slate-200"
                        />
                        <span>{name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Checklist Selection of Branches (Multi-select) */}
            {availableBranches.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Cabang / Brand ({checkedBranchIds.length}/{availableBranches.length})</span>
                  <button
                    type="button"
                    onClick={handleSelectAllBranches}
                    disabled={triggering}
                    className="text-slate-300 hover:text-white underline normal-case font-normal disabled:opacity-50 text-xs"
                  >
                    {checkedBranchIds.length === availableBranches.length ? "Batal Semua" : "Pilih Semua"}
                  </button>
                </div>
                
                <div className="max-h-60 overflow-y-auto border border-slate-800 bg-slate-950 rounded p-3 space-y-2">
                  {availableBranches.map((b) => {
                    const branchLabel = b.brand || b.nama_resto_final || b.merchant_name;
                    return (
                      <label key={b.id} className="flex items-start space-x-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={checkedBranchIds.includes(b.id)}
                          onChange={() => handleBranchCheck(b.id)}
                          disabled={triggering}
                          className="mt-1 accent-slate-200"
                        />
                        <div className="leading-tight">
                          <div>{branchLabel}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
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
              className="w-full bg-slate-200 hover:bg-slate-100 text-slate-900 text-sm font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {triggering ? "Menjalankan..." : `Tarik ${checkedBranchIds.length} Menu`}
            </button>
          </form>
        </section>

        {/* Right Status Panel: Active/Completed Jobs List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg min-h-[350px] flex flex-col">
            <h2 className="text-base font-semibold text-slate-200 pb-2 border-b border-slate-800 mb-4">
              Status Penarikan Menu
            </h2>

            {activeJobs.length === 0 ? (
              <div className="text-slate-500 text-sm py-16 text-center my-auto">
                Belum ada penarikan menu yang aktif. Silakan pilih outlet dan jalankan.
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {activeJobs.map((job) => (
                  <div key={job.id} className="bg-slate-950 border border-slate-850 p-4 rounded space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{job.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          PLATFORM: {job.platform.toUpperCase()} | ID: {job.id}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold uppercase ${
                        job.status === "SUCCESS" ? "text-emerald-400" :
                        job.status === "FAILED" ? "text-rose-400" :
                        "text-amber-400"
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Langkah: {job.current_step}</span>
                        <span>{job.progress_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-slate-200 h-1 transition-all duration-300"
                          style={{ width: `${job.progress_pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {job.error_message && (
                      <div className="text-[11px] text-rose-400 bg-rose-950/20 border border-rose-900/40 p-2 rounded">
                        {job.error_message}
                      </div>
                    )}

                    {job.status === "SUCCESS" && (
                      <div className="pt-2 border-t border-slate-900 flex justify-end">
                        <a
                          href={`${API_BASE_URL}/api/jobs/download/${job.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-100 text-[11px] font-semibold py-1 px-3 rounded transition-colors"
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
    </div>
  );
}
