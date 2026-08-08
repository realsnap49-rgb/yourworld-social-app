import React from "react";
import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { ArrowLeft, Megaphone, Video, Film, FileText, Users, DollarSign, BarChart2 } from "lucide-react";

export const Route = createFileRoute("/channel")({
  component: ChannelLayout,
});

export function ChannelLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: "Create", path: "/channel/create", icon: Megaphone },
    { label: "Posts", path: "/channel/posts", icon: FileText },
    { label: "Videos", path: "/channel/videos", icon: Video },
    { label: "Reels", path: "/channel/reels", icon: Film },
    { label: "Subscribers", path: "/channel/subscribers", icon: Users },
    { label: "Analytics", path: "/channel/analytics", icon: BarChart2 },
    { label: "Monetization", path: "/channel/monetization", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate({ to: "/settings" })} className="p-1 text-zinc-300 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-base">Channel Studio</span>
        <div className="w-6"></div>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div className="flex gap-2 overflow-x-auto p-3 border-b border-zinc-800/80 no-scrollbar bg-[#09090b]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate({ to: tab.path })}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Sub-Route Screen */}
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  );
}

export default ChannelLayout;
