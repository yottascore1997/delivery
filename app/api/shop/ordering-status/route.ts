import { jsonOk, emptyOptions } from "@/lib/api-response";
import { getDeliveryFeePerOrder } from "@/lib/settings";
import { FREE_DELIVERY_MIN_SUBTOTAL } from "@/lib/free-delivery";
import {
  getShopOrderEndHour,
  getShopOrderStartHour,
  getShopOrderingClosedMessage,
  isShopOrderingOpenNow,
} from "@/lib/shop-ordering-hours";

export async function OPTIONS() {
  return emptyOptions();
}

/** Public: whether customer shop orders are accepted right now (IST window). */
export async function GET() {
  const open = isShopOrderingOpenNow();
  const deliveryFeePerOrder = await getDeliveryFeePerOrder();
  return jsonOk({
    open,
    deliveryFeePerOrder,
    freeDeliveryMinSubtotal: FREE_DELIVERY_MIN_SUBTOTAL,
    timezone: "Asia/Kolkata",
    startHour: getShopOrderStartHour(),
    endHour: getShopOrderEndHour(),
    closedMessage: open ? null : getShopOrderingClosedMessage(),
  });
}
