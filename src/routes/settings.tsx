import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { User, Megaphone, Orbit, Lock, Bell, Palette, HelpCircle, Info, LogOut, ChevronRight, ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — YourWorld" },
      {
        name: "description",
        content:
          "Manage your YourWorld account, privacy, notifications, appearance and support preferences in one place.",
      },
      { property: "og:title", content: "Settings — YourWorld" },
      {
        property: "og:description",
        content: "Account, privacy, notifications, appearance and support settings for YourWorld.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

type PanelId = "privacy" | "notifications" | "appearance" | "help" | "about";

export function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    privateAccount: false,
    allowDownloads: true,
    activityStatus: true,
    likes: true,
    comments: true,
    followers: true,
    messages: true,
    channel: true,
    system: true,
    reduceMotion: false,
    compact: false,
  });
  const flip = (k: string) => setToggles((t) => ({ ...t, [k]: !t[k] }));

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  };

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
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/account" })}
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <User className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">Account</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Create Channel - ROUTE FIXED TO MAIN CHANNEL SCREEN */}
        <div 
          onClick={() => navigate({ to: "/channel/create" })}
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPanel("privacy")}
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPanel("notifications")}
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPanel("appearance")}
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <Palette className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">Appearance</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Help & Support */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPanel("help")}
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <HelpCircle className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">Help & Support</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* About */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPanel("about")}
          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <Info className="text-zinc-400" size={20} />
            <span className="font-semibold text-sm">About</span>
          </div>
          <ChevronRight className="text-zinc-600" size={18} />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="border-t border-zinc-800/80 pt-2 p-3.5 flex w-full items-center gap-4 text-red-500 cursor-pointer hover:bg-red-950/20 rounded-xl"
        >
          <LogOut size={20} />
          <span className="font-semibold text-sm">Log Out</span>
        </button>

      </div>

      {panel === "privacy" && (
        <Panel title="Privacy & Downloads" onClose={() => setPanel(null)}>
          <Toggle label="Private account" hint="Only approved followers can see your posts" on={toggles.privateAccount} onClick={() => flip("privateAccount")} />
          <Toggle label="Allow downloads" hint="Let others save your reels with watermark" on={toggles.allowDownloads} onClick={() => flip("allowDownloads")} />
          <Toggle label="Show activity status" hint="Display when you were last active" on={toggles.activityStatus} onClick={() => flip("activityStatus")} />
          <Row label="Blocked accounts" hint="No blocked accounts" />
        </Panel>
      )}

      {panel === "notifications" && (
        <Panel title="Notifications" onClose={() => setPanel(null)}>
          <Toggle label="Likes" on={toggles.likes} onClick={() => flip("likes")} />
          <Toggle label="Comments" on={toggles.comments} onClick={() => flip("comments")} />
          <Toggle label="New followers" on={toggles.followers} onClick={() => flip("followers")} />
          <Toggle label="Messages" on={toggles.messages} onClick={() => flip("messages")} />
          <Toggle label="Channel & monetization" on={toggles.channel} onClick={() => flip("channel")} />
          <Toggle label="System alerts" on={toggles.system} onClick={() => flip("system")} />
          <Row label="Open activity feed" onClick={() => navigate({ to: "/notifications" })} />
        </Panel>
      )}

      {panel === "appearance" && (
        <Panel title="Appearance" onClose={() => setPanel(null)}>
          <Row label="Theme" hint="Premium Dark (default)" />
          <Toggle label="Reduce motion" hint="Minimise animations and transitions" on={toggles.reduceMotion} onClick={() => flip("reduceMotion")} />
          <Toggle label="Compact layout" hint="Tighter spacing in feed and lists" on={toggles.compact} onClick={() => flip("compact")} />
        </Panel>
      )}

      {panel === "help" && (
        <Panel title="Help & Support" onClose={() => setPanel(null)}>
          <Row label="Help center" hint="Guides and troubleshooting" />
          <Row label="Report a problem" hint="Tell us what went wrong" />
          <Row label="Community guidelines" />
          <Row label="Contact support" hint="Yourworld2029@gmail.com" />
        </Panel>
      )}

      {panel === "about" && (
        <Panel title="About" onClose={() => setPanel(null)}>
          <Row label="YourWorld" hint="Version 1.0.0" />
          <Row label="Terms of Service" />
          <Row label="Privacy Policy" />
          <Row label="Licenses" />
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-[#141418] p-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}

function Row({ label, hint, onClick }: { label: string; hint?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-zinc-800/50"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
      </span>
      <ChevronRight className="text-zinc-600" size={18} />
    </button>
  );
}

function Toggle({ label, hint, on, onClick }: { label: string; hint?: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl p-3">
      <span className="min-w-0 pr-3">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onClick}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-indigo-500" : "bg-zinc-700"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

export default SettingsPage;
