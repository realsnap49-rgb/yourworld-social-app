import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, BadgeCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { YwAvatar } from "@/components/yw/Avatar";
import type { User } from "@/lib/yw-data";

export type ProfileEdit = {
  name: string;
  username: string;
  category: string;
  bio: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  coverUrl?: string;
  avatarFile?: File;
  coverFile?: File;
};

const CATEGORIES = ["Creator", "Athlete", "Business", "Gamer", "Artist", "Musician", "Photographer"];
const BIO_MAX = 300;

export function EditProfileSheet({
  open,
  onOpenChange,
  user,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: User;
  value: ProfileEdit;
  onSave: (v: ProfileEdit) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<ProfileEdit>(value);
  const [saving, setSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const set = <K extends keyof ProfileEdit>(k: K, v: ProfileEdit[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const pick = (file: File | undefined, key: "avatarUrl" | "coverUrl") => {
    if (!file) return;
    setDraft((d) => ({
      ...d,
      [key]: URL.createObjectURL(file),
      [key === "avatarUrl" ? "avatarFile" : "coverFile"]: file,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92svh] overflow-y-auto rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 glass px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-secondary/70 transition-transform active:scale-90"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <h2 className="font-display text-base font-bold">Edit Profile</h2>
          <span className="w-8" />
        </div>

        <div className="px-4 pb-8 pt-4">
          <div className="relative overflow-hidden rounded-3xl bg-secondary/60">
            <div className="relative h-28 w-full">
              {draft.coverUrl ? (
                <img src={draft.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(120deg,oklch(0.30_0.08_300),oklch(0.24_0.06_250))]" />
              )}
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium backdrop-blur transition-transform active:scale-95"
              >
                <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                Change cover
              </button>
            </div>

            <div className="flex items-center gap-4 p-4">
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                className="relative shrink-0 transition-transform active:scale-95"
                aria-label="Change profile photo"
              >
                {draft.avatarUrl ? (
                  <img
                    src={draft.avatarUrl}
                    alt=""
                    className="h-[68px] w-[68px] rounded-full object-cover"
                  />
                ) : (
                  <YwAvatar user={user} size={68} />
                )}
                <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-foreground text-background">
                  <Camera className="h-3.5 w-3.5" strokeWidth={1.9} />
                </span>
              </button>
              <p className="text-sm text-muted-foreground">
                Tap the photos to update your profile picture and cover.
              </p>
            </div>
          </div>

          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pick(e.target.files?.[0], "avatarUrl")}
          />
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pick(e.target.files?.[0], "coverUrl")}
          />

          <div className="space-y-4 pt-5">
            <Field label="Display Name">
              <Input
                value={draft.name}
                maxLength={40}
                onChange={(e) => set("name", e.target.value)}
                className="h-11 rounded-xl"
              />
            </Field>

            <Field label="Username">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  value={draft.username}
                  maxLength={30}
                  onChange={(e) =>
                    set("username", e.target.value.replace(/[^\w.]/g, "").toLowerCase())
                  }
                  className="h-11 rounded-xl pl-7"
                />
              </div>
            </Field>

            <Field label="Category">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const active = draft.category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("category", active ? "" : c)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                        active
                          ? "bg-foreground text-background"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Bio">
              <Textarea
                value={draft.bio}
                maxLength={BIO_MAX}
                rows={5}
                onChange={(e) => set("bio", e.target.value)}
                className="min-h-28 rounded-xl leading-relaxed"
              />
              <p className="pt-1 text-right text-[11px] text-muted-foreground">
                {draft.bio.length}/{BIO_MAX}
              </p>
            </Field>

            <button
              type="button"
              onClick={() => toast.success("Verification request submitted for review")}
              className="flex w-full items-center justify-between rounded-2xl bg-secondary px-4 py-3.5 text-left transition-transform active:scale-[0.99]"
            >
              <span className="flex items-center gap-2.5">
                <BadgeCheck
                  className="h-5 w-5 fill-[oklch(0.62_0.17_255)] text-background"
                  strokeWidth={1.8}
                />
                <span className="text-sm font-medium">Verification Request</span>
              </span>
              <span className="text-xs text-muted-foreground">Apply</span>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
            <Button
              variant="secondary"
              className="h-11 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-full"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave(draft);
                  onOpenChange(false);
                  toast.success("Profile updated");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save profile");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}