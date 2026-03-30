"use client";

import { getToken } from "@/lib/client-api";

/** POST /api/store/upload-image — returns HTTPS URL from Cloudinary. */
export async function uploadStoreCatalogImage(
  file: File,
): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> {
  const token = getToken();
  if (!token) return { ok: false, error: "Not logged in" };
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/store/upload-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    imageUrl?: string;
    error?: string;
  };
  if (!res.ok) {
    return { ok: false, error: data.error || "Upload failed" };
  }
  if (!data.imageUrl?.trim()) {
    return { ok: false, error: "No image URL returned" };
  }
  return { ok: true, imageUrl: data.imageUrl.trim() };
}
