import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Shield, Scale, AlertTriangle, Ban } from "lucide-react";

export const Route = createFileRoute("/copyright-policy")({
  head: () => ({
    meta: [
      { title: "Copyright & DMCA Policy — YourWorld" },
      {
        name: "description",
        content:
          "YourWorld respects intellectual property. Read our DMCA Safe Harbor policy, takedown procedure, designated copyright agent, and repeat infringer policy.",
      },
      { property: "og:title", content: "Copyright & DMCA Policy — YourWorld" },
      {
        property: "og:description",
        content:
          "DMCA Safe Harbor policy, takedown procedure, designated copyright agent, counter-notification and repeat infringer policy for YourWorld.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CopyrightPolicyPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-indigo-400" />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

function CopyrightPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur">
        <Link
          to="/settings"
          className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 hover:bg-zinc-800"
          aria-label="Back to settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Copyright & DMCA Policy</h1>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-transparent p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-indigo-400" />
            <h1 className="text-xl font-bold">YourWorld Copyright & DMCA Safe Harbor Policy</h1>
          </div>
          <p className="text-sm text-zinc-300">
            Last updated: August 30, 2026. This policy explains how YourWorld handles
            copyright concerns under the Digital Millennium Copyright Act (DMCA) and
            applicable international intellectual property laws.
          </p>
        </div>

        <Section icon={Shield} title="1. Respect for Intellectual Property">
          <p>
            YourWorld deeply respects intellectual property rights and is committed to
            protecting creators against unauthorized re-uploads, piracy, and content theft.
            We do not allow users to upload, share, or monetize content they do not own or
            are not authorized to use.
          </p>
          <p>
            All content uploaded to YourWorld — including videos, Reels, Moments, music,
            images, and livestreams — is expected to be original or properly licensed.
            Unauthorized re-uploads of another creator's work, edited or unedited, are
            strictly prohibited and will be removed when identified or reported.
          </p>
          <p>
            YourWorld operates as a service provider under the DMCA Safe Harbor framework.
            We respond promptly to valid takedown notices from copyright owners or their
            authorized agents and terminate accounts of repeat infringers.
          </p>
        </Section>

        <Section icon={AlertTriangle} title="2. Takedown Procedure for Copyright Owners">
          <p>If you believe your copyrighted work has been uploaded to YourWorld without authorization, follow these steps to submit a DMCA takedown request:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <span className="font-semibold text-white">Identify the work.</span> Provide a
              clear description and, where possible, a direct link to the original copyrighted
              work you own (e.g. your YouTube video URL, original file, or registration).
            </li>
            <li>
              <span className="font-semibold text-white">Identify the infringing content.</span>
              Provide the YourWorld content link or post/moment ID of the material you believe
              is infringing.
            </li>
            <li>
              <span className="font-semibold text-white">Submit the notice.</span> Send a
              written notice to our Designated Copyright Agent (see Section 3) including the
              elements required by 17 U.S.C. § 512(c)(3), or use the in-app
              <span className="text-white"> Report a problem → Copyright Infringement (DMCA)</span> form.
            </li>
            <li>
              <span className="font-semibold text-white">Review & action.</span> YourWorld will
              review valid notices and remove or disable access to the infringing material
              expeditiously. We will attempt to notify the affected user.
            </li>
            <li>
              <span className="font-semibold text-white">Counter-notification.</span> If the
              user believes content was removed in error, they may submit a
              counter-notification as described in Section 4.
            </li>
          </ol>
          <p className="mt-2 rounded-lg bg-zinc-900 p-3 text-xs text-zinc-400">
            Your notice must include: your physical or electronic signature; identification of
            the copyrighted work; identification of the infringing material to be removed;
            your contact information (name, address, email, phone); a statement that you
            believe in good faith the use is unauthorized; and a statement, under penalty of
            perjury, that the information is accurate and that you are the owner or authorized
            to act on the owner's behalf.
          </p>
        </Section>

        <Section icon={Mail} title="3. Designated Copyright Agent">
          <p>
            YourWorld's designated copyright agent for receiving takedown notices under the
            DMCA can be reached at:
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-400" />
              <a
                href="mailto:Yourworld2029@gmail.com"
                className="text-base font-semibold text-indigo-300 hover:underline"
              >
                Yourworld2029@gmail.com
              </a>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Send all DMCA takedown notices and counter-notifications to this email. Include
              “DMCA Takedown Notice” in the subject line for faster processing.
            </p>
          </div>
        </Section>

        <Section icon={Scale} title="4. Counter-Notification Policy">
          <p>
            If your content was removed because of a DMCA takedown notice and you believe the
            removal was in error (for example, because you own the rights or your use is
            lawful, such as fair use), you may submit a counter-notification to our Designated
            Copyright Agent.
          </p>
          <p>A valid counter-notification must include:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your physical or electronic signature.</li>
            <li>Identification of the removed material and its location before removal.</li>
            <li>A statement under penalty of perjury that you have a good-faith belief the material was removed in error.</li>
            <li>Your name, address, telephone number, and email.</li>
            <li>A statement that you consent to the jurisdiction of the Federal District Court for your address (or, if outside the U.S., any judicial district where YourWorld may be found) and that you will accept service of process from the person who submitted the original takedown notice.</li>
          </ul>
          <p>
            Upon receiving a valid counter-notification, YourWorld may restore the removed
            content within 10–14 business days unless the original complainant files a court
            action seeking to restrain the infringement.
          </p>
        </Section>

        <Section icon={Ban} title="5. Repeat Infringer Account Termination">
          <p>
            In accordance with the DMCA Safe Harbor requirements, YourWorld maintains and
            enforces a policy of terminating, in appropriate circumstances, the accounts of
            users who are determined to be repeat infringers.
          </p>
          <p>
            A user is considered a repeat infringer after receiving three (3) valid DMCA
            takedown notices within a 12-month period. Upon reaching this threshold, the
            account will be permanently terminated, associated content removed, and the user
            barred from creating new accounts using the same credentials or devices.
          </p>
          <p>
            YourWorld may also terminate an account immediately for flagrant or commercial-scale
            infringement, regardless of the three-notice threshold.
          </p>
        </Section>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-xs text-zinc-400">
          <p className="font-semibold text-zinc-300">Need to file a report now?</p>
          <p className="mt-1">
            Use <span className="text-white">Settings → Help & Support → Report a problem → Copyright Infringement (DMCA)</span> inside the app, or email
            <a href="mailto:Yourworld2029@gmail.com" className="text-indigo-300 hover:underline"> Yourworld2029@gmail.com</a> directly.
          </p>
        </div>
      </main>
    </div>
  );
}
