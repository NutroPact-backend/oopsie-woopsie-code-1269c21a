// @ts-nocheck
// Shared types + small client utilities for the analytics report system.
// No server-only imports — safe in browser bundles.

export type Granularity = 'day' | 'week' | 'month' | 'hour';
export type Metric =
  | 'revenue' | 'orders' | 'units' | 'aov' | 'customers'
  | 'discount' | 'cancelled' | 'delivered' | 'shipping' | 'refunds';
export type Dimension =
  | 'time' | 'product' | 'category' | 'coupon'
  | 'payment_method' | 'payment_status' | 'order_status'
  | 'state' | 'city' | 'hour_of_day' | 'day_of_week';
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'table' | 'heatmap';

export interface AnalyticsFilters {
  days?: number;           // last N days (preset)
  from?: string;           // ISO date (overrides days if set)
  to?: string;
  status?: string[];       // order_status filter
  paymentStatus?: string[];
  paymentMethod?: string[];
  category?: string[];
  search?: string;         // matches customer name/email/order #
}

export interface AnalyticsConfig {
  metrics: Metric[];       // KPI metrics shown
  primaryMetric: Metric;   // metric for the chart Y axis
  dimension: Dimension;    // X axis / grouping
  granularity?: Granularity;
  chart: ChartType;
  filters: AnalyticsFilters;
  compare?: boolean;       // compare vs previous period
  topN?: number;           // for dimension cuts (default 10)
}

export const DEFAULT_CONFIG: AnalyticsConfig = {
  metrics: ['revenue', 'orders', 'aov', 'customers'],
  primaryMetric: 'revenue',
  dimension: 'time',
  granularity: 'day',
  chart: 'line',
  filters: { days: 30 },
  compare: true,
  topN: 10,
};

export const METRIC_LABEL: Record<Metric, string> = {
  revenue: 'Revenue', orders: 'Orders', units: 'Units sold', aov: 'Avg Order Value',
  customers: 'Unique customers', discount: 'Discount given', cancelled: 'Cancelled orders',
  delivered: 'Delivered orders', shipping: 'Shipping collected', refunds: 'Refund estimate',
};
export const DIMENSION_LABEL: Record<Dimension, string> = {
  time: 'Time', product: 'Product', category: 'Category', coupon: 'Coupon code',
  payment_method: 'Payment method', payment_status: 'Payment status',
  order_status: 'Order status', state: 'State', city: 'City',
  hour_of_day: 'Hour of day', day_of_week: 'Day of week',
};

// ───────────── Client-side download helpers ─────────────

export function downloadBlob(data: string | Blob, filename: string, mime: string) {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(rows: any[], columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\r\n');
}

// Excel-friendly HTML table (.xls) — opens in Excel/Sheets without any lib
export function toXLS(title: string, rows: any[], columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const head = cols.map(c => `<th style="background:#f97316;color:#fff;padding:6px;border:1px solid #fff;text-align:left;font-family:Arial">${esc(c)}</th>`).join('');
  const body = rows.map((r, i) =>
    `<tr style="background:${i % 2 ? '#fff7ed' : '#fff'}">${cols.map(c => `<td style="padding:6px;border:1px solid #fed7aa;font-family:Arial">${esc(r[c])}</td>`).join('')}</tr>`,
  ).join('');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(title)}</title>
<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${esc(title).slice(0,30)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
</head><body><h2 style="font-family:Arial">${esc(title)}</h2>
<table cellspacing="0" cellpadding="0"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function fmtINR(n: number) {
  if (!isFinite(n)) return '₹0';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
export function fmtPct(n: number, digits = 1) {
  if (!isFinite(n)) return '0%';
  return n.toFixed(digits) + '%';
}
export function delta(curr: number, prev: number) {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}
