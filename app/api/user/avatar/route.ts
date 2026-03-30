import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

/** Customer (and other roles): upload profile photo → Cloudinary, save URL on User. */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [
    UserRole.CUSTOMER,
    UserRole.STORE_OWNER,
    UserRole.DELIVERY,
    UserRole.ADMIN,
  ]);
  if ("error" in auth) return auth.error;

  try {
    const form = await request.formData();
    const validated = await validateCatalogImageFile(form.get("file"));
    if (!validated.ok) return jsonError(validated.error);

    const { imageUrl } = await saveCatalogImage(validated.buffer, validated.mime, {
      folder: "dlf-delivery/avatars",
    });

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: { imageUrl },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        imageUrl: true,
      },
    });

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        imageUrl: user.imageUrl,
      },
    });
  } catch (e) {
    const detail = formatUploadFailureMessage(e);
    return jsonError(detail.length > 220 ? detail.slice(0, 217) + "…" : detail);
  }
}
