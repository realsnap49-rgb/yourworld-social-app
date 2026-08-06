import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { YwAvatar } from "@/components/yw/Avatar";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Moment {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  type: string;
  created_at: string;
}

export function Stories() {
  const [open, setOpen] = useState<Moment | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);

  useEffect(() => {
    async function fetchMoments() {
      const { data, error } = await supabase
        .from("moments_and_reels")
        .select("*")
        .eq("type", "moment")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMoments(data as Moment[]);
      }
    }
    fetchMoments();
  }, []);

  return (
    <>
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-4 pt-4">
        <Link to="/editor" className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-muted/30 p-1 transition-all hover:border-primary">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background shadow-xs">
              <Plus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Your Moment</span>
        </Link>

        {moments.map((item) => (
          <button
            key={item.id}
            onClick={() => setOpen(item)}
            className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
          >
            <div className="rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
              <div className="rounded-full bg-background p-[2px]">
                <YwAvatar name="User" className="h-14 w-14" />
              </div>
            </div>
            <span className="max-w-[68px] truncate text-[11px] font-medium">Moment</span>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-black text-white border-none">
          <DialogTitle className="sr-only">Moment View</DialogTitle>
          {open && (
            <div className="relative aspect-[9/16] w-full flex items-center justify-center">
              <img src={open.media_url} alt={open.caption || "Moment"} className="h-full w-full object-cover" />
              {open.caption && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-lg text-sm text-white">
                  {open.caption}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
