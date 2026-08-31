import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { YwAvatar } from "@/components/yw/Avatar";
import { byId, currentUser, type Comment, type User } from "@/lib/yw-data";
import { usePostComments, timeAgo, resolveMediaUrl, MAX_PINNED_COMMENTS } from "@/lib/social-data";
import { Pin, PinOff, SendHorizonal, Trash2 } from "lucide-react";
import { toast } from "sonner";

type DisplayComment = {
  id: string;
  user: User;
  body: string;
  time: string;
  avatarUrl?: string | null;
  mine: boolean;
  pinned: boolean;
};

function toUser(username: string, displayName: string, id: string, hue = 200): User {
  return { id, username, name: displayName || username, hue };
}

function CommentAvatar({ user, url }: { user: User; url?: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!url) {
      setSrc(null);
      return;
    }
    void resolveMediaUrl(url, "avatars").then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [url]);

  if (src) {
    return (
      <img
        src={src}
        alt={`@${user.username} avatar`}
        className="h-[34px] w-[34px] shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    );
  }
  return <YwAvatar user={user} size={34} />;
}

/**
 * Comments drawer. When `postId` is provided it fetches real comments from the
 * database (with optimistic posting, delete-own and realtime sync). Otherwise
 * it falls back to the supplied local comment list (demo posts).
 */
export function CommentsSheet({
  children,
  postId,
  fallbackComments = [],
  onCountChange,
}: {
  children: ReactNode;
  postId?: string | null;
  fallbackComments?: Comment[];
  onCountChange?: (count: number) => void;
}) {
  const real = usePostComments(postId ?? null);
  const [local, setLocal] = useState<Comment[]>(fallbackComments);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const isRealUser = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Warm the profile route so the tap feels instant.
  const prefetchProfile = (id: string) => {
    if (!isRealUser(id)) return;
    void router.preloadRoute({ to: "/u/$userId", params: { userId: id } }).catch(() => {});
  };

  const useReal = !!postId;

  const list: DisplayComment[] = useReal
    ? real.comments.map((c) => ({
        id: c.id,
        user: toUser(c.username, c.displayName, c.userId),
        body: c.body,
        time: timeAgo(c.createdAt),
        avatarUrl: c.avatarUrl,
        mine: !!real.me && c.userId === real.me,
        pinned: c.pinned,
      }))
    : local.map((c) => {
        const u = byId(c.userId);
        return {
          id: c.id,
          user: u,
          body: c.text,
          time: c.time,
          mine: c.userId === currentUser.id,
          pinned: false,
        };
      });

  const count = list.length;

  useEffect(() => {
    if (useReal) onCountChange?.(real.comments.length);
  }, [useReal, real.comments.length, onCountChange]);

  const send = () => {
    if (!draft.trim()) return;
    if (useReal) {
      void real.send(draft);
    } else {
      setLocal((p) => [
        ...p,
        { id: `local-${Date.now()}`, userId: currentUser.id, text: draft.trim(), time: "now" },
      ]);
    }
    setDraft("");
  };

  const canModerate = useReal && real.isPostOwner;

  const togglePin = async (c: DisplayComment) => {
    if (!useReal) return;
    if (!c.pinned && real.pinnedCount >= MAX_PINNED_COMMENTS) {
      toast("You can pin up to 4 comments");
      return;
    }
    const ok = await real.togglePin(c.id);
    if (ok) toast.success(c.pinned ? "Comment unpinned" : "Comment pinned");
    else toast.error("Couldn't update pin");
  };

  const remove = (c: DisplayComment) => {
    if (useReal) {
      void real.remove(c.id);
      toast.success("Comment deleted");
    } else {
      setLocal((p) => p.filter((x) => x.id !== c.id));
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="border-border bg-popover">
        <div className="mx-auto flex h-[70vh] w-full max-w-lg flex-col">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center font-display text-base">
              {count} {count === 1 ? "comment" : "comments"}
            </DrawerTitle>
          </DrawerHeader>

          <ul className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {list.map((c) => (
              <li key={c.id} className={c.pinned ? "flex gap-3 rounded-xl bg-secondary/40 p-2" : "flex gap-3"}>
                {isRealUser(c.user.id) && !c.mine ? (
                  <Link
                    to="/u/$userId"
                    params={{ userId: c.user.id }}
                    onClick={() => setOpen(false)}
                    onPointerEnter={() => prefetchProfile(c.user.id)}
                    onPointerDown={() => prefetchProfile(c.user.id)}
                    className="shrink-0"
                    aria-label={`Open @${c.user.username} profile`}
                  >
                    <CommentAvatar user={c.user} url={c.avatarUrl} />
                  </Link>
                ) : (
                  <CommentAvatar user={c.user} url={c.avatarUrl} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {isRealUser(c.user.id) && !c.mine ? (
                      <Link
                        to="/u/$userId"
                        params={{ userId: c.user.id }}
                        onClick={() => setOpen(false)}
                        onPointerEnter={() => prefetchProfile(c.user.id)}
                        onPointerDown={() => prefetchProfile(c.user.id)}
                        className="font-semibold text-foreground transition-opacity active:opacity-60"
                      >
                        @{c.user.username}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">@{c.user.username}</span>
                    )}{" "}
                    · {c.time}
                  </p>
                  <p className="text-sm">{c.body}</p>
                  {c.pinned && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <Pin className="h-3 w-3" /> Pinned
                    </p>
                  )}
                </div>
                <div className="mt-1 flex shrink-0 items-start gap-2">
                {canModerate && (
                  <button
                    onClick={() => void togglePin(c)}
                    aria-label={c.pinned ? "Unpin comment" : "Pin comment"}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {c.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                )}
                {(c.mine || canModerate) && (
                  <button
                    onClick={() => remove(c)}
                    aria-label="Delete comment"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                </div>
              </li>
            ))}
            {useReal && !real.loading && list.length === 0 && (
              <li className="pt-10 text-center text-sm text-muted-foreground">
                No comments yet. Be the first.
              </li>
            )}
          </ul>

          <div className="safe-bottom flex items-center gap-2 border-t border-border px-4 pt-3">
            <YwAvatar user={currentUser} size={34} />
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Add a comment…"
              className="h-11 rounded-full border-0 bg-secondary text-sm"
            />
            <button
              onClick={send}
              aria-label="Send comment"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full brand-gradient transition-transform active:scale-90"
            >
              <SendHorizonal className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
