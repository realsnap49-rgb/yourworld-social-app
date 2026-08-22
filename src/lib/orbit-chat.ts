import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadOrbitMedia } from "@/lib/orbit-live";

export type OrbitMsgKind = "text" | "photo" | "video" | "audio" | "system";

export type OrbitMessage = {
  id: string;
  me: boolean;
  kind: OrbitMsgKind;
  text?: string;
  url?: string;
  viewOnce?: boolean;
  at: number;
};

type Row = {
  id: string;
  sender_id: string;
  recipient_id: string;
  kind: string;
  text: string | null;
  url: string | null;
  view_once: boolean;
  created_at: string;
};

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const toMsg = (r: Row, me: string): OrbitMessage => ({
  id: r.id,
  me: r.sender_id === me,
  kind: (r.kind as OrbitMsgKind) ?? "text",
  text: r.text ?? undefined,
  url: r.url ?? undefined,
  viewOnce: r.view_once,
  at: new Date(r.created_at).getTime(),
});

/** Real Orbit one-to-one chat: stored in the database and live for both users. */
export function useOrbitChat(peerId: string, enabled: boolean) {
  const [messages, setMessages] = useState<OrbitMessage[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const meRef = useRef<string | null>(null);

  const merge = useCallback((next: OrbitMessage[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of next) map.set(m.id, m);
      return [...map.values()].sort((a, b) => a.at - b.at);
    });
  }, []);

  useEffect(() => {
    if (!enabled || !isUuid(peerId)) {
      setMessages([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id;
      if (!me || cancelled) return;
      meRef.current = me;
      setMeId(me);
      const { data } = await supabase
        .from("orbit_messages")
        .select("id,sender_id,recipient_id,kind,text,url,view_once,created_at")
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${me})`,
        )
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages(((data ?? []) as Row[]).map((r) => toMsg(r, me)));
    };

    void load();

    const channel = supabase
      .channel(`orbit-chat-${peerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orbit_messages" },
        (payload) => {
          const me = meRef.current;
          if (!me) return;
          const row = (payload.new ?? payload.old) as Row | undefined;
          if (!row) return;
          const pair =
            (row.sender_id === me && row.recipient_id === peerId) ||
            (row.sender_id === peerId && row.recipient_id === me);
          if (!pair) return;
          if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
            return;
          }
          merge([toMsg(row, me)]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [peerId, enabled, merge]);

  const insert = useCallback(
    async (msg: { kind: OrbitMsgKind; text?: string; url?: string; viewOnce?: boolean }) => {
      const me = meRef.current;
      if (!me || !isUuid(peerId)) return null;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      merge([
        {
          id: tempId,
          me: true,
          kind: msg.kind,
          text: msg.text,
          url: msg.url,
          viewOnce: msg.viewOnce,
          at: Date.now(),
        },
      ]);
      const { data, error } = await supabase
        .from("orbit_messages")
        .insert({
          sender_id: me,
          recipient_id: peerId,
          kind: msg.kind,
          text: msg.text ?? null,
          url: msg.url ?? null,
          view_once: !!msg.viewOnce,
        } as never)
        .select("id,sender_id,recipient_id,kind,text,url,view_once,created_at")
        .maybeSingle();
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (error || !data) return null;
      merge([toMsg(data as Row, me)]);
      return (data as Row).id;
    },
    [peerId, merge],
  );

  const sendText = useCallback((text: string) => insert({ kind: "text", text }), [insert]);

  const sendMedia = useCallback(
    async (file: File, kind: "photo" | "video" | "audio", viewOnce = false) => {
      const url = await uploadOrbitMedia(file);
      if (!url) return null;
      return insert({ kind, url, viewOnce });
    },
    [insert],
  );

  const remove = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    await supabase.from("orbit_messages").delete().in("id", ids.filter(isUuid));
  }, []);

  const clear = useCallback(async () => {
    const ids = messages.map((m) => m.id);
    await remove(ids);
  }, [messages, remove]);

  return { messages, meId, sendText, sendMedia, insert, remove, clear };
}
