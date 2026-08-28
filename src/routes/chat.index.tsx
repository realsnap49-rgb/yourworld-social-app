import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, SquarePen, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveThreadPeer } from "@/lib/social-data";

export const Route = createFileRoute("/chat/")({
  component: ChatListPage,
});

interface ChatThread {
  id: string;
  name: string;
  peerId?: string | null;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  avatarUrl?: string;
}

function ChatListPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadThreads() {
      const { data: sessionData } = await supabase.auth.getSession();
      const me = sessionData.session?.user.id ?? null;
      // Supabase direct messages table se threads fetch
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Group messages by thread_id
        const map = new Map<string, ChatThread>();
        data.forEach((msg) => {
          if (!map.has(msg.thread_id)) {
            map.set(msg.thread_id, {
              id: msg.thread_id,
              name: "Loading…",
              lastMessage: msg.content || "Media file",
              time: new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              unreadCount: msg.is_read ? 0 : 1,
            });
          }
        });
        const base = Array.from(map.values());
        setThreads(base);

        const resolved = await Promise.all(
          base.map(async (t) => {
            const peer = await resolveThreadPeer(t.id, me);
            return {
              ...t,
              name: peer.peerName,
              peerId: peer.peerId,
              avatarUrl: peer.avatarUrl ?? undefined,
            };
          }),
        );
        setThreads(resolved);
      }
    }

    loadThreads();

    const channel = supabase
      .channel("chat-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => void loadThreads(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredThreads = threads.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen flex-col bg-black text-white p-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Chats</h1>
        <button
          onClick={() => {
            const newId = prompt("Enter User ID or Username to start chat:");
            if (newId) window.location.href = `/chat/${newId}`;
          }}
          className="p-2 hover:bg-zinc-800 rounded-full"
        >
          <SquarePen className="h-6 w-6" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-700"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No chats found. Click top icon to start!</p>
          </div>
        ) : (
          filteredThreads.map((chat) => (
            <Link
              key={chat.id}
              to="/chat/$threadId"
              params={{ threadId: chat.id }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg">
                  {chat.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{chat.name}</h4>
                  <p className="text-xs text-gray-400 line-clamp-1">{chat.lastMessage}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-gray-500">{chat.time}</span>
                {chat.unreadCount && chat.unreadCount > 0 ? (
                  <span className="bg-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {chat.unreadCount}
                  </span>
                ) : null}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
