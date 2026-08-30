import { supabase } from "@/integrations/supabase/client";

/**
 * Silent background compliance monitoring for direct messages.
 * Nothing here renders in the chat UI — matches are only recorded server-side.
 */
const TERMS = [
  "WhatsApp",
  "Phone Number",
  "GPay",
  "Paytm",
  "UPI",
  "Cash",
  "Direct Transfer",
  "@gmail.com",
  "Instagram DM",
  "Call Me",
  "Account Number",
  "PhonePe",
];

/** Permanent, neutral protection notice shown at the top of brand/creator DMs. */
export const PLATFORM_PROTECTION_NOTICE =
  "🛡️ Platform Protection: Use Official In-App Sponsorships for escrow protection and valid tax invoices.";

export function matchComplianceTerms(text: string | null | undefined): string[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  return TERMS.filter((t) => haystack.includes(t.toLowerCase()));
}

/**
 * Records a violation quietly. Never throws and never surfaces UI feedback,
 * so the chat experience is completely undisturbed.
 */
export function flagChatMessage(input: {
  surface: "social" | "orbit";
  text?: string | null;
  threadId?: string | null;
  peerId?: string | null;
  messageId?: string | null;
}): void {
  const matched = matchComplianceTerms(input.text);
  if (!matched.length) return;

  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      await supabase.from("chat_compliance_flags").insert({
        user_id: uid,
        surface: input.surface,
        thread_id: input.threadId ?? null,
        peer_id: input.peerId ?? null,
        message_id: input.messageId ?? null,
        matched_terms: matched,
        excerpt: (input.text ?? "").slice(0, 240),
      } as never);
    } catch {
      /* monitoring must stay invisible — swallow all errors */
    }
  })();
}
