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
import { byId, currentUser, type Comment } from "@/lib/yw-data";
import { Heart, SendHorizonal } from "lucide-react";

export function CommentsSheet({
  children,
  comments,
}: {
  children: ReactNode;
  comments: Comment[];
}) {
  const [list, setList] = useState(comments);
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    setList((p) => [
      ...p,
      { id: `local-${Date.now()}`, userId: currentUser.id, text: draft.trim(), time: "now" },
    ]);
    setDraft("");
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="border-border bg-popover">
        <div className="mx-auto flex h-[70vh] w-full max-w-lg flex-col">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center font-display text-base">
              {list.length} comments
            </DrawerTitle>
          </DrawerHeader>

          <ul className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {list.map((c) => {
              const u = byId(c.userId);
              return (
                <li key={c.id} className="flex gap-3">
                  <YwAvatar user={u} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      @{u.username} · {c.time}
                    </p>
                    <p className="text-sm">{c.text}</p>
                  </div>
                  <Heart className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </li>
              );
            })}
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