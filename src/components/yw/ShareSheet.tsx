import React, { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Link2,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useMoments } from "@/lib/moment-store";

interface ShareSheetProps {
  /** caption / title of the shared item */
  title?: string;
  /** absolute or relative link to the item */
  url?: string;
  /** media source, used for "Add to moment" */
  media?: string;
  mediaKind?: "photo" | "video";
  children?: React.ReactNode;
}

type Target = {
  id: string;
  label: string;
  ring: string;
  glyph: React.ReactNode;
};

const glyph = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
    <path d={d} />
  </svg>
);

const WHATSAPP =
  "M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.24-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.18 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z";
const INSTAGRAM =
  "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9a3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32Zm0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Zm5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0Z";
const FACEBOOK =
  "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z";
const SNAPCHAT =
  "M12.02 2c2.6.02 4.62 1.9 4.76 4.5.05.9-.02 1.8.02 2.34.36.12.86-.2 1.32-.2.5 0 1.06.28 1.06.82 0 .6-.86.86-1.4 1.06-.4.15-.72.28-.72.6 0 .5 1.5 2.9 3.63 3.42.3.08.44.28.4.56-.08.53-1.2.86-2.03 1.01-.28.05-.36.2-.42.5-.06.28-.13.66-.42.66-.42 0-.96-.2-1.86-.05-.9.16-1.72 1.36-3.36 1.36s-2.42-1.2-3.34-1.36c-.9-.15-1.44.05-1.86.05-.3 0-.36-.38-.42-.66-.06-.3-.14-.45-.42-.5-.83-.15-1.95-.48-2.03-1.01-.04-.28.1-.48.4-.56 2.13-.52 3.63-2.92 3.63-3.42 0-.32-.32-.45-.72-.6-.54-.2-1.4-.46-1.4-1.06 0-.54.56-.82 1.06-.82.46 0 .96.32 1.32.2.04-.54-.03-1.44.02-2.34C7.4 3.9 9.42 2.02 12.02 2Z";

export const ShareSheet: React.FC<ShareSheetProps> = ({
  title = "",
  url,
  media,
  mediaKind = "photo",
  children,
}) => {
  const [open, setOpen] = useState(false);
  const { addMoment } = useMoments();

  const link =
    url ?? (typeof window !== "undefined" ? window.location.href : "https://yourworld.app");
  const text = title ? `${title} — ${link}` : link;

  const openWindow = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
    setOpen(false);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "YourWorld", text: title, url: link });
      } catch {
        /* dismissed */
      }
    } else {
      await copy();
    }
    setOpen(false);
  };

  const toMoment = () => {
    if (!media) {
      toast.error("Nothing to add");
      return;
    }
    addMoment({
      kind: mediaKind === "video" ? "video" : "photo",
      media,
      text: title,
      textBg: "",
      stickers: [],
      mentions: [],
      privacy: "everyone",
      duration: 24,
      effect: "none",
      ai: {},
      allowDownload: true,
      screenshotAlert: false,
      poll: null,
    });
    toast.success("Added to your moment");
    setOpen(false);
  };

  const targets: Target[] = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      ring: "from-[#25D366] to-[#0f9d58]",
      glyph: glyph(WHATSAPP),
    },
    {
      id: "instagram",
      label: "Instagram",
      ring: "from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
      glyph: glyph(INSTAGRAM),
    },
    {
      id: "facebook",
      label: "Facebook",
      ring: "from-[#1877F2] to-[#0b5fce]",
      glyph: glyph(FACEBOOK),
    },
    {
      id: "snapchat",
      label: "Snapchat",
      ring: "from-[#FFFC00] to-[#f5d900]",
      glyph: glyph(SNAPCHAT),
    },
  ];

  const onTarget = (id: string) => {
    if (id === "whatsapp") return openWindow(`https://wa.me/?text=${encodeURIComponent(text)}`);
    if (id === "facebook")
      return openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`);
    if (id === "snapchat")
      return openWindow(
        `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(link)}`,
      );
    // Instagram has no web share intent — copy + open app
    navigator.clipboard?.writeText(text).catch(() => {});
    toast.success("Link copied — paste it in Instagram");
    openWindow("https://www.instagram.com/");
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {children}
      </span>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            aria-label="Close share"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-background/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-t-3xl border-t border-border/60 bg-background/95 pb-8 pt-3 shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto h-1 w-10 rounded-full bg-foreground/25" />

            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <h3 className="text-sm font-black uppercase tracking-widest">Share to</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* apps row */}
            <div className="flex gap-4 overflow-x-auto px-5 pb-5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={toMoment}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-90"
              >
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25">
                  <Sparkles className="h-6 w-6" />
                  <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-background bg-foreground text-background">
                    <Plus className="h-3 w-3" />
                  </span>
                </span>
                <span className="text-[10px] font-semibold">Moment</span>
              </button>

              {targets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTarget(t.id)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-90"
                >
                  <span
                    className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${t.ring} text-white shadow-lg shadow-black/20`}
                  >
                    {t.glyph}
                  </span>
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>

            {/* actions */}
            <div className="mx-4 overflow-hidden rounded-2xl border border-border/60 bg-secondary/40">
              {[
                { id: "copy", label: "Copy link", Icon: Link2, run: copy },
                { id: "native", label: "More options", Icon: Share2, run: nativeShare },
                {
                  id: "message",
                  label: "Send in a chat",
                  Icon: MessageCircle,
                  run: () => {
                    setOpen(false);
                    window.location.assign("/chat");
                  },
                },
              ].map(({ id, label, Icon, run }) => (
                <button
                  key={id}
                  type="button"
                  onClick={run}
                  className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 text-left text-sm font-medium last:border-0 transition-colors hover:bg-foreground/5"
                >
                  <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareSheet;
