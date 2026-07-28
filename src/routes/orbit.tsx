import { createFileRoute, Outlet } from "@tanstack/react-router";
import { OrbitProvider } from "@/lib/orbit-store";

export const Route = createFileRoute("/orbit")({
  component: OrbitLayout,
});

function OrbitLayout() {
  return (
    <OrbitProvider>
      <Outlet />
    </OrbitProvider>
  );
}