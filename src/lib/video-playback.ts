// ============= Global single-video playback coordinator =============
// Ensures only ONE feed video plays at a time. When a new video starts,
// the previously playing one is stopped (returned to its thumbnail).

type StopFn = () => void;

const stopHandlers = new Map<string, StopFn>();
let activeId: string | null = null;

/** Called by a card when it wants to play. Stops whoever is playing now. */
export function requestPlayback(id: string) {
  if (activeId && activeId !== id) {
    stopHandlers.get(activeId)?.();
  }
  activeId = id;
}

/** Called when a card stops on its own (scroll away, ended, unmount). */
export function releasePlayback(id: string) {
  if (activeId === id) activeId = null;
}

/** Register a stop callback for a card. Returns an unsubscribe fn. */
export function onStopRequested(id: string, stop: StopFn): () => void {
  stopHandlers.set(id, stop);
  return () => {
    stopHandlers.delete(id);
    if (activeId === id) activeId = null;
  };
}
