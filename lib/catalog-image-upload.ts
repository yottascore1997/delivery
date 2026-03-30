import { v2 as cloudinary } from "cloudinary";

export const CATALOG_IMAGE_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export const CATALOG_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Required in .env for any catalog / store image upload:
 * CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Optional: CLOUDINARY_UPLOAD_FOLDER (default dlf-delivery/catalog)
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function withStaleClockHint(msg: string): string {
  const m = msg.toLowerCase();
  if (!m.includes("stale request") && !m.includes("more than 1 hour")) return msg;
  return `${msg} — Fix: sync system clock to real UTC (Windows: Settings → Time & language → turn on “Set time automatically” → Sync now). Cloudinary signs requests with your machine time; if it is ~1h+ wrong, uploads fail.`;
}

/** Cloudinary often throws plain `{ message, http_code }` — avoid `String(e)` → "[object Object]" */
export function formatUploadFailureMessage(e: unknown): string {
  let out: string;
  if (typeof e === "string" && e.trim()) out = e.trim();
  else if (e instanceof Error && e.message?.trim()) out = e.message.trim();
  else if (!e || typeof e !== "object") out = "Upload failed";
  else {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) {
      out = o.message.trim();
    } else {
      const nested = o.error;
      if (typeof nested === "string" && nested.trim()) {
        out = nested.trim();
      } else if (nested && typeof nested === "object") {
        const ne = nested as Record<string, unknown>;
        if (typeof ne.message === "string" && ne.message.trim()) {
          out = ne.message.trim();
        } else {
          out = "";
        }
      } else {
        out = "";
      }
      if (!out) {
        try {
          const s = JSON.stringify(o);
          out =
            s && s !== "{}"
              ? s.length > 280
                ? `${s.slice(0, 277)}…`
                : s
              : "Cloudinary / upload error (see server logs)";
        } catch {
          out = "Cloudinary / upload error (see server logs)";
        }
      }
    }
  }
  return withStaleClockHint(out);
}

function mimeFromFilename(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

/** When browser sends empty/wrong MIME, still accept real JPEG/PNG/WEBP bytes */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Next.js / Node FormData entries are Blob-like; `instanceof File` often fails on the server
 * even for real uploads → spurious 400 "file is required".
 */
export async function validateCatalogImageFile(
  file: unknown,
): Promise<
  | { ok: true; buffer: Buffer; mime: string; size: number }
  | { ok: false; error: string }
> {
  if (file == null || typeof file !== "object") {
    return { ok: false, error: "file is required" };
  }
  const blobLike = file as Blob;
  if (typeof blobLike.arrayBuffer !== "function" || typeof blobLike.size !== "number") {
    return { ok: false, error: "file is required" };
  }
  if (blobLike.size <= 0) {
    return { ok: false, error: "Empty file" };
  }
  if (blobLike.size > CATALOG_IMAGE_MAX_SIZE) {
    return { ok: false, error: "Max file size is 5MB" };
  }

  const named = file as File;
  let bytes: ArrayBuffer;
  try {
    bytes = await blobLike.arrayBuffer();
  } catch {
    return { ok: false, error: "Could not read file bytes" };
  }
  const buffer = Buffer.from(bytes);

  let mime = (typeof named.type === "string" ? named.type : "").trim();
  if (!mime && typeof named.name === "string") {
    mime = mimeFromFilename(named.name);
  }
  if (!mime || !CATALOG_IMAGE_ALLOWED_TYPES.has(mime)) {
    const sniffed = sniffImageMime(buffer);
    if (sniffed && CATALOG_IMAGE_ALLOWED_TYPES.has(sniffed)) {
      mime = sniffed;
    } else {
      return {
        ok: false,
        error: `Only JPG, PNG, WEBP. type="${named.type || ""}" file="${named.name || "?"}" — bytes do not look like a supported image`,
      };
    }
  }

  return {
    ok: true,
    buffer,
    mime,
    size: blobLike.size,
  };
}

/** Uploads only to Cloudinary (HTTPS URL). Local disk is not used. */
export async function saveCatalogImage(
  buffer: Buffer,
  mimeType: string,
  options?: { folder?: string },
): Promise<{ imageUrl: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary required: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env (no spaces before names). Restart dev server after saving.",
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const folder =
    options?.folder?.trim() ||
    process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() ||
    "dlf-delivery/catalog";
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  let result: { secure_url?: string };
  try {
    result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "image",
      unique_filename: true,
      overwrite: false,
    });
  } catch (e: unknown) {
    const msg = formatUploadFailureMessage(e);
    throw new Error(
      msg.length > 180 ? "Cloudinary rejected upload (check API keys & account)" : msg,
    );
  }
  const url = result?.secure_url;
  if (!url) throw new Error("Cloudinary returned no URL");
  return { imageUrl: url };
}
