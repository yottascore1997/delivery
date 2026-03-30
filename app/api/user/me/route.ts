import { requireAuth } from "@/lib/auth";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** Current user profile (for client after login / refresh). */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const u = auth.user;
  return jsonOk({
    user: {
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      imageUrl: u.imageUrl ?? null,
    },
  });
}
