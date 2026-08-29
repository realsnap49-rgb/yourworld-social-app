import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Search, SquarePen, MessageSquare, X, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveThreadPeer, dmThreadId } from "@/lib/social-data";
import { cacheGet, cacheSet } from "@/lib/local-cache";
import { deleteDirectThreads, hiddenThreadIds } from "@/lib/chat-delete";
import { useChatNames } from "@/lib/chat-names";
import { useSecretChats } from "@/lib/secret-chats";

export const Route = createFileRoute("/_authenticated/chat/")({
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

interface DiscoverProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

function ChatListPage() {
  // Paint the cached list immediately, then refresh from the network.
  const [threads, setThreads] = useState<ChatThread[]>(
    () => cacheGet<ChatThread[]>("chat-threads") ?? [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<DiscoverProfile[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>(() => hiddenThreadIds());
  const [deleting, setDeleting] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const { nameFor } = useChatNames();
  const { isHidden } = useSecretChats(searchQuery);

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const exitSelect = () => {
    setSelecting(false);
    setSelected([]);
  };


  useEffect(() => {
    async function loadThreads() {
      const { data: sessionData } = await supabase.auth.getSession();
      const me = sessionData.session?.user.id ?? null;

      // 1) Find every thread this user participates in.
      let threadIds: string[] = [];
      if (me) {
        const { data: parts } = await supabase
          .from("thread_participants")
          .select("thread_id")
          .eq("user_id", me);
        threadIds = (parts ?? []).map((p) => p.thread_id);
      }

      // 2) Fetch all messages for those threads (RLS scopes to visible rows).
      let query = supabase
        .from("direct_messages")
        .select("id,thread_id,sender_id,content,media_type,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (threadIds.length > 0) query = query.in("thread_id", threadIds);
      const { data, error } = await query;

      if (!error && data) {
        // Group messages by thread_id
        const map = new Map<string, ChatThread>();
        data.forEach((msg) => {
          const existing = map.get(msg.thread_id);
          const unread =
            (existing?.unreadCount ?? 0) + (!msg.is_read && msg.sender_id !== me ? 1 : 0);
          if (!existing) {
            map.set(msg.thread_id, {
              id: msg.thread_id,
              name: "Loading…",
              lastMessage: msg.content || "Media file",
              time: new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              unreadCount: unread,
            });
          } else {
            existing.unreadCount = unread;
          }
        });
        const base = Array.from(map.values());
        // Keep already-resolved names from the cache instead of flashing "Loading…".
        setThreads((prev) =>
          base.map((t) => {
            const known = prev.find((p) => p.id === t.id);
            return known ? { ...t, name: known.name, peerId: known.peerId, avatarUrl: known.avatarUrl } : t;
          }),
        );

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
        cacheSet("chat-threads", resolved.slice(0, 30));
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

  // Load real registered accounts for the "new chat" picker.
  useEffect(() => {
    if (!newChatOpen) return;
    let alive = true;
    setPeopleLoading(true);
    const t = setTimeout(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? null;
      if (alive) setMe(uid);

      const term = peopleQuery.trim();
      const { data } = await supabase.rpc("search_profiles", { search: term });
      if (!alive) return;
      setPeople(((data ?? []) as DiscoverProfile[]).filter((p) => p.id !== uid));
      setPeopleLoading(false);
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [newChatOpen, peopleQuery]);

  const pinQuery = /^\d{4,8}$/.test(searchQuery.trim());
  const filteredThreads = threads.filter(
    (t) =>
      !hidden.includes(t.id) &&
      !isHidden(t.peerId) &&
      (pinQuery ? true :
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))),
  );

  const allSelected = filteredThreads.length > 0 && selected.length === filteredThreads.length;

  const removeSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setDeleting(true);
    setHidden((prev) => [...prev, ...ids]);
    setThreads((prev) => prev.filter((t) => !ids.includes(t.id)));
    await deleteDirectThreads(ids);
    setDeleting(false);
    exitSelect();
  };

  const startPress = (id: string) => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setSelecting(true);
      setSelected([id]);
    }, 400);
  };
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div className="flex h-screen flex-col bg-black text-white p-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        {selecting ? (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={exitSelect}
                aria-label="Cancel selection"
                className="rounded-full p-2 hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold">{selected.length} selected</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSelected(allSelected ? [] : filteredThreads.map((t) => t.id))
                }
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
              <button
                onClick={() => void removeSelected()}
                disabled={!selected.length || deleting}
                aria-label="Delete selected chats"
                className="rounded-full bg-red-600 p-2 disabled:opacity-40"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Chats</h1>
            <div className="flex items-center gap-1">
              {filteredThreads.length > 0 ? (
                <button
                  onClick={() => setSelecting(true)}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800"
                >
                  Select
                </button>
              ) : null}
              <button
                onClick={() => setNewChatOpen(true)}
                aria-label="Start a new chat"
                className="p-2 hover:bg-zinc-800 rounded-full"
              >
                <SquarePen className="h-6 w-6" />
              </button>
            </div>
          </>
        )}
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
          filteredThreads.map((chat) => {
            const isSel = selected.includes(chat.id);
            const body = (
              <>
                <div className="flex items-center gap-3">
                  {selecting ? (
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        isSel ? "border-pink-500 bg-pink-600" : "border-zinc-600"
                      }`}
                    >
                      {isSel ? <Check className="h-3 w-3" /> : null}
                    </span>
                  ) : null}
                  <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg">
                    {nameFor(chat.peerId, chat.name).charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{nameFor(chat.peerId, chat.name)}</h4>
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
              </>
            );

            if (selecting) {
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => toggleSelect(chat.id)}
                  aria-pressed={isSel}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors ${
                    isSel ? "bg-zinc-800" : "hover:bg-zinc-900"
                  }`}
                >
                  {body}
                </button>
              );
            }

            return (
              <Link
                key={chat.id}
                to="/chat/$threadId"
                params={{ threadId: chat.id }}
                onPointerDown={() => startPress(chat.id)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onClick={(e) => {
                  if (longPressed.current) {
                    e.preventDefault();
                    longPressed.current = false;
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelecting(true);
                  setSelected([chat.id]);
                }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900 transition-colors"
              >
                {body}
              </Link>
            );
          })
        )}
      </div>

      {newChatOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">New chat</h2>
            <button
              onClick={() => setNewChatOpen(false)}
              aria-label="Close"
              className="rounded-full p-2 hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              autoFocus
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              placeholder="Search people by name or username"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-sm focus:border-zinc-700 focus:outline-none"
            />
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto">
            {peopleLoading ? (
              <p className="py-6 text-center text-sm text-gray-500">Searching…</p>
            ) : people.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No accounts found.</p>
            ) : (
              people.map((p) => (
                <Link
                  key={p.id}
                  to="/chat/$threadId"
                  params={{ threadId: p.id }}
                  onClick={() => setNewChatOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-zinc-900"
                >
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-base font-bold">
                      {nameFor(p.id, p.display_name || p.username || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {nameFor(p.id, p.display_name || p.username || `User ${p.id.slice(0, 6)}`)}
                    </p>
                    {p.username ? (
                      <p className="truncate text-xs text-gray-400">@{p.username}</p>
                    ) : null}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
