import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { emptyOptions, jsonOk } from "@/lib/api-response";
import { isCloudinaryConfigured } from "@/lib/catalog-image-upload";

export async function OPTIONS() {
  return emptyOptions();
}

/** Admin: whether Cloudinary env is set (required for uploads). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;
  return jsonOk({ cloudinary: isCloudinaryConfigured() });
}
