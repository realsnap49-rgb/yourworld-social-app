import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PresenceMeta = { user_id: string; typing_until: number; online_at: string };

/**
 * Live presence for a chat thread: who else is in the room and whether the
 * peer is currently typing. Uses a Supabase Realtime presence channel.
 */
export function useThreadPresence(threadId: string, me: string | null) {
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingUntil = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!me || !threadId) return;
    const channel = supabase.channel(`presence-thread-${threadId}`, {
      config: { presence: { key: me } },
    });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState<PresenceMeta>();
      const others = Object.entries(state)
        .filter(([key]) => key !== me)
        .flatMap(([, metas]) => metas);
      setPeerOnline(others.length > 0);
      setPeerTyping(others.some((m) => (m.typing_until ?? 0) > Date.now()));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: me, typing_until: 0, online_at: new Date().toISOString() });
        }
      });

    // Typing flags expire on their own; re-evaluate on a light interval.
    tick.current = setInterval(sync, 1000);

    return () => {
      if (tick.current) clearInterval(tick.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [threadId, me]);

  /** Call on every keystroke — throttled to one track() per second. */
  const setTyping = useCallback(
    (typing: boolean) => {
      const channel = channelRef.current;
      if (!channel || !me) return;
      const now = Date.now();
      if (typing && now < typingUntil.current - 2000) return;
      typingUntil.current = typing ? now + 3000 : 0;
      void channel.track({
        user_id: me,
        typing_until: typingUntil.current,
        online_at: new Date().toISOString(),
      });
    },
    [me],
  );

  return useMemo(() => ({ peerOnline, peerTyping, setTyping }), [peerOnline, peerTyping, setTyping]);
}

/** Live wallet balance for the signed-in user, kept in sync via Realtime. */
export function useWallet() {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid || !alive) {
        setLoading(false);
        return;
      }

      const load = async () => {
        const { data } = await supabase
          .from("wallets")
          .select("balance,currency")
          .eq("user_id", uid)
          .maybeSingle();
        if (!alive) return;
        setBalance(data ? Number(data.balance) : 0);
        if (data?.currency) setCurrency(data.currency);
        setLoading(false);
      };
      await load();

      channel = supabase
        .channel(`wallet-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = payload.new as { balance?: number; currency?: string } | undefined;
            if (row?.balance != null) setBalance(Number(row.balance));
            if (row?.currency) setCurrency(row.currency);
          },
        )
        .subscribe();
    })();

    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return { balance, currency, loading };
}
