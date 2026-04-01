import jwt from "jsonwebtoken";
import { UserRole, type User } from "@prisma/client";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";

/** Consumer shop APIs (cart, checkout, `/shop` orders) — any logged-in role that should be able to buy. */
export const SHOP_BUYER_ROLES: UserRole[] = [
  UserRole.CUSTOMER,
  UserRole.STORE_OWNER,
  UserRole.DELIVERY,
  UserRole.ADMIN,
];

export type JwtPayload = { sub: string; role: UserRole };

export function signToken(user: Pick<User, "id" | "role">): string {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

export async function requireAuth(
  request: Request,
  allowedRoles?: UserRole[],
): Promise<{ user: User } | { error: Response }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  const payload = verifyToken(token);
  if (!payload?.sub) {
    return {
      error: new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  if (allowedRoles?.length && !allowedRoles.includes(payload.role)) {
    return {
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return {
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { user };
}
