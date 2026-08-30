import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ModerationVerdict = {
  /** "safe" = publish, "review" = route to compliance review, "block" = refuse upload. */
  decision: "safe" | "review" | "block";
  /** Brands / trademarks detected in the frames or metadata. */
  brands: string[];
  /** True when the video looks like an undeclared paid promotion. */
  sponsorship: boolean;
  /** Short, neutral reason for the decision. */
  reason: string;
  /** True when the scan could not run (missing key / API failure). */
  skipped?: boolean;
};

const schema = z.object({
  title: z.string().trim().max(300).default(""),
  description: z.string().trim().max(4000).default(""),
  tags: z.array(z.string().max(60)).max(30).default([]),
  paidPromotion: z.boolean().default(false),
  /** Up to 3 base64 JPEG frames sampled from the video (no data: prefix). */
  frames: z.array(z.string().max(4_000_000)).max(3).default([]),
});

const MODEL = "gemini-2.5-flash";
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

const SYSTEM = `You are the automated content-safety and brand-detection reviewer for a social video platform.
Analyse the supplied video frames and metadata and reply with JSON only:
{"decision":"safe|review|block","brands":["..."],"sponsorship":true|false,"reason":"short neutral sentence"}
Rules:
- "block": sexual content, nudity, graphic violence/gore, self-harm, hate, illegal drugs/weapons sales, child endangerment.
- "review": visible third-party brands/logos/trademarks, undeclared paid promotion, gambling, medical/financial claims, unclear but risky content.
- "safe": everything else.
- brands: list only clearly identifiable brand or trademark names.
- Never include markdown fences or prose outside the JSON object.`;

function parseVerdict(text: string): ModerationVerdict | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Partial<ModerationVerdict>;
    const decision =
      raw.decision === "block" || raw.decision === "review" ? raw.decision : "safe";
    return {
      decision,
      brands: Array.isArray(raw.brands) ? raw.brands.filter((b) => typeof b === "string").slice(0, 12) : [],
      sponsorship: !!raw.sponsorship,
      reason: typeof raw.reason === "string" ? raw.reason.slice(0, 300) : "",
    };
  } catch {
    return null;
  }
}

/** Scans a video's sampled frames + metadata with Gemini before it is published. */
export const scanVideoContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<ModerationVerdict> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) {
      return { decision: "safe", brands: [], sponsorship: false, reason: "", skipped: true };
    }

    const parts: Array<Record<string, unknown>> = [
      {
        text: `${SYSTEM}\n\nMetadata:\ntitle: ${data.title}\ndescription: ${data.description}\ntags: ${data.tags.join(", ")}\ndeclared paid promotion: ${data.paidPromotion ? "yes" : "no"}`,
      },
    ];
    for (const frame of data.frames) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: frame } });
    }

    try {
      const res = await fetch(ENDPOINT(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      });

      if (!res.ok) {
        console.error(`Gemini moderation failed [${res.status}]: ${await res.text()}`);
        // Fail open so uploads are never blocked by an API outage, but flag for review.
        return {
          decision: "review",
          brands: [],
          sponsorship: false,
          reason: "Automated scan unavailable.",
          skipped: true,
        };
      }

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const verdict = parseVerdict(text);
      if (!verdict) {
        return {
          decision: "review",
          brands: [],
          sponsorship: false,
          reason: "Automated scan inconclusive.",
          skipped: true,
        };
      }
      return verdict;
    } catch (err) {
      console.error("Gemini moderation error", err);
      return {
        decision: "review",
        brands: [],
        sponsorship: false,
        reason: "Automated scan unavailable.",
        skipped: true,
      };
    }
  });
