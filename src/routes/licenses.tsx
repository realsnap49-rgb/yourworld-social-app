import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/licenses")({
  head: () => ({
    meta: [
      { title: "Open Source Licenses — YourWorld" },
      {
        name: "description",
        content:
          "Open source licenses and attributions for the libraries and components used in YourWorld.",
      },
      { property: "og:title", content: "Open Source Licenses — YourWorld" },
      {
        property: "og:description",
        content: "Open source licenses and attributions for YourWorld.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LicensesPage,
});

type License = {
  name: string;
  license: string;
  notice: string;
};

const LICENSES: License[] = [
  {
    name: "React",
    license: "MIT License",
    notice: "Copyright (c) Meta Platforms, Inc. and affiliates.",
  },
  {
    name: "TanStack Router / TanStack Start",
    license: "MIT License",
    notice: "Copyright (c) Tanner Linsley.",
  },
  {
    name: "Supabase JavaScript Client",
    license: "MIT License",
    notice: "Copyright (c) Supabase, Inc.",
  },
  {
    name: "Tailwind CSS",
    license: "MIT License",
    notice: "Copyright (c) Adam Wathan and Tailwind Labs LLC.",
  },
  {
    name: "Lucide React Icons",
    license: "ISC License",
    notice: "Copyright (c) Lucide Contributors.",
  },
  {
    name: "shadcn/ui Components",
    license: "MIT License",
    notice: "Copyright (c) shadcn.",
  },
  {
    name: "Sonner (toasts)",
    license: "MIT License",
    notice: "Copyright (c) Emil Kowalski.",
  },
  {
    name: "Zod",
    license: "MIT License",
    notice: "Copyright (c) Colin McDonnell.",
  },
];

const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

function LicensesPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mt-2 mb-1">Open Source Licenses</h1>
        <p className="text-sm text-zinc-400 mb-6">
          YourWorld is built with the following open source software. We are
          grateful to their authors and communities.
        </p>

        <div className="space-y-3">
          {LICENSES.map((lib) => (
            <div
              key={lib.name}
              className="rounded-2xl border border-zinc-800 bg-[#141418] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{lib.name}</span>
                <span className="text-[11px] font-medium text-indigo-400">
                  {lib.license}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">{lib.notice}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-4 mt-6">
          <h2 className="text-sm font-semibold mb-2">MIT License (Full Text)</h2>
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-400 font-mono">
{MIT_TEXT}
          </pre>
        </div>

        <p className="text-[11px] text-zinc-600 mt-6 text-center">
          YourWorld © 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default LicensesPage;
