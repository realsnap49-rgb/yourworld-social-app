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

/** Warning copy for the Social-only keyword-triggered protection modal. */
export const PLATFORM_PROTECTION_WARNING_TITLE = "🛡️ Platform Protection Warning";
export const PLATFORM_PROTECTION_WARNING_BODY =
  "For escrow protection, secure payouts, and valid tax invoices, please use official In-App Sponsorship deals. Direct off-platform payments are not protected.";

/** Sensitive payment/contact keywords that trigger the Social DM warning modal. */
const WARN_TERMS = [
  "account number",
  "phonepe",
  "phone pe",
  "paytm",
  "google pay",
  "gpay",
  "upi",
  "bank details",
  "ifsc",
  "whatsapp",
  "number",
];

/** True when a Social DM draft contains sensitive payment/contact hints. */
export function needsProtectionWarning(text: string | null | undefined): boolean {
  if (!text) return false;
  const haystack = text.toLowerCase();
  if (WARN_TERMS.some((t) => haystack.includes(t))) return true;
  // Phone-number-like digit runs (7+ digits, ignoring spaces/dashes).
  return /(?:\d[\s-]?){7,}/.test(haystack);
}

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
