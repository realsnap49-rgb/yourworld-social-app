import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-conversation chat options (display name, secret lock, view once, auto
 * delete, capture alerts, mute, block) persisted in `orbit_chat_settings`.
 * Used by the Social chat screen; Orbit chat keeps its own richer loader.
 */
export type ChatSettings = {
  displayName: string | null;
  secretLock: boolean;
  viewOnce: boolean;
  autoDelete: number;
  screenshotAlert: boolean;
  recordingAlert: boolean;
  muted: boolean;
  blocked: boolean;
};

const DEFAULTS: ChatSettings = {
  displayName: null,
  secretLock: false,
  viewOnce: false,
  autoDelete: 0,
  screenshotAlert: true,
  recordingAlert: true,
  muted: false,
  blocked: false,
};

type Row = {
  display_name: string | null;
  secret_lock_enabled: boolean;
  view_once_mode: boolean;
  auto_delete_seconds: number;
  screenshot_alert: boolean;
  recording_alert: boolean;
  muted: boolean;
  blocked: boolean | null;
};

export function useChatSettings(peerId: string | null) {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const meRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    setReady(false);
    if (!peerId) return;

    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? null;
      meRef.current = me;
      if (!me || !alive) return;
      const { data } = await supabase
        .from("orbit_chat_settings")
        .select(
          "display_name,secret_lock_enabled,view_once_mode,auto_delete_seconds,screenshot_alert,recording_alert,muted,blocked",
        )
        .eq("user_id", me)
        .eq("peer_id", peerId)
        .maybeSingle();
      if (!alive) return;
      const row = data as Row | null;
      if (row) {
        setSettings({
          displayName: row.display_name,
          secretLock: row.secret_lock_enabled,
          viewOnce: row.view_once_mode,
          autoDelete: row.auto_delete_seconds ?? 0,
          screenshotAlert: row.screenshot_alert,
          recordingAlert: row.recording_alert,
          muted: row.muted,
          blocked: !!row.blocked,
        });
      }
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [peerId]);

  /** Optimistic local update + background upsert so toggles feel instant. */
  const patch = useCallback(
    (next: Partial<ChatSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...next };
        const me = meRef.current;
        if (me && peerId) {
          void supabase.from("orbit_chat_settings").upsert(
            {
              user_id: me,
              peer_id: peerId,
              display_name: merged.displayName,
              secret_lock_enabled: merged.secretLock,
              view_once_mode: merged.viewOnce,
              auto_delete_seconds: merged.autoDelete,
              screenshot_alert: merged.screenshotAlert,
              recording_alert: merged.recordingAlert,
              muted: merged.muted,
              blocked: merged.blocked,
            } as never,
            { onConflict: "user_id,peer_id" },
          );
        }
        return merged;
      });
    },
    [peerId],
  );

  return { settings, ready, patch };
}
