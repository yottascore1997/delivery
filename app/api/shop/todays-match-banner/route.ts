import { getTodaysMatchBannerUrl } from "@/lib/settings";
import { emptyOptions, jsonOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return emptyOptions();
}

/** Public: current banner URL for shop home (set from admin). */
export async function GET() {
  const imageUrl = await getTodaysMatchBannerUrl();
  return jsonOk({ imageUrl });
}
