import { useEffect, useMemo, useState } from "react";
import {
  AtSign, Check, Globe2, Hash, Link2, Loader2, MapPin, Search, Star, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ReelPublishMeta = {
  caption: string;
  hashtags: string[];
  location: string | null;
  link: string | null;
  audience: "everyone" | "close_friends";
  taggedUserIds: string[];
  viewerUserIds: string[];
};

type Person = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function initials(p: Person) {
  const n = p.display_name || p.username || "U";
  return n.slice(0, 1).toUpperCase();
}

function PeoplePicker({
  title,
  selected,
  onToggle,
  onClose,
}: {
  title: string;
  selected: string[];
  onToggle: (p: Person) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = window.setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id ?? null;
      const { data } = await supabase.rpc("search_profiles", { search: query.trim() });
      if (!alive) return;
      setPeople(((data ?? []) as Person[]).filter((p) => p.id !== uid));
      setLoading(false);
    }, 200);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3.5 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-6">
        {people.map((p) => {
          const on = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onToggle(p)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-secondary/60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-bold">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(p)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {p.display_name || p.username || "User"}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    @{p.username || "user"}
                  </span>
                </span>
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border ${
                    on ? "border-transparent bg-orange-500 text-white" : "border-border"
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
              </button>
            </li>
          );
        })}
        {!loading && people.length === 0 && (
          <li className="py-8 text-center text-xs text-muted-foreground">No people found</li>
        )}
      </ul>
    </div>
  );
}

export function ReelPublishSheet({
  open,
  previewUrl,
  posting,
  onClose,
  onShare,
}: {
  open: boolean;
  previewUrl?: string;
  posting?: boolean;
  onClose: () => void;
  onShare: (meta: ReelPublishMeta) => void;
}) {
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [audience, setAudience] = useState<"everyone" | "close_friends">("everyone");
  const [tagged, setTagged] = useState<Person[]>([]);
  const [closeFriends, setCloseFriends] = useState<Person[]>([]);
  const [picker, setPicker] = useState<"none" | "tag" | "close">("none");

  const hashtags = useMemo(
    () => Array.from(new Set((caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.slice(1)))),
    [caption],
  );

  if (!open) return null;

  const toggle = (list: Person[], set: (v: Person[]) => void) => (p: Person) =>
    set(list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id) : [...list, p]);

  const row = "flex w-full items-center gap-3 border-b border-border/50 px-4 py-3.5 text-left";

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-full w-full max-w-md flex-col bg-background text-foreground">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
            <X className="h-4 w-4" />
          </button>
          <h2 className="flex-1 text-sm font-black uppercase tracking-wide">New reel</h2>
          <button
            type="button"
            disabled={posting}
            onClick={() =>
              onShare({
                caption: caption.trim(),
                hashtags,
                location: location.trim() || null,
                link: showLink && link.trim() ? link.trim() : null,
                audience,
                taggedUserIds: tagged.map((p) => p.id),
                viewerUserIds: audience === "close_friends" ? closeFriends.map((p) => p.id) : [],
              })
            }
            className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white disabled:opacity-60"
          >
            {posting ? "Sharing…" : "Share"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          {/* Caption + thumbnail */}
          <div className="flex gap-3 px-4 py-4">
            <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
              {previewUrl && (
                <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
              )}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption… use #hashtags"
              aria-label="Caption"
              className="h-24 min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {hashtags.map((h) => (
                <span key={h} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
                  <Hash className="h-3 w-3" />
                  {h}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-border/50">
            {/* Tag people */}
            <button type="button" onClick={() => setPicker("tag")} className={row}>
              <AtSign className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">Tag people</span>
              <span className="max-w-[45%] truncate text-xs text-muted-foreground">
                {tagged.length ? tagged.map((p) => p.username || p.display_name).join(", ") : "Add"}
              </span>
            </button>

            {/* Location */}
            <label className={row}>
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                aria-label="Location"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>

            {/* Link */}
            {showLink ? (
              <label className={row}>
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://your-link.com"
                  aria-label="Link"
                  inputMode="url"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>
            ) : (
              <button type="button" onClick={() => setShowLink(true)} className={row}>
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">Add link</span>
                <span className="text-xs text-muted-foreground">Add</span>
              </button>
            )}
          </div>

          {/* Audience */}
          <div className="px-4 pt-5">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Audience
            </h3>
            <div className="mt-2 space-y-2">
              {([
                { id: "everyone", label: "Everyone", desc: "Anyone on YourWorld can watch", Icon: Globe2 },
                { id: "close_friends", label: "Close friends", desc: "Only the people you choose", Icon: Star },
              ] as const).map((o) => {
                const on = audience === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setAudience(o.id);
                      if (o.id === "close_friends" && closeFriends.length === 0) setPicker("close");
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                      on ? "border-orange-500 bg-orange-500/10" : "border-border/60 bg-secondary/40"
                    }`}
                  >
                    <o.Icon className={`h-4 w-4 ${on ? "text-orange-500" : "text-muted-foreground"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{o.desc}</span>
                    </span>
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full border ${
                        on ? "border-transparent bg-orange-500 text-white" : "border-border"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {audience === "close_friends" && (
              <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/40 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    {closeFriends.length
                      ? `${closeFriends.length} people can see this`
                      : "Nobody added yet"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPicker("close")}
                    className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white"
                  >
                    Add people
                  </button>
                </div>
                {closeFriends.length > 0 && (
                  <p className="pt-2 text-[11px] text-muted-foreground">
                    {closeFriends.map((p) => `@${p.username || "user"}`).join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {picker === "tag" && (
          <PeoplePicker
            title="Tag people"
            selected={tagged.map((p) => p.id)}
            onToggle={toggle(tagged, setTagged)}
            onClose={() => setPicker("none")}
          />
        )}
        {picker === "close" && (
          <PeoplePicker
            title="Close friends"
            selected={closeFriends.map((p) => p.id)}
            onToggle={toggle(closeFriends, setCloseFriends)}
            onClose={() => setPicker("none")}
          />
        )}
      </div>
    </div>
  );
}
