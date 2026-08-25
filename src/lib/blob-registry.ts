/**
 * Keeps the original Blob behind an object URL alive so background uploads
 * still work after the creating screen unmounts (which revokes the URL).
 */
const registry = new Map<string, Blob>();

export function registerBlob(url: string, blob: Blob) {
  registry.set(url, blob);
}

export function getRegisteredBlob(url: string) {
  return registry.get(url) ?? null;
}

export function unregisterBlob(url: string) {
  registry.delete(url);
}
