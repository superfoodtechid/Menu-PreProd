"use client";

import { useState } from "react";
import NavHeader from "./components/NavHeader";
import MenuPullTab from "./components/MenuPullTab";
import MenuPushTab from "./components/MenuPushTab";
import EditHargaTab from "./components/EditHargaTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState("pull");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18800";

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {activeTab === "pull" && <MenuPullTab API_BASE_URL={API_BASE_URL} />}
        {activeTab === "push" && <MenuPushTab />}
        {activeTab === "edit-harga" && <EditHargaTab />}
      </div>
    </div>
  );
}
