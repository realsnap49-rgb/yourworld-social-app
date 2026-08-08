import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Megaphone, Orbit } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

export function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6">
      <button onClick={() => navigate({ to: "/profile" })} className="mb-6"><ArrowLeft /></button>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-4">
        <div onClick={() => navigate({ to: "/channel/posts" })} className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl cursor-pointer">
           <div className="flex items-center gap-3"><Megaphone /> Create Channel</div>
           <ChevronRight />
        </div>
        <div onClick={() => navigate({ to: "/orbit" })} className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl cursor-pointer">
           <div className="flex items-center gap-3"><Orbit /> Orbit</div>
           <ChevronRight />
        </div>
      </div>
    </div>
  );
}
