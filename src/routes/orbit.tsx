import { createFileRoute, Outlet } from "@tanstack/react-router";
import { OrbitProvider } from "@/lib/orbit-store";
import { OrbitLockGate } from "@/components/yw/OrbitLockGate";

export const Route = createFileRoute("/orbit")({
  component: OrbitLayout,
});

function OrbitLayout() {
  return (
    <OrbitProvider>
      <OrbitLockGate>
        <Outlet />
      </OrbitLockGate>
    </OrbitProvider>
  );
}
