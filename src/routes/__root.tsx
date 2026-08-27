import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "@/components/yw/BottomNav";
import { CreateSheet } from "@/components/yw/CreateSheet";
import { YwStoreProvider } from "@/lib/yw-store";
import { NotificationsProvider } from "@/lib/notifications-store";
import { MomentProvider } from "@/lib/moment-store";
import { AuthProvider, AuthGate } from "@/lib/auth-store";
import { SearchProvider } from "@/lib/search-store";
import { ChannelProvider } from "@/lib/channel-store";
import { CallProvider } from "@/lib/call-store";
import { UploadProvider } from "@/lib/upload-progress";
import { Toaster } from "@/components/ui/sonner";
import { SafeProvider } from "@/lib/safe-provider";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[RootErrorBoundary]", error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or heading back home.
        </p>
        {/* Show the actual error so we can diagnose mobile-only crashes */}
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-zinc-900 p-3 text-left text-[11px] leading-tight text-red-300 whitespace-pre-wrap break-all">
{String(error?.message ?? error)}
        </pre>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { title: "YourWorld — Share your world" },
      {
        name: "description",
        content: "YourWorld (YW) is a social app for moments, feeds and full-screen reels.",
      },
      { name: "theme-color", content: "#0e0e14" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "YourWorld — Share your world" },
      {
        property: "og:description",
        content: "Moments, feed and full-screen reels in one dark, fast social app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://mvvliwuldgcmrqffrfgi.supabase.co" },
      { rel: "dns-prefetch", href: "https://mvvliwuldgcmrqffrfgi.supabase.co" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const hideNav = pathname.startsWith("/orbit") || pathname.startsWith("/auth") || pathname.startsWith("/create") || pathname.startsWith("/moment/create") || pathname.startsWith("/channel/create");

  useEffect(() => {
    setCreateOpen(false);
  }, [pathname]);

  // Catch unhandled errors / promise rejections so they don't silently
  // crash the app on mobile devices.
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      console.error("[globalError]", e.message, e.filename, e.lineno);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      console.error("[unhandledRejection]", e.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeProvider name="YwStore">
          <YwStoreProvider>
            <SafeProvider name="Notifications">
              <NotificationsProvider>
                <SafeProvider name="Moments">
                  <MomentProvider>
                    <SafeProvider name="Search">
                      <SearchProvider>
                        <SafeProvider name="Channel">
                          <ChannelProvider>
                            <SafeProvider name="Call">
                              <CallProvider>
                                <SafeProvider name="Upload">
                                  <UploadProvider>
                                    {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                                    <AuthGate>
                                      <div className={cn("mx-auto min-h-screen w-full max-w-lg", hideNav ? "" : "pb-20")}>
                                        <Outlet />
                                      </div>
                                      {!hideNav && <BottomNav onOpenCreate={() => setCreateOpen(true)} />}
                                      <CreateSheet isOpen={createOpen} onClose={() => setCreateOpen(false)} />
                                    </AuthGate>
                                    <Toaster position="top-center" />
                                  </UploadProvider>
                                </SafeProvider>
                              </CallProvider>
                            </SafeProvider>
                          </ChannelProvider>
                        </SafeProvider>
                      </SearchProvider>
                    </SafeProvider>
                  </MomentProvider>
                </SafeProvider>
              </NotificationsProvider>
            </SafeProvider>
          </YwStoreProvider>
        </SafeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
