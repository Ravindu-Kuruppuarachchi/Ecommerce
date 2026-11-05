/** Public content accepts HTTP(S) URLs and local paths, never protocol-relative paths. */
export function isSafeContentUrl(value: string): boolean {
  if (value.length > 2048 || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
