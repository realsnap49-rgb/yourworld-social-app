import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Search, X, Hash, TrendingUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/lib/search-store";
import { YwAvatar } from "@/components/yw/Avatar";
import { suggestedUsers, hashtags, formatCount, type SuggestedUser } from "@/lib/yw-data";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [{ title: "Search · YourWorld" }],
  }),
  component: SearchPage,
});

type Tab = "users" | "hashtags";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, push, remove, clear } = useSearch();

  const q = query.trim().toLowerCase().replace(/^[#@]/, "");
  const hasQuery = q.length > 0;

  // --- filtered results ---
  const filteredUsers = hasQuery
    ? suggestedUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q),
      )
    : [];

  const filteredHashtags = hasQuery
    ? hashtags.filter((h) => h.tag.toLowerCase().includes(q))
    : [];

  const trendingHashtags = hashtags.filter((h) => h.trending).slice(0, 6);

  function handleUserClick(user: SuggestedUser) {
    push({ kind: "user", label: user.username, sublabel: user.name, userId: user.id });
  }

  function handleHashtagClick(tag: string) {
    push({ kind: "hashtag", label: tag });
  }

  function clearQuery() {
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <main className="grain relative min-h-screen pb-28">
      <div aria-hidden className="ambient-canvas" />

      {/* ── sticky header ── */}
      <header className="header-lux sticky top-0 z-40 px-4 pb-3 pt-3">
        <h1 className="mb-3 font-ui text-[18px] font-semibold leading-none tracking-[-0.03em] text-foreground">
          Search
        </h1>
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Users, #hashtags…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-10 w-full rounded-[14px] bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] pl-9 pr-9 font-ui text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklab,var(--foreground)_18%,transparent)] transition-all duration-200"
          />
          {query && (
            <button
              onClick={clearQuery}
              className="absolute right-2.5 grid h-5 w-5 place-items-center rounded-full bg-muted-foreground/30 transition-all duration-150 active:scale-90"
              aria-label="Clear search"
            >
              <X className="h-3 w-3 text-foreground" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* tab bar — only when actively searching */}
        {hasQuery && (
          <div className="mt-3 flex gap-1">
            {(["users", "hashtags"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-ui text-[12px] font-medium transition-all duration-200",
                  tab === t
                    ? "bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)] text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t === "hashtags" && <Hash className="h-3 w-3" strokeWidth={2.2} />}
                {t === "users" ? "People" : "Hashtags"}
                <span className="text-[10px] opacity-60">
                  {t === "users" ? filteredUsers.length : filteredHashtags.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      {hasQuery ? (
        /* ════════════════ RESULTS ════════════════ */
        <div className="px-4 pt-3">
          {tab === "users" ? (
            filteredUsers.length > 0 ? (
              <ul className="space-y-1">
                {filteredUsers.map((u, i) => (
                  <li
                    key={u.id}
                    className="animate-rise"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <UserRow
                      user={u}
                      onClick={() => handleUserClick(u)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState label={`No people match "${q}"`} />
            )
          ) : filteredHashtags.length > 0 ? (
            <ul className="space-y-1">
              {filteredHashtags.map((h, i) => (
                <li
                  key={h.tag}
                  className="animate-rise"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <HashtagRow
                    tag={h.tag}
                    postCount={h.postCount}
                    onClick={() => handleHashtagClick(h.tag)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState label={`No hashtags match "#${q}"`} />
          )}
        </div>
      ) : (
        /* ════════════════ DISCOVERY ════════════════ */
        <div className="space-y-6 px-4 pt-4">
          {/* ── recent history ── */}
          {history.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-ui text-[13px] font-semibold text-foreground">
                  Recent
                </span>
                <button
                  onClick={clear}
                  className="font-ui text-[12px] text-primary transition-opacity active:opacity-60"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-0.5">
                {history.map((entry) => (
                  <li key={entry.id} className="group flex items-center gap-3">
                    {/* icon */}
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]">
                      {entry.kind === "user" ? (
                        <span className="font-ui text-[13px] font-semibold text-foreground/70">
                          {(entry.sublabel ?? entry.label).charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <Hash className="h-4 w-4 text-foreground/60" strokeWidth={2} />
                      )}
                    </div>
                    {/* label */}
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setQuery(
                          entry.kind === "user"
                            ? `@${entry.label}`
                            : `#${entry.label}`,
                        );
                        setTab(entry.kind === "user" ? "users" : "hashtags");
                      }}
                    >
                      <p className="font-ui text-[14px] font-medium text-foreground">
                        {entry.kind === "user" ? `@${entry.label}` : `#${entry.label}`}
                      </p>
                      {entry.sublabel && (
                        <p className="font-ui text-[12px] text-muted-foreground">
                          {entry.sublabel}
                        </p>
                      )}
                    </button>
                    {/* remove */}
                    <button
                      onClick={() => remove(entry.id)}
                      aria-label="Remove from history"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)] active:scale-90"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── trending topics ── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2} />
              <span className="font-ui text-[13px] font-semibold text-foreground">
                Trending
              </span>
            </div>
            <div className="surface-card rounded-[20px] overflow-hidden">
              {trendingHashtags.map((h, i) => (
                <button
                  key={h.tag}
                  onClick={() => {
                    setQuery(`#${h.tag}`);
                    setTab("hashtags");
                    handleHashtagClick(h.tag);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] active:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)]",
                    i < trendingHashtags.length - 1 &&
                      "border-b border-[color-mix(in_oklab,var(--foreground)_6%,transparent)]",
                  )}
                >
                  <span className="font-ui text-[13px] font-bold text-muted-foreground/50 w-5 shrink-0 text-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-ui text-[14px] font-semibold text-foreground">
                      #{h.tag}
                    </p>
                    <p className="font-ui text-[11px] text-muted-foreground">
                      {formatCount(h.postCount)} posts
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={1.8} />
                </button>
              ))}
            </div>
          </section>

          {/* ── suggested profiles ── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-ui text-[13px] font-semibold text-foreground">
                Suggested
              </span>
              <Link
                to="/"
                className="font-ui text-[12px] text-primary transition-opacity active:opacity-60"
              >
                See all
              </Link>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {suggestedUsers.map((u) => (
                <SuggestedCard
                  key={u.id}
                  user={u}
                  onClick={() => handleUserClick(u)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

/* ── sub-components ── */

function UserRow({
  user,
  onClick,
}: {
  user: SuggestedUser;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[16px] px-1 py-2 text-left transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] active:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)]"
    >
      <YwAvatar user={user} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-ui text-[14px] font-semibold text-foreground">
            @{user.username}
          </p>
          {user.verified && (
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary">
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-primary-foreground">
                <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </div>
        <p className="font-ui text-[12px] text-muted-foreground">
          {user.name}
          {user.category ? ` · ${user.category}` : ""}
        </p>
      </div>
      <p className="font-ui text-[12px] font-medium text-muted-foreground/70 shrink-0">
        {formatCount(user.followerCount)}
      </p>
    </button>
  );
}

function HashtagRow({
  tag,
  postCount,
  onClick,
}: {
  tag: string;
  postCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[16px] px-1 py-2 text-left transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] active:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)]"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]">
        <Hash className="h-5 w-5 text-foreground/70" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-ui text-[14px] font-semibold text-foreground">
          #{tag}
        </p>
        <p className="font-ui text-[12px] text-muted-foreground">
          {formatCount(postCount)} posts
        </p>
      </div>
    </button>
  );
}

function SuggestedCard({
  user,
  onClick,
}: {
  user: SuggestedUser;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="surface-card flex w-[130px] shrink-0 flex-col items-center rounded-[20px] px-3 pb-3.5 pt-4 text-center transition-transform duration-200 active:scale-95"
    >
      <YwAvatar user={user} size={52} />
      <p className="mt-2.5 w-full truncate font-ui text-[12px] font-semibold text-foreground">
        @{user.username}
      </p>
      {user.category && (
        <p className="w-full truncate font-ui text-[10px] text-muted-foreground">
          {user.category}
        </p>
      )}
      <p className="mt-1 font-ui text-[11px] font-medium text-muted-foreground/70">
        {formatCount(user.followerCount)}
      </p>
      <div className="mt-3 w-full rounded-[10px] bg-primary py-1.5 font-ui text-[11px] font-semibold text-primary-foreground">
        Follow
      </div>
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Search className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
      <p className="font-ui text-[14px] text-muted-foreground">{label}</p>
    </div>
  );
}
