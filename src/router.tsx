import { QueryClient } from "@tanstack/react-query";
import { createRouter, Link } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error }: { error: Error }) {
  console.error("[RouterError]", error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Something went wrong. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Try again
          </button>
          <Link
            to="/"
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function DefaultNotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-2 text-sm text-neutral-400">
          This page or profile doesn't exist or may have been removed.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: DefaultNotFoundComponent,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
