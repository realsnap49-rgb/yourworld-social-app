import { useState, type ReactNode } from "react";
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
import { usePostComments, timeAgo } from "@/lib/social-data";
import { Heart, SendHorizonal } from "lucide-react";

type DisplayComment = {
  id: string;
  user: User;
  body: string;
  time: string;
};

function toUser(username: string, displayName: string, id: string, hue = 200): User {
  return {
    id,
    username,
    name: displayName || username,
    hue,
  };
}

/**
 * Comments drawer. When `postId` is provided it fetches real comments from the
 * database (with optimistic posting + realtime sync). Otherwise it falls back
 * to the supplied local comment list (used for demo / mock posts).
 */
export function CommentsSheet({
  children,
  postId,
  fallbackComments = [],
}: {
  children: ReactNode;
  postId?: string | null;
  fallbackComments?: Comment[];
}) {
  const real = usePostComments(postId ?? null);
  const [local, setLocal] = useState<Comment[]>(fallbackComments);
  const [draft, setDraft] = useState("");

  const useReal = !!postId;

  const list: DisplayComment[] = useReal
    ? real.comments.map((c) => ({
        id: c.id,
        user: toUser(c.username, c.displayName, c.userId),
        body: c.body,
        time: timeAgo(c.createdAt),
      }))
    : local.map((c) => {
        const u = byId(c.userId);
        return { id: c.id, user: u, body: c.text, time: c.time };
      });

  const count = useReal ? real.comments.length : local.length;

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

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="border-border bg-popover">
        <div className="mx-auto flex h-[70vh] w-full max-w-lg flex-col">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center font-display text-base">
              {count} comments
            </DrawerTitle>
          </DrawerHeader>

          <ul className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {list.map((c) => (
              <li key={c.id} className="flex gap-3">
                <YwAvatar user={c.user} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    @{c.user.username} · {c.time}
                  </p>
                  <p className="text-sm">{c.body}</p>
                </div>
                <Heart className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
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
