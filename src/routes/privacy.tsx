import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — YourWorld" },
      {
        name: "description",
        content:
          "YourWorld Privacy Policy — how we collect, use, store, and protect your personal information and content.",
      },
      { property: "og:title", content: "Privacy Policy — YourWorld" },
      {
        property: "og:description",
        content: "How YourWorld collects, uses, stores, and protects your personal information and content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
        <ShieldCheck size={18} className="text-indigo-400" />
        {title}
      </h2>
      <div className="text-sm text-zinc-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/settings" className="p-1 text-zinc-300 hover:text-white">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-xs text-zinc-500 mb-6">Last updated: August 30, 2026</p>

        <Section title="1. Information We Collect">
          <p>
            We collect the information you provide when you create an account (name, email, profile
            details), content you post, and usage data such as device, interactions, and logs. Orbit
            discovery data is stored separately with privacy-first controls.
          </p>
        </Section>

        <Section title="2. How We Use Information">
          <p>
            We use your information to provide, personalize, and secure the YourWorld platform,
            enable features such as Feed, Reels, Stories, chat, calls, Orbit, monetization, and to
            detect abuse and enforce our policies.
          </p>
        </Section>

        <Section title="3. Data Storage & Security">
          <p>
            Your data is stored with our backend provider and protected with Row-Level Security and
            access controls. Authentication tokens and sessions are handled securely. We do not sell
            your personal data.
          </p>
        </Section>

        <Section title="4. Sharing">
          <p>
            We share data only as necessary to operate the platform, comply with legal obligations, or
            respond to verified copyright takedown requests (see our{" "}
            <Link to="/copyright-policy" className="text-indigo-400 underline">
              Copyright & DMCA Policy
            </Link>
            ).
          </p>
        </Section>

        <Section title="5. Your Rights">
          <p>
            You may view, edit, or delete your account data from Settings. You can manage visibility,
            blocked accounts, notifications, and Orbit privacy controls at any time.
          </p>
        </Section>

        <Section title="6. Cookies & Local Storage">
          <p>
            We use local storage and cookies to keep you signed in and remember preferences.
            Persistent authentication keeps you logged in across sessions unless you manually log out.
          </p>
        </Section>

        <Section title="7. Children's Privacy">
          <p>YourWorld is not directed to children under 13 (or the applicable minimum age).</p>
        </Section>

        <Section title="8. Contact">
          <p>
            Privacy questions? Contact us at{" "}
            <a href="mailto:Yourworld2029@gmail.com" className="text-indigo-400 underline">
              Yourworld2029@gmail.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
