import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";
import {
  formatUploadFailureMessage,
  saveCatalogImage,
  validateCatalogImageFile,
} from "@/lib/catalog-image-upload";

export const runtime = "nodejs";

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const form = await request.formData();
    const validated = await validateCatalogImageFile(form.get("file"));
    if (!validated.ok) return jsonError(validated.error);

    const { imageUrl } = await saveCatalogImage(validated.buffer, validated.mime);
    return jsonOk({
      ok: true,
      imageUrl,
      size: validated.size,
    });
  } catch (e) {
    const detail = formatUploadFailureMessage(e);
    return jsonError(detail.length > 220 ? detail.slice(0, 217) + "…" : detail);
  }
}
