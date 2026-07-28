import { createFileRoute } from "@tanstack/react-router";
import { ChannelContentList } from "@/components/yw/ChannelContentList";
import { channelReels } from "@/lib/channel-data";

export const Route = createFileRoute("/channel/reels")({
  head: () => ({
    meta: [
      { title: "Channel Reels — YourWorld" },
      { name: "description", content: "Manage and review the reels published on your YourWorld channel." },
      { property: "og:title", content: "Channel Reels — YourWorld" },
      { property: "og:description", content: "Performance of every item published to your channel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ChannelContentList title="Reels" items={channelReels} emptyLabel="No reels published yet." />
  ),
});
