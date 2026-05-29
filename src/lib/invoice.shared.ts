// @ts-nocheck
// Pure helpers for GST invoice snapshot generation.
// Used by api.ts (ensureInvoice) and api/public/auto-invoice cron route.

export type ProductTaxInfo = { hsnCode: string; gstRate: number };

export type SellerInfo = {
  legalName: string;
  address: string;
  gstin: string;
  stateCode: string; // e.g. "27" for Maharashtra
  email: string;
  phone: string;
  invoicePrefix?: string;
  defaultHsn?: string;
  defaultGstRate?: number;
};

export type LineTax = {
  hsn: string;
  qty: number;
  unitPrice: number; // gross (tax-inclusive) per unit, as charged
  grossLine: number; // unitPrice * qty
  taxableValue: number; // ex-tax line value
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
};

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * GST split. Treats line price as INCLUSIVE of GST (standard for B2C MRP).
 * Same-state → CGST + SGST. Different state → IGST.
 */
export function computeLineTax(
  unitPrice: number,
  qty: number,
  gstRate: number,
  sameState: boolean,
): Omit<LineTax, "hsn"> {
  const gross = r2(unitPrice * qty);
  const taxable = r2(gross / (1 + gstRate / 100));
  const totalTax = r2(gross - taxable);
  const cgst = sameState ? r2(totalTax / 2) : 0;
  const sgst = sameState ? r2(totalTax - cgst) : 0;
  const igst = sameState ? 0 : totalTax;
  return {
    qty,
    unitPrice: r2(unitPrice),
    grossLine: gross,
    taxableValue: taxable,
    gstRate,
    cgst,
    sgst,
    igst,
    totalTax,
  };
}

export function buildInvoiceSnapshot(
  order: any,
  productMap: Map<string, ProductTaxInfo>,
  seller: SellerInfo,
) {
  // Buyer state code lives on shipping_address.stateCode (preferred) or is derived from state name.
  const addr = order.shipping_address || {};
  const buyerStateCode = String(addr.stateCode || addr.gstStateCode || "").trim();
  const sameState = !!seller.stateCode && !!buyerStateCode && seller.stateCode === buyerStateCode;
  const placeOfSupply = buyerStateCode || (addr.state || "");

  const lines: any[] = [];
  let sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumTax = 0;

  for (const it of (order.items || [])) {
    const pid = String(it.productId || it.id || "");
    const info = productMap.get(pid);
    const hsn = (info?.hsnCode || seller.defaultHsn || "").trim();
    const rate = Number(info?.gstRate ?? seller.defaultGstRate ?? 5);
    const tax = computeLineTax(Number(it.price) || 0, Number(it.quantity) || 0, rate, sameState);
    lines.push({
      name: it.name,
      flavor: it.flavor || "",
      size: it.size || "",
      hsn,
      ...tax,
    });
    sumTaxable += tax.taxableValue;
    sumCgst += tax.cgst;
    sumSgst += tax.sgst;
    sumIgst += tax.igst;
    sumTax += tax.totalTax;
  }

  // Shipping is treated tax-free in this simple model; can be enhanced later.
  const shipping = r2(Number(order.shipping_cost) || 0);
  const discount = r2(Number(order.discount) || 0);
  const grandTotal = r2(Number(order.total) || 0);

  return {
    items: lines,
    subtotal: r2(Number(order.subtotal) || 0),
    shipping,
    discount,
    total: grandTotal,
    paymentMethod: order.payment_method,
    address: addr,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    orderDate: order.created_at,
    // GST summary block
    gst: {
      sameState,
      placeOfSupply,
      taxableValue: r2(sumTaxable),
      cgst: r2(sumCgst),
      sgst: r2(sumSgst),
      igst: r2(sumIgst),
      totalTax: r2(sumTax),
    },
    seller,
  };
}
