import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChannelProvider } from "@/lib/channel-store";

export const Route = createFileRoute("/channel")({
  component: ChannelLayout,
});

function ChannelLayout() {
  return (
    <ChannelProvider>
      <Outlet />
    </ChannelProvider>
  );
}
