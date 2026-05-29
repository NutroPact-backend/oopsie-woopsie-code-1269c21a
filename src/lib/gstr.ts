// @ts-nocheck
// GSTR aggregation helpers — pure, testable.
// Input: invoice rows (each with snapshot JSON containing items[] + gst block).
// Output: row arrays for GSTR-1 (B2C), GSTR-3B summary, and HSN summary.

type Snapshot = {
  items?: Array<{
    name?: string; hsn?: string;
    quantity?: number; unitPrice?: number;
    taxableValue?: number; cgst?: number; sgst?: number; igst?: number;
    rate?: number;
  }>;
  gst?: { sameState?: boolean; placeOfSupply?: string; taxableValue?: number; cgst?: number; sgst?: number; igst?: number };
};

export type InvoiceRow = {
  invoice_number: string;
  order_number: string;
  issued_at: string;
  snapshot: Snapshot;
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function rateFromLine(line: any): number {
  if (typeof line.rate === 'number') return line.rate;
  const taxable = Number(line.taxableValue) || 0;
  const tax = (Number(line.cgst) || 0) + (Number(line.sgst) || 0) + (Number(line.igst) || 0);
  if (taxable <= 0) return 0;
  return Math.round((tax / taxable) * 100);
}

// ── GSTR-1 B2C(S) Summary — by place-of-supply + rate ─────────────────────────
export function gstr1B2cSummary(invoices: InvoiceRow[]) {
  const map = new Map<string, { pos: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number; invoices: number }>();
  for (const inv of invoices) {
    const snap = inv.snapshot || {};
    const pos = snap.gst?.placeOfSupply || 'Unknown';
    for (const line of (snap.items || [])) {
      const rate = rateFromLine(line);
      const k = `${pos}|${rate}`;
      const ex = map.get(k) || { pos, rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, invoices: 0 };
      ex.taxable += Number(line.taxableValue) || 0;
      ex.cgst += Number(line.cgst) || 0;
      ex.sgst += Number(line.sgst) || 0;
      ex.igst += Number(line.igst) || 0;
      map.set(k, ex);
    }
  }
  // count distinct invoices per bucket
  const invCount = new Map<string, Set<string>>();
  for (const inv of invoices) {
    const snap = inv.snapshot || {};
    const pos = snap.gst?.placeOfSupply || 'Unknown';
    const rates = new Set((snap.items || []).map(rateFromLine));
    rates.forEach(rate => {
      const k = `${pos}|${rate}`;
      if (!invCount.has(k)) invCount.set(k, new Set());
      invCount.get(k)!.add(inv.invoice_number);
    });
  }
  return [...map.values()].map(r => ({
    place_of_supply: r.pos,
    rate: r.rate,
    taxable_value: r2(r.taxable),
    cgst: r2(r.cgst),
    sgst: r2(r.sgst),
    igst: r2(r.igst),
    invoice_count: invCount.get(`${r.pos}|${r.rate}`)?.size ?? 0,
  })).sort((a, b) => a.place_of_supply.localeCompare(b.place_of_supply) || a.rate - b.rate);
}

// ── GSTR-3B 3.1(a) Outward Taxable Supplies summary ───────────────────────────
export function gstr3bSummary(invoices: InvoiceRow[]) {
  let taxable = 0, cgst = 0, sgst = 0, igst = 0, totalInvoiced = 0;
  for (const inv of invoices) {
    const g = inv.snapshot?.gst;
    if (!g) continue;
    taxable += Number(g.taxableValue) || 0;
    cgst += Number(g.cgst) || 0;
    sgst += Number(g.sgst) || 0;
    igst += Number(g.igst) || 0;
    totalInvoiced += (Number(g.taxableValue) || 0) + (Number(g.cgst) || 0) + (Number(g.sgst) || 0) + (Number(g.igst) || 0);
  }
  return [
    { section: '3.1(a) Outward taxable supplies (other than zero rated)', taxable_value: r2(taxable), cgst: r2(cgst), sgst: r2(sgst), igst: r2(igst), cess: 0 },
    { section: '3.1(b) Outward taxable supplies (zero rated)',             taxable_value: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    { section: '3.1(c) Other outward supplies (Nil rated, exempted)',      taxable_value: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    { section: '3.1(d) Inward supplies (liable to reverse charge)',         taxable_value: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    { section: '3.1(e) Non-GST outward supplies',                           taxable_value: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    { section: 'TOTAL OUTWARD',                                              taxable_value: r2(taxable), cgst: r2(cgst), sgst: r2(sgst), igst: r2(igst), cess: 0 },
    { section: 'Total invoiced (incl tax)',                                  taxable_value: r2(totalInvoiced), cgst: 0, sgst: 0, igst: 0, cess: 0 },
  ];
}

// ── HSN-wise summary ──────────────────────────────────────────────────────────
export function hsnSummary(invoices: InvoiceRow[]) {
  const map = new Map<string, { hsn: string; rate: number; uqc: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const inv of invoices) {
    for (const line of (inv.snapshot?.items || [])) {
      const hsn = (line.hsn || '').trim() || '—';
      const rate = rateFromLine(line);
      const k = `${hsn}|${rate}`;
      const ex = map.get(k) || { hsn, rate, uqc: 'NOS', qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      ex.qty += Number(line.quantity) || 0;
      ex.taxable += Number(line.taxableValue) || 0;
      ex.cgst += Number(line.cgst) || 0;
      ex.sgst += Number(line.sgst) || 0;
      ex.igst += Number(line.igst) || 0;
      map.set(k, ex);
    }
  }
  return [...map.values()].map(r => ({
    hsn_code: r.hsn,
    description: '',
    uqc: r.uqc,
    total_quantity: r.qty,
    rate: r.rate,
    taxable_value: r2(r.taxable),
    cgst: r2(r.cgst),
    sgst: r2(r.sgst),
    igst: r2(r.igst),
    total_value: r2(r.taxable + r.cgst + r.sgst + r.igst),
  })).sort((a, b) => a.hsn_code.localeCompare(b.hsn_code) || a.rate - b.rate);
}
