import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — YourWorld" },
      {
        name: "description",
        content:
          "YourWorld Terms of Service — the rules and conditions that govern your use of the YourWorld social platform.",
      },
      { property: "og:title", content: "Terms of Service — YourWorld" },
      {
        property: "og:description",
        content: "Rules and conditions that govern your use of the YourWorld social platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
        <FileText size={18} className="text-indigo-400" />
        {title}
      </h2>
      <div className="text-sm text-zinc-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/settings" className="p-1 text-zinc-300 hover:text-white">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold">Terms of Service</h1>
        </div>

        <p className="text-xs text-zinc-500 mb-6">Last updated: August 30, 2026</p>

        <Section title="1. Acceptance of Terms">
          <p>
            By creating an account or using YourWorld ("YW"), you agree to be bound by these Terms of
            Service. If you do not agree, you may not access or use the platform.
          </p>
        </Section>

        <Section title="2. Your Account">
          <p>
            You are responsible for safeguarding your account credentials and for all activity that
            occurs under your account. You must be at least 13 years old (or the minimum age in your
            country) to use YourWorld.
          </p>
        </Section>

        <Section title="3. Content & Conduct">
          <p>
            You retain ownership of content you post. You grant YourWorld a worldwide, non-exclusive,
            royalty-free license to host, store, use, display, and distribute your content within the
            platform. You must not post content that is unlawful, infringing, hateful, harassing, or
            that violates our Community Guidelines.
          </p>
        </Section>

        <Section title="4. Monetization & Payments">
          <p>
            Creators participating in monetization (Sponsorships, VIP content, paid courses) are
            subject to the Monetization policies. Payouts are processed per the eligibility threshold
            and schedule. Tax invoices and Form 16A certificates are provided where applicable.
          </p>
        </Section>

        <Section title="5. Privacy">
          <p>
            Your use of YourWorld is also governed by our{" "}
            <Link to="/privacy" className="text-indigo-400 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            YourWorld respects intellectual property. See our{" "}
            <Link to="/copyright-policy" className="text-indigo-400 underline">
              Copyright & DMCA Policy
            </Link>{" "}
            for the takedown procedure and designated copyright agent.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            We may suspend or terminate your account if you violate these Terms. You may delete your
            account at any time from Settings.
          </p>
        </Section>

        <Section title="8. Disclaimer & Limitation of Liability">
          <p>
            YourWorld is provided "as is" without warranties of any kind. To the maximum extent
            permitted by law, YourWorld shall not be liable for indirect, incidental, or
            consequential damages arising from your use of the platform.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about these Terms? Contact us at{" "}
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
