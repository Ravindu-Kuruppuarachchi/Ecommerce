import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

// Only raster formats; SVG can carry script and is never accepted.
const SIGNATURES: Array<{ ext: string; test: (b: Buffer) => boolean }> = [
  { ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif", test: (b) => b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a" },
  { ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/** File extension for a supported image, judged by its bytes rather than the declared type. */
export function detectImageType(data: Buffer): string | null {
  return SIGNATURES.find((s) => s.test(data))?.ext ?? null;
}

/**
 * Saves to local disk and serves from the API at /uploads. Swap this for an
 * S3-compatible bucket (e.g. Cloudflare R2) before running more than one
 * API instance; callers only depend on saveImage returning a public URL.
 */
export async function saveImage(storeId: string, data: Buffer, ext: string): Promise<string> {
  const relative = path.posix.join(storeId, `${randomBytes(12).toString("hex")}.${ext}`);
  const target = path.join(env.uploadDir, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data, { flag: "wx" });
  return `${env.publicApiUrl}/uploads/${relative}`;
}
