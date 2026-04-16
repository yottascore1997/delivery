import type { PlatformSetting } from "@prisma/client";

export const LIST_REQUEST_PREFIX = "list_request_";

export const LIST_REQUEST_STATUSES = [
  "NEW",
  "IN_REVIEW",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
] as const;

export type ListRequestStatus = (typeof LIST_REQUEST_STATUSES)[number];

export type ListRequestRecord = {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  imageUrl: string;
  note: string;
  address: string;
  status: ListRequestStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

export function isListRequestStatus(v: string): v is ListRequestStatus {
  return (LIST_REQUEST_STATUSES as readonly string[]).includes(v);
}

export function listRequestKey(id: string): string {
  return `${LIST_REQUEST_PREFIX}${id}`;
}

export function newListRequestId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}_${rand}`;
}

export function parseListRequestSetting(s: PlatformSetting): ListRequestRecord | null {
  if (!s.key.startsWith(LIST_REQUEST_PREFIX)) return null;
  try {
    const raw = JSON.parse(s.value) as Partial<ListRequestRecord>;
    const id = s.key.slice(LIST_REQUEST_PREFIX.length);
    if (!id || !raw.userId || !raw.imageUrl) return null;
    const status = typeof raw.status === "string" && isListRequestStatus(raw.status) ? raw.status : "NEW";
    const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
    const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;
    return {
      id,
      userId: String(raw.userId),
      userName: String(raw.userName ?? ""),
      userPhone: String(raw.userPhone ?? ""),
      imageUrl: String(raw.imageUrl),
      note: String(raw.note ?? ""),
      address: String(raw.address ?? ""),
      status,
      adminNote: String(raw.adminNote ?? ""),
      createdAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}
