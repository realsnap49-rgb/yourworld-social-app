import { memo, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ImgHTMLAttributes<HTMLImageElement> & { wrapperClassName?: string };

/** Image with native lazy-loading + a skeleton placeholder to avoid layout shift. */
export const LazyImage = memo(function LazyImage({
  className,
  wrapperClassName,
  onLoad,
  ...props
}: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={cn("relative block overflow-hidden", wrapperClassName)}>
      {!loaded && (
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse bg-muted/40"
        />
      )}
      <img
        {...props}
        loading={props.loading ?? "lazy"}
        decoding={props.decoding ?? "async"}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </span>
  );
});
