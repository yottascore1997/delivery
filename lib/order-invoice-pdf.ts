import { PDFDocument, StandardFonts, type PDFFont, rgb } from "pdf-lib";
import type { Decimal } from "@prisma/client/runtime/library";
import { dec } from "@/lib/serialize";
import { getAppName } from "@/lib/app-brand";

export type InvoiceOrderInput = {
  id: string;
  createdAt: Date;
  totalAmount: Decimal | number;
  paymentType: string;
  deliveryAddress: string;
  status: string;
  user: { name: string; phone: string };
  items: {
    quantity: number;
    price: Decimal | number;
    product: { name: string; mrp: Decimal | number | null };
  }[];
};

function fmt2(n: number): string {
  return n.toFixed(2);
}

function fmtQty(n: number): string {
  return n.toFixed(3);
}

function fmtDiscPct(mrp: number, rate: number): string {
  if (mrp <= 0 || rate >= mrp) return "-";
  const p = ((mrp - rate) / mrp) * 100;
  return `${p.toFixed(1)}%`;
}

/**
 * Standard 14 PDF fonts only support WinAnsi; ₹, Hindi, smart quotes, etc. throw at runtime.
 */
function pdfSafeText(text: string): string {
  const normalized = text.normalize("NFKC").replace(/\r\n/g, "\n");
  let out = "";
  for (const ch of normalized) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp === 9 || cp === 10 || cp === 13) {
      out += " ";
      continue;
    }
    if (cp >= 32 && cp <= 126) {
      out += ch;
      continue;
    }
    out += "?";
  }
  return out.replace(/\s+/g, " ").trim() || "-";
}

function splitToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    if (font.widthOfTextAtSize(w, size) <= maxWidth) {
      line = w;
      continue;
    }
    let chunk = "";
    for (const ch of w) {
      const t2 = chunk + ch;
      if (font.widthOfTextAtSize(t2, size) <= maxWidth) chunk = t2;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/**
 * Narrow delivery / customer bill PDF. Branding is app name only (no store name).
 */
export async function generateOrderInvoicePdf(order: InvoiceOrderInput): Promise<Uint8Array> {
  const appName = getAppName();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 420;
  const margin = 36;
  const contentW = pageWidth - margin * 2;
  let page = pdfDoc.addPage([pageWidth, 1200]);
  let y = 1120;

  const draw = (text: string, opts: { size?: number; bold?: boolean; dy?: number } = {}) => {
    const size = opts.size ?? 9;
    const f = opts.bold ? fontBold : font;
    const dy = opts.dy ?? size + 3;
    if (y < 72) {
      page = pdfDoc.addPage([pageWidth, 1200]);
      y = 1120;
    }
    page.drawText(pdfSafeText(text), {
      x: margin,
      y,
      size,
      font: f,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= dy;
  };

  const drawLines = (text: string, size: number, maxW: number) => {
    for (const ln of splitToWidth(pdfSafeText(text), font, size, maxW)) {
      draw(ln, { size, dy: size + 2 });
    }
  };

  const lineH = (x1: number, x2: number) => {
    if (y < 80) {
      page = pdfDoc.addPage([pageWidth, 1200]);
      y = 1120;
    }
    page.drawLine({
      start: { x: x1, y: y + 8 },
      end: { x: x2, y: y + 8 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.78),
    });
    y -= 10;
  };

  draw(appName.toUpperCase(), { size: 14, bold: true, dy: 18 });
  draw("Order bill - Delivery copy", { size: 8, dy: 12 });
  lineH(margin, pageWidth - margin);

  draw(`Customer: ${order.user.name}`, { size: 9, dy: 11 });
  draw(`Mobile: ${order.user.phone}`, { size: 9, dy: 11 });
  drawLines(`Deliver to: ${order.deliveryAddress}`, 8, contentW);
  y -= 4;
  lineH(margin, pageWidth - margin);

  const billNo = order.id.length > 10 ? order.id.slice(-10) : order.id;
  const d = order.createdAt;
  const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  draw(`Bill: ${billNo}`, { size: 9, dy: 11 });
  draw(`Date: ${dateStr}`, { size: 9, dy: 11 });
  draw(`Status: ${order.status.replace(/_/g, " ")}`, { size: 9, dy: 11 });
  const payLabel = order.paymentType === "COD" ? "CASH (COD)" : order.paymentType;
  draw(`Payment: ${payLabel}`, { size: 10, bold: true, dy: 14 });
  lineH(margin, pageWidth - margin);

  // Table header
  const colPart = margin;
  const colMRP = margin + 168;
  const colRate = margin + 210;
  const colQty = margin + 252;
  const colDisc = margin + 288;
  const colAmt = margin + 330;

  const headerY = y;
  page.drawText("Particular", {
    x: colPart,
    y: headerY,
    size: 7,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });
  page.drawText("MRP", {
    x: colMRP,
    y: headerY,
    size: 7,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });
  page.drawText("Rate", {
    x: colRate,
    y: headerY,
    size: 7,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });
  page.drawText("Qty", {
    x: colQty,
    y: headerY,
    size: 7,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });
  page.drawText("Disc", {
    x: colDisc,
    y: headerY,
    size: 7,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });
  page.drawText("Amt", {
    x: colAmt,
    y: headerY,
    size: 7,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });
  y = headerY - 14;
  lineH(margin, pageWidth - margin);

  let grossMrp = 0;
  let lineNet = 0;
  let itemCount = 0;

  for (const it of order.items) {
    const qty = it.quantity;
    const rate = dec(it.price);
    const mrpRaw = it.product.mrp != null ? dec(it.product.mrp) : rate;
    const mrp = mrpRaw > 0 ? mrpRaw : rate;
    const amt = rate * qty;
    grossMrp += mrp * qty;
    lineNet += amt;
    itemCount += 1;

    const nameLines = splitToWidth(pdfSafeText(it.product.name), font, 8, colMRP - colPart - 4);
    for (let i = 0; i < nameLines.length; i++) {
      if (y < 72) {
        page = pdfDoc.addPage([pageWidth, 1200]);
        y = 1120;
      }
      page.drawText(pdfSafeText(nameLines[i] ?? ""), {
        x: colPart,
        y,
        size: 8,
        font,
        color: rgb(0.1, 0.1, 0.12),
      });
      if (i === nameLines.length - 1) {
        page.drawText(fmt2(mrp), {
          x: colMRP,
          y,
          size: 7,
          font,
          color: rgb(0.25, 0.25, 0.3),
        });
        page.drawText(fmt2(rate), {
          x: colRate,
          y,
          size: 7,
          font,
          color: rgb(0.25, 0.25, 0.3),
        });
        page.drawText(fmtQty(qty), {
          x: colQty,
          y,
          size: 7,
          font,
          color: rgb(0.25, 0.25, 0.3),
        });
        const dStr = fmtDiscPct(mrp, rate);
        page.drawText(dStr, {
          x: colDisc,
          y,
          size: 6,
          font,
          color: rgb(0.35, 0.35, 0.4),
        });
        page.drawText(fmt2(amt), {
          x: colAmt,
          y,
          size: 7,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.12),
        });
      }
      y -= 10;
    }
    y -= 4;
  }

  lineH(margin, pageWidth - margin);

  const total = dec(order.totalAmount);
  const deliveryFee = Math.max(0, Math.round((total - lineNet) * 100) / 100);
  if (deliveryFee > 0.001) {
    if (y < 100) {
      page = pdfDoc.addPage([pageWidth, 1200]);
      y = 1120;
    }
    page.drawText("Delivery / platform charges", {
      x: colPart,
      y,
      size: 8,
      font,
      color: rgb(0.2, 0.2, 0.25),
    });
    page.drawText(fmt2(deliveryFee), {
      x: colAmt,
      y,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= 14;
    lineH(margin, pageWidth - margin);
  }

  const savings = Math.max(0, Math.round((grossMrp - lineNet) * 100) / 100);

  const qtySum = order.items.reduce((n, it) => n + it.quantity, 0);
  draw(`Items: ${itemCount} · Total qty: ${qtySum}`, { size: 9, dy: 11 });
  draw(`Gross (on MRP): Rs.${fmt2(grossMrp)}`, { size: 9, dy: 11 });
  draw(`Discount on MRP: Rs.${fmt2(savings)}`, { size: 9, dy: 11 });
  draw(`Net amount: Rs.${fmt2(total)}`, { size: 11, bold: true, dy: 14 });

  y -= 6;
  lineH(margin, pageWidth - margin);
  drawLines(`Thank you for ordering on ${appName}.`, 8, contentW);

  return pdfDoc.save();
}
