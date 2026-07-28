import { Eye, Heart } from "lucide-react";
import { ChannelHeader } from "@/components/yw/ChannelHeader";
import { formatCount, type ChannelItem } from "@/lib/channel-data";

export function ChannelContentList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: ChannelItem[];
  emptyLabel: string;
}) {
  return (
    <main className="min-h-screen pb-12">
      <ChannelHeader title={title} />
      <div className="space-y-3 px-4 pt-4">
        {items.map((it, i) => (
          <article
            key={it.id}
            className="surface-card animate-rise flex gap-3 overflow-hidden rounded-3xl p-2.5"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <img
              src={it.thumb}
              alt={it.title}
              loading="lazy"
              className="h-20 w-28 shrink-0 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1 py-0.5">
              <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{it.title}</h2>
              <p className="pt-1 text-[11px] text-muted-foreground">{it.publishedAt}</p>
              <div className="flex items-center gap-3 pt-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.7} />
                  {formatCount(it.views)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" strokeWidth={1.7} />
                  {formatCount(it.likes)}
                </span>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </main>
  );
}
