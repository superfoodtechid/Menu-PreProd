"use client";

import { useState, useEffect } from "react";
import NavHeader from "./components/NavHeader";
import MenuPullTab from "./components/MenuPullTab";
import MenuPushTab from "./components/MenuPushTab";
import EditHargaTab from "./components/EditHargaTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState("pull");
  const [theme, setTheme] = useState("light");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18800";

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <NavHeader activeTab={activeTab} onTabChange={setActiveTab} theme={theme} onToggleTheme={toggleTheme} />

      <div className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {activeTab === "pull" && <MenuPullTab API_BASE_URL={API_BASE_URL} />}
        {activeTab === "push" && <MenuPushTab />}
        {activeTab === "edit-harga" && <EditHargaTab />}
      </div>
    </div>
  );
}
