import { useState } from "react";
import NavHeader from "./components/NavHeader";
import MenuPullTab from "./components/MenuPullTab";
import MenuPushTab from "./components/MenuPushTab";
import EditHargaTab from "./components/EditHargaTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    return ["pull", "push", "edit-harga"].includes(requestedTab) ? requestedTab : "pull";
  });
  const defaultApiHost = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://localhost:8000';
  const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiHost).replace(/\/+$/, "");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "pull") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url);
  };

  return (
    <div className="min-h-screen bg-[#fff9f8] text-slate-900">
      <NavHeader activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className={activeTab === "pull" ? "" : "hidden"}><MenuPullTab API_BASE_URL={API_BASE_URL} /></div>
        <div className={activeTab === "push" ? "" : "hidden"}><MenuPushTab /></div>
        <div className={activeTab === "edit-harga" ? "" : "hidden"}><EditHargaTab API_BASE_URL={API_BASE_URL} /></div>
      </div>
    </div>
  );
}
