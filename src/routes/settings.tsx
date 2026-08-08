import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { User, Megaphone, Orbit, Lock, Bell, Palette, HelpCircle, Info, LogOut, ChevronRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 mt-2">
        <button onClick={() => navigate({ to: "/profile" })} className="p-1 text-zinc-300 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="bg-[#141418] rounded-2xl p-2 border border-zinc-800 space-y-1">
        
        {/* Account */}
        <div className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
          <div className="flex items-center gap-4">
            <User className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">Account</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Create Channel - ROUTE FIXED TO MAIN CHANNEL SCREEN */}
        <div 
          onClick={() => navigate({ to: "/channel" })} 
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <Megaphone className="text-zinc-400" size={20} />
            <div>
              <div className="font-semibold text-sm">Create Channel</div>
              <div className="text-[11px] text-zinc-500">Videos, reels, posts & analytics</div>
            </div>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Orbit */}
        <div 
          onClick={() => navigate({ to: "/orbit" })} 
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <Orbit className="text-zinc-400" size={20} />
            <div>
              <div className="font-semibold text-sm">Orbit</div>
              <div className="text-[11px] text-zinc-500">Private social discovery</div>
            </div>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
          <div className="flex items-center gap-4">
            <Lock className="text-zinc-400" size={20} />
            <div>
              <div className="font-semibold text-sm">Privacy & Downloads</div>
              <div className="text-[11px] text-zinc-500">Blocked accounts</div>
            </div>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
          <div className="flex items-center gap-4">
            <Bell className="text-zinc-400" size={20} />
            <div>
              <div className="font-semibold text-sm">Notifications</div>
              <div className="text-[11px] text-zinc-500">Likes, Orbit, channel & system alerts</div>
            </div>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Appearance */}
        <div className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
          <div className="flex items-center gap-4">
            <Palette className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">Appearance</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Help & Support */}
        <div className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
          <div className="flex items-center gap-4">
            <HelpCircle className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">Help & Support</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* About */}
        <div className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
          <div className="flex items-center gap-4">
            <Info className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">About</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Logout */}
        <div className="border-t border-zinc-800/80 pt-2 p-3.5 flex items-center gap-4 text-red-500 cursor-pointer hover:bg-red-950/20 rounded-xl">
          <LogOut size={20} />
          <span className="font-semibold text-sm">Log Out</span>
        </div>

      </div>
    </div>
  );
}

export default SettingsPage;
