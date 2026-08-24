import { supabase } from "@/integrations/supabase/client";

export type ProgressFn = (percent: number) => void;

const SUPABASE_URL =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";
const SUPABASE_KEY =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ?? "";

/**
 * Uploads a blob to a storage bucket with real byte-level progress (XHR based,
 * because the Supabase JS client cannot report upload progress).
 * Returns a long-lived signed URL, or the raw path as a fallback.
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  blob: Blob,
  contentType: string,
  onProgress?: ProgressFn,
): Promise<{ url: string | null; error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { url: null, error: "You need to sign in to upload." };

  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const err = await new Promise<string | null>((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", SUPABASE_KEY);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("content-type", contentType);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
        }
      };
      xhr.onload = () =>
        resolve(
          xhr.status >= 200 && xhr.status < 300
            ? null
            : `Upload failed (${xhr.status})`,
        );
      xhr.onerror = () => resolve("Network error while uploading");
      xhr.onabort = () => resolve("Upload cancelled");
      xhr.send(blob);
    } catch (e) {
      resolve(e instanceof Error ? e.message : "Upload failed");
    }
  });

  if (err) return { url: null, error: err };

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  onProgress?.(100);
  return { url: signed?.signedUrl ?? path, error: null };
}
