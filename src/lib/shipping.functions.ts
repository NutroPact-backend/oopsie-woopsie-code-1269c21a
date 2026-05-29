// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./users.functions";
import { rateLimit } from "./rate-limit";
import { getRequestIP } from "@tanstack/react-start/server";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CarrierId =
  | "shiprocket"
  | "delhivery"
  | "bluedart"
  | "shipmozo"
  | "ekart"
  | "amazon_shipping"
  | "indiapost"
  | "dtdc";

function hasCarrierCredentials(id: CarrierId, c: any): boolean {
  if (!c?.enabled) return false;
  if (id === "shiprocket") return !!(c.email && c.password);
  if (id === "delhivery") return !!(c.apiToken && c.clientName);
  if (id === "shipmozo") return !!(c.publicKey && c.privateKey);
  if (id === "bluedart") return !!(c.licenseKey && c.loginId && c.customerCode && c.areaCode);
  if (id === "dtdc") return !!(c.accessToken && c.customerCode);
  if (id === "ekart") return !!(c.merchantCode && c.apiKey);
  if (id === "amazon_shipping") return !!(c.sellerId && c.refreshToken && c.clientId && c.clientSecret);
  if (id === "indiapost") return !!(c.customerId && c.apiKey);
  return false;
}

type ShippingConfig = {
  defaultCarrier?: CarrierId;
  originPincode?: string;
  originAddress?: { name?: string; phone?: string; address?: string; city?: string; state?: string; pincode?: string };
  carriers?: Partial<Record<CarrierId, Record<string, any> & { enabled?: boolean }>>;
};

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
}

async function loadConfig(): Promise<ShippingConfig> {
  const supabase = getSupabase();
  const { data } = await supabase.from("site_settings").select("settings").eq("key", "default").maybeSingle();
  return ((data?.settings as any)?.shipping as ShippingConfig) ?? {};
}

// ─── Shiprocket ───────────────────────────────────────────────────────────────
async function shiprocketLogin(email: string, password: string) {
  const r = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Shiprocket auth ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.token as string;
}

async function shiprocketRates(c: any, origin: string, dest: string, weightKg: number, cod: boolean) {
  const token = await shiprocketLogin(c.email, c.password);
  const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${origin}&delivery_postcode=${dest}&weight=${weightKg}&cod=${cod ? 1 : 0}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Shiprocket rates ${r.status}`);
  const j = await r.json();
  return (j.data?.available_courier_companies ?? []).map((x: any) => ({
    carrier: "shiprocket" as const,
    courier: x.courier_name,
    rate: x.rate,
    etaDays: x.estimated_delivery_days,
    rating: x.rating,
  }));
}

async function shiprocketCreate(c: any, order: any, origin: any) {
  const token = await shiprocketLogin(c.email, c.password);
  const payload = {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().slice(0, 19).replace("T", " "),
    pickup_location: c.pickupLocation || "Primary",
    channel_id: c.channelId || undefined,
    billing_customer_name: order.customer_name || order.shipping_address?.name,
    billing_last_name: "",
    billing_address: order.shipping_address?.line1 || order.shipping_address?.address || "",
    billing_city: order.shipping_address?.city,
    billing_pincode: order.shipping_address?.pincode,
    billing_state: order.shipping_address?.state,
    billing_country: "India",
    billing_email: order.customer_email,
    billing_phone: order.customer_phone,
    shipping_is_billing: true,
    order_items: (order.items ?? []).map((it: any) => ({
      name: it.name, sku: it.sku || it.id, units: it.qty || it.quantity || 1, selling_price: it.price,
    })),
    payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
    sub_total: order.subtotal ?? order.total,
    length: 15, breadth: 15, height: 10, weight: 0.5,
  };
  const r = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Shiprocket create ${r.status}: ${JSON.stringify(j)}`);
  return { carrier: "shiprocket", awb: j.awb_code || "", shipmentId: j.shipment_id, raw: j };
}

// ─── Delhivery ────────────────────────────────────────────────────────────────
function delhiveryBase(c: any) {
  return c.mode === "staging" ? "https://staging-express.delhivery.com" : "https://track.delhivery.com";
}

async function delhiveryRates(c: any, origin: string, dest: string, weightKg: number, cod: boolean) {
  const url = `${delhiveryBase(c)}/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=${dest}&o_pin=${origin}&cgm=${Math.round(weightKg * 1000)}&pt=${cod ? "COD" : "Pre-paid"}`;
  const r = await fetch(url, { headers: { Authorization: `Token ${c.apiToken}` } });
  if (!r.ok) throw new Error(`Delhivery rates ${r.status}`);
  const j = await r.json();
  return (Array.isArray(j) ? j : []).map((x: any) => ({
    carrier: "delhivery" as const, courier: "Delhivery Surface", rate: x.total_amount, etaDays: null,
  }));
}

async function delhiveryCreate(c: any, order: any, origin: any) {
  const shipment = {
    name: order.shipping_address?.name || order.customer_name,
    add: order.shipping_address?.line1 || order.shipping_address?.address,
    pin: order.shipping_address?.pincode,
    city: order.shipping_address?.city,
    state: order.shipping_address?.state,
    country: "India",
    phone: order.customer_phone,
    order: order.order_number,
    payment_mode: order.payment_method === "cod" ? "COD" : "Prepaid",
    cod_amount: order.payment_method === "cod" ? String(order.total) : "0",
    total_amount: String(order.total),
    products_desc: (order.items ?? []).map((i: any) => i.name).join(", "),
    quantity: String((order.items ?? []).reduce((s: number, i: any) => s + (i.qty || 1), 0)),
    weight: "500",
  };
  const body = `format=json&data=${encodeURIComponent(JSON.stringify({
    shipments: [shipment],
    pickup_location: { name: c.clientName, add: origin?.address, city: origin?.city, pin_code: origin?.pincode, country: "India", phone: origin?.phone },
  }))}`;
  const r = await fetch(`${delhiveryBase(c)}/api/cmu/create.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Token ${c.apiToken}` },
    body,
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`Delhivery create: ${JSON.stringify(j)}`);
  const pkg = j.packages?.[0] || {};
  return { carrier: "delhivery", awb: pkg.waybill, shipmentId: pkg.waybill, raw: j };
}

// ─── Shipmozo ─────────────────────────────────────────────────────────────────
async function shipmozoRates(c: any, origin: string, dest: string, weightKg: number, cod: boolean) {
  const r = await fetch("https://shipping-api.com/app/api/v1/rate-calculator", {
    method: "POST",
    headers: { "Content-Type": "application/json", "public-key": c.publicKey, "private-key": c.privateKey },
    body: JSON.stringify({
      order_id: "",
      pickup_pincode: Number(origin),
      delivery_pincode: Number(dest),
      payment_type: cod ? "COD" : "PREPAID",
      shipment_type: "FORWARD",
      order_amount: 500,
      type_of_package: "SPS",
      rov_type: "ROV_OWNER",
      cod_amount: cod ? "500" : "",
      weight: Math.round(weightKg * 1000),
      dimensions: [{ no_of_box: "1", length: "22", width: "10", height: "10" }],
    }),
  });
  if (!r.ok) throw new Error(`Shipmozo rates ${r.status}`);
  const j = await r.json();
  if (String(j?.result) !== "1") throw new Error(j?.message || "Shipmozo rates failed");
  const list = Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.available_couriers) ? j.data.available_couriers : [];
  return list.map((x: any) => ({ carrier: "shipmozo" as const, courier: x.courier_name || x.name || x.courier, rate: x.total_charges ?? x.total_charge ?? x.rate, etaDays: x.estimated_delivery_days ?? x.edd ?? null }));
}

async function shipmozoCreate(c: any, order: any, _origin: any) {
  const addr = order.shipping_address || {};
  const itemsArr = (order.items ?? []).map((it: any) => ({
    product_name: it.name,
    sku_number: it.sku || it.id || "SKU",
    quantity: String(it.qty || it.quantity || 1),
    discount: "0",
    unit_price: String(it.price ?? 0),
    product_category: "General",
  }));
  const payload: any = {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().slice(0, 10),
    consignee_name: order.customer_name || addr.name,
    consignee_phone: order.customer_phone,
    consignee_email: order.customer_email || "",
    consignee_address_line_one: addr.line1 || addr.address || "",
    consignee_address_line_two: addr.line2 || "",
    consignee_pin_code: addr.pincode,
    consignee_city: addr.city,
    consignee_state: addr.state,
    consignee_country: "India",
    product_detail: itemsArr,
    payment_type: order.payment_method === "cod" ? "COD" : "PREPAID",
    cod_amount: order.payment_method === "cod" ? String(order.total) : "0",
    total_amount: String(order.total),
    tax_value: "0",
    discount: "0",
    weight: "500",
    length: "22",
    width: "10",
    height: "10",
    shipment_type: "FORWARD",
    warehouse_id: c.warehouseId || undefined,
  };
  const r = await fetch("https://shipping-api.com/app/api/v1/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json", "public-key": c.publicKey, "private-key": c.privateKey },
    body: JSON.stringify(payload),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || String(j?.result) !== "1") throw new Error(`Shipmozo create: ${j?.message || r.status}`);
  const d = j?.data || {};
  return { carrier: "shipmozo", awb: d.awb_number || d.awb || "", shipmentId: d.shipment_id || d.order_id || order.order_number, trackingUrl: d.tracking_url || "", raw: j };
}

// ─── Bluedart (REST API Gateway) ─────────────────────────────────────────────
function bluedartBase(c: any) {
  return c.mode === "staging" ? "https://apigateway-sandbox.bluedart.com" : "https://apigateway.bluedart.com";
}
async function bluedartToken(c: any): Promise<string> {
  const r = await fetch(`${bluedartBase(c)}/in/transportation/token/v1/login`, {
    method: "GET",
    headers: {
      ClientID: c.clientId || c.loginId,
      clientSecret: c.clientSecret || c.licenseKey,
    },
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j?.JWTToken) throw new Error(`Bluedart auth: ${j?.message || r.status}`);
  return j.JWTToken as string;
}
async function bluedartCreate(c: any, order: any, origin: any) {
  if (!c.licenseKey || !c.loginId || !c.customerCode || !c.areaCode) throw new Error("Bluedart credentials missing");
  const token = await bluedartToken(c);
  const addr = order.shipping_address || {};
  const payload = {
    Request: {
      Consignee: {
        ConsigneeName: order.customer_name || addr.name,
        ConsigneeAddress1: addr.line1 || addr.address || "",
        ConsigneeAddress2: addr.line2 || "",
        ConsigneePincode: addr.pincode,
        ConsigneeMobile: order.customer_phone,
        ConsigneeEmailID: order.customer_email || "",
      },
      Services: {
        ProductCode: order.payment_method === "cod" ? "D" : "A",
        ProductType: "Dutiables",
        SubProductCode: order.payment_method === "cod" ? "COD" : "P",
        PickupDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        PickupTime: "1500",
        PieceCount: "1",
        ActualWeight: "0.5",
        DeclaredValue: String(order.total),
        CollectableAmount: order.payment_method === "cod" ? String(order.total) : "0",
        CreditReferenceNo: order.order_number,
        OriginArea: c.areaCode,
        Commodity: { CommodityDetail1: (order.items ?? []).map((i: any) => i.name).join(", ").slice(0, 100) },
      },
      Shipper: {
        CustomerCode: c.customerCode,
        OriginArea: c.areaCode,
        CustomerName: origin?.name || c.customerCode,
        CustomerAddress1: origin?.address || "",
        CustomerPincode: origin?.pincode || "",
        CustomerMobile: origin?.phone || "",
      },
    },
    Profile: { LoginID: c.loginId, LicenceKey: c.licenseKey, Api_type: "S" },
  };
  const r = await fetch(`${bluedartBase(c)}/in/transportation/waybill/v1/GenerateWayBill`, {
    method: "POST",
    headers: { "Content-Type": "application/json", JWTToken: token },
    body: JSON.stringify(payload),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j?.IsError) throw new Error(`Bluedart: ${j?.Status?.[0]?.StatusInformation || JSON.stringify(j).slice(0, 200)}`);
  const awb = j?.AWBNo || j?.AWBPrintContent || "";
  return { carrier: "bluedart", awb, shipmentId: awb, trackingUrl: awb ? `https://www.bluedart.com/tracking?awb=${awb}` : "", raw: j };
}
async function bluedartTrack(c: any, awb: string): Promise<TrackResult> {
  const token = await bluedartToken(c);
  const r = await fetch(`${bluedartBase(c)}/in/transportation/tracking/v1/shipment?handler=tnt&loginid=${c.loginId}&awb=${awb}`, {
    headers: { JWTToken: token },
  });
  const j: any = await r.json().catch(() => ({}));
  const scans = j?.ShipmentData?.[0]?.Scans || [];
  const events = scans.map((s: any) => ({ ts: s?.ScanDate || s?.ScanDateTime || "", status: s?.Scan || s?.ScanCode || "", location: s?.ScannedLocation || "" }));
  const label = j?.ShipmentData?.[0]?.Status || events[events.length - 1]?.status || "";
  return { status: normalizeStatus(label), statusLabel: label, lastUpdate: scans[scans.length - 1]?.ScanDate, events };
}

// ─── DTDC (REST) ─────────────────────────────────────────────────────────────
async function dtdcCreate(c: any, order: any, origin: any) {
  if (!c.accessToken || !c.customerCode) throw new Error("DTDC credentials missing");
  const addr = order.shipping_address || {};
  const payload = {
    consignments: [{
      customer_code: c.customerCode,
      service_type_id: c.serviceTypeId || "B2C SMART EXPRESS",
      load_type: "NON-DOCUMENT",
      description: (order.items ?? []).map((i: any) => i.name).join(", ").slice(0, 100),
      dimension_unit: "cm", length: "22", width: "10", height: "10",
      weight_unit: "kg", weight: "0.5",
      declared_value: String(order.total),
      num_pieces: "1",
      origin_details: {
        name: origin?.name || c.customerCode, phone: origin?.phone || "",
        address_line_1: origin?.address || "", pincode: origin?.pincode || "",
        city: origin?.city || "", state: origin?.state || "",
      },
      destination_details: {
        name: order.customer_name || addr.name, phone: order.customer_phone,
        address_line_1: addr.line1 || addr.address || "", pincode: addr.pincode,
        city: addr.city, state: addr.state,
      },
      customer_reference_number: order.order_number,
      cod_collection_mode: order.payment_method === "cod" ? "cash" : undefined,
      cod_amount: order.payment_method === "cod" ? String(order.total) : "0",
      commodity_id: "99",
      reference_number: order.order_number,
    }],
  };
  const r = await fetch("https://apis.dtdc.in/api/customer/integration/consignment/softdata", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": c.accessToken },
    body: JSON.stringify(payload),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j?.status !== "OK") throw new Error(`DTDC: ${j?.message || JSON.stringify(j).slice(0, 200)}`);
  const item = j?.data?.[0] || {};
  const awb = item?.reference_number || item?.cn_number || "";
  return { carrier: "dtdc", awb, shipmentId: awb, trackingUrl: awb ? `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${awb}` : "", raw: j };
}
async function dtdcTrack(_c: any, awb: string): Promise<TrackResult> {
  const r = await fetch("https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/trackingDetails", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trkType: "cnno", strcnno: awb, addtnlDtl: "Y" }),
  });
  const j: any = await r.json().catch(() => ({}));
  const tracks = j?.trackHeader?.strTrackingStatus ? [j.trackHeader] : (j?.trackDetails || []);
  const events = tracks.map((t: any) => ({ ts: t?.strActionDate || "", status: t?.strAction || t?.strStatus || "", location: t?.strOrigin || t?.sOrigin || "" }));
  const label = j?.trackHeader?.strStatus || events[events.length - 1]?.status || "";
  return { status: normalizeStatus(label), statusLabel: label, events };
}

// ─── Ekart / Amazon Shipping / India Post (contract-only stubs) ──────────────
async function contractStub(name: string, c: any, required: string[]): Promise<never> {
  for (const k of required) if (!c?.[k]) throw new Error(`${name}: missing ${k}`);
  throw new Error(`${name}: contract-only integration — credentials saved. Use ${name} portal to book shipments and paste AWB manually in Admin → Orders.`);
}
async function ekartCreate(c: any, _o: any) { return contractStub("Ekart", c, ["merchantCode", "apiKey"]); }
async function amazonCreate(c: any, _o: any) { return contractStub("Amazon Shipping", c, ["sellerId", "refreshToken", "clientId", "clientSecret"]); }
async function indiapostCreate(c: any, _o: any) { return contractStub("India Post", c, ["customerId", "apiKey"]); }
async function contractStubTrack(name: string): Promise<TrackResult> {
  throw new Error(`${name}: tracking via portal only — update status manually in Admin → Orders`);
}



// ─── Tracking adapters ───────────────────────────────────────────────────────
export type TrackResult = { status: string; statusLabel: string; lastUpdate?: string; events: { ts: string; status: string; location?: string }[]; trackingUrl?: string };

function normalizeStatus(s: string): string {
  const x = (s || "").toLowerCase();
  if (/deliver/.test(x) && !/undeliver/.test(x)) return "delivered";
  if (/out.?for.?deliver|ofd/.test(x)) return "out_for_delivery";
  if (/transit|forward|picked/.test(x)) return "in_transit";
  if (/manifest|pickup|booked|created/.test(x)) return "shipped";
  if (/rto|return/.test(x)) return "rto";
  if (/cancel/.test(x)) return "cancelled";
  if (/fail|undeliver|exception|hold/.test(x)) return "exception";
  return x || "pending";
}

async function shiprocketTrack(c: any, awb: string): Promise<TrackResult> {
  const token = await shiprocketLogin(c.email, c.password);
  const r = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`, { headers: { Authorization: `Bearer ${token}` } });
  const j: any = await r.json().catch(() => ({}));
  const td = j?.tracking_data || {};
  const acts = td.shipment_track_activities || [];
  const events = acts.map((a: any) => ({ ts: a.date || a.activity_date || "", status: a.activity || a.status || "", location: a.location || "" }));
  const label = td.shipment_status || acts[0]?.activity || "";
  return { status: normalizeStatus(label), statusLabel: label, lastUpdate: acts[0]?.date, events, trackingUrl: td.track_url };
}

async function delhiveryTrack(c: any, awb: string): Promise<TrackResult> {
  const r = await fetch(`${delhiveryBase(c)}/api/v1/packages/json/?waybill=${awb}`, { headers: { Authorization: `Token ${c.apiToken}` } });
  const j: any = await r.json().catch(() => ({}));
  const ship = j?.ShipmentData?.[0]?.Shipment || {};
  const scans = ship?.Scans || [];
  const events = scans.map((s: any) => ({ ts: s?.ScanDetail?.ScanDateTime || "", status: s?.ScanDetail?.Scan || "", location: s?.ScanDetail?.ScannedLocation || "" }));
  const label = ship?.Status?.Status || events[events.length - 1]?.status || "";
  return { status: normalizeStatus(label), statusLabel: label, lastUpdate: ship?.Status?.StatusDateTime, events };
}

async function shipmozoTrack(c: any, awb: string): Promise<TrackResult> {
  const r = await fetch("https://shipping-api.com/app/api/v1/track-order", {
    method: "POST",
    headers: { "Content-Type": "application/json", "public-key": c.publicKey, "private-key": c.privateKey },
    body: JSON.stringify({ awb_number: awb }),
  });
  const j: any = await r.json().catch(() => ({}));
  const d = j?.data || {};
  const scans = d.scan_detail || d.tracking_history || [];
  const events = scans.map((s: any) => ({ ts: s.date || s.timestamp || "", status: s.status || s.activity || "", location: s.location || "" }));
  const label = d.current_status || d.status || events[0]?.status || "";
  return { status: normalizeStatus(label), statusLabel: label, lastUpdate: d.last_update, events, trackingUrl: d.tracking_url };
}

export async function trackByCarrier(carrier: CarrierId, c: any, awb: string): Promise<TrackResult> {
  if (carrier === "shiprocket") return shiprocketTrack(c, awb);
  if (carrier === "delhivery") return delhiveryTrack(c, awb);
  if (carrier === "shipmozo") return shipmozoTrack(c, awb);
  if (carrier === "bluedart") return bluedartTrack(c, awb);
  if (carrier === "dtdc") return dtdcTrack(c, awb);
  if (carrier === "ekart") return contractStubTrack("Ekart");
  if (carrier === "amazon_shipping") return contractStubTrack("Amazon Shipping");
  if (carrier === "indiapost") return contractStubTrack("India Post");
  throw new Error(`Tracking not implemented for ${carrier}`);
}


export async function loadShippingConfig() { return loadConfig(); }
export function getShippingSupabase() { return getSupabase(); }

// Compare rates across all enabled carriers; respect payment method & priority.
export async function pickBestCarrier(
  origin: string,
  dest: string,
  weightKg: number,
  paymentMethod: string,
  priority: boolean,
  cfg: ShippingConfig
): Promise<{ carrier: CarrierId; courier: string; rate: number; etaDays: number | null } | null> {
  const carriers = cfg.carriers ?? {};
  const isCod = paymentMethod === "cod" || paymentMethod === "partial_cod";
  const tasks: Promise<any[]>[] = [];
  if (hasCarrierCredentials("shiprocket", carriers.shiprocket))
    tasks.push(shiprocketRates(carriers.shiprocket, origin, dest, weightKg, isCod).then((r) => r.map((x: any) => ({ ...x, carrier: "shiprocket" }))).catch(() => []));
  if (hasCarrierCredentials("delhivery", carriers.delhivery))
    tasks.push(delhiveryRates(carriers.delhivery, origin, dest, weightKg, isCod).then((r) => r.map((x: any) => ({ ...x, carrier: "delhivery" }))).catch(() => []));
  if (hasCarrierCredentials("shipmozo", carriers.shipmozo))
    tasks.push(shipmozoRates(carriers.shipmozo, origin, dest, weightKg, isCod).then((r) => r.map((x: any) => ({ ...x, carrier: "shipmozo" }))).catch(() => []));

  const all = (await Promise.all(tasks)).flat().filter((x) => Number(x.rate) > 0);
  if (!all.length) return null;
  if (priority) {
    all.sort((a, b) => (Number(a.etaDays) || 99) - (Number(b.etaDays) || 99) || Number(a.rate) - Number(b.rate));
  } else {
    all.sort((a, b) => Number(a.rate) - Number(b.rate));
  }
  return all[0];
}

export async function createShipmentForOrder(order: any, cfg: ShippingConfig, carrierOverride?: CarrierId) {
  const chosen = carrierOverride || cfg.defaultCarrier;
  if (!chosen) throw new Error("No default carrier configured");
  const c: any = (cfg.carriers as any)?.[chosen];
  if (!c?.enabled) throw new Error(`Carrier ${chosen} not enabled`);
  switch (chosen) {
    case "shiprocket":      return shiprocketCreate(c, order, cfg.originAddress);
    case "delhivery":       return delhiveryCreate(c, order, cfg.originAddress);
    case "shipmozo":        return shipmozoCreate(c, order, cfg.originAddress);
    case "bluedart":        return bluedartCreate(c, order, cfg.originAddress);
    case "dtdc":            return dtdcCreate(c, order, cfg.originAddress);
    case "ekart":           return ekartCreate(c, order);
    case "amazon_shipping": return amazonCreate(c, order);
    case "indiapost":       return indiapostCreate(c, order);
    default: throw new Error(`Unknown carrier ${chosen}`);
  }
}




// ─── Server functions ─────────────────────────────────────────────────────────
const rateInput = z.object({
  destinationPincode: z.string().min(6).max(6),
  weightKg: z.number().min(0.01).max(100).default(0.5),
  cod: z.boolean().default(false),
});

export const getShippingRates = createServerFn({ method: "POST" })
  .inputValidator((d) => rateInput.parse(d))
  .handler(async ({ data }) => {
    // IP rate-limit to prevent quota exhaustion on carrier APIs
    try {
      const ip = getRequestIP({ xForwardedFor: true }) || "anon";
      const rl = await rateLimit("shipping_rates", ip, 20, 60);
      if (!rl.allowed) return { rates: [], error: "Too many requests" };
    } catch { /* best-effort */ }

    const cfg = await loadConfig();
    const origin = cfg.originPincode || cfg.originAddress?.pincode;
    if (!origin) return { rates: [], error: "Origin pincode not configured" };

    const carriers = cfg.carriers ?? {};
    const tasks: Promise<any[]>[] = [];
    if (hasCarrierCredentials("shiprocket", carriers.shiprocket)) tasks.push(shiprocketRates(carriers.shiprocket, origin, data.destinationPincode, data.weightKg, data.cod).catch(() => []));
    if (hasCarrierCredentials("delhivery", carriers.delhivery)) tasks.push(delhiveryRates(carriers.delhivery, origin, data.destinationPincode, data.weightKg, data.cod).catch(() => []));
    if (hasCarrierCredentials("shipmozo", carriers.shipmozo)) tasks.push(shipmozoRates(carriers.shipmozo, origin, data.destinationPincode, data.weightKg, data.cod).catch(() => []));

    const results = (await Promise.all(tasks)).flat();
    results.sort((a, b) => (Number(a.rate) || 9e9) - (Number(b.rate) || 9e9));
    return { rates: results, origin };
  });

const createShipmentInput = z.object({
  orderId: z.string().min(1),
  carrier: z.string().optional(),
});

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => createShipmentInput.parse(d))
  .handler(async ({ data }) => {
    const cfg = await loadConfig();
    const supabase = getSupabase();
    const { data: order, error } = await supabase.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (error || !order) return { ok: false, error: "Order not found" };

    const chosen = (data.carrier as CarrierId) || cfg.defaultCarrier;
    if (!chosen) return { ok: false, error: "No default carrier configured" };
    const carrierCfg = cfg.carriers?.[chosen];
    if (!carrierCfg?.enabled) return { ok: false, error: `Carrier ${chosen} not enabled` };

    try {
      let result: any;
      switch (chosen) {
        case "shiprocket":      result = await shiprocketCreate(carrierCfg, order, cfg.originAddress); break;
        case "delhivery":       result = await delhiveryCreate(carrierCfg, order, cfg.originAddress); break;
        case "shipmozo":        result = await shipmozoCreate(carrierCfg, order, cfg.originAddress); break;
        case "bluedart":        result = await bluedartCreate(carrierCfg, order, cfg.originAddress); break;
        case "dtdc":            result = await dtdcCreate(carrierCfg, order, cfg.originAddress); break;
        case "ekart":           result = await ekartCreate(carrierCfg, order); break;
        case "amazon_shipping": result = await amazonCreate(carrierCfg, order); break;
        case "indiapost":       result = await indiapostCreate(carrierCfg, order); break;
        default: return { ok: false, error: `${chosen} adapter pending — credentials stored.` };
      }

      const now = new Date().toISOString();
      await supabase.from("orders").update({
        notes: `${order.notes || ""}\n[${chosen}] AWB: ${result.awb}`.trim(),
        order_status: "shipped",
        updated_at: now,
      }).eq("id", data.orderId);
      // Upsert into order_tracking so the sync cron can poll updates
      await supabase.from("order_tracking").upsert({
        order_id: order.id,
        order_number: order.order_number,
        courier: chosen,
        awb_number: result.awb || "",
        tracking_url: result.trackingUrl || "",
        current_status: "shipped",
        status_history: [{ ts: now, status: "shipped", source: chosen }],
        updated_at: now,
        last_synced_at: now,
      }, { onConflict: "order_number" });
      return { ok: true, ...result };
    } catch (e: any) {
      return { ok: false, error: e.message || "Shipment failed" };
    }
  });


export const testCarrier = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ carrier: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const cfg = await loadConfig();
    const id = data.carrier as CarrierId;
    const c: any = cfg.carriers?.[id];
    if (!c) return { ok: false, error: "Not configured" };
    try {
      if (id === "shiprocket") {
        if (!c.email || !c.password) return { ok: false, error: "Email/password missing" };
        await shiprocketLogin(c.email, c.password); return { ok: true, message: "Shiprocket authenticated" };
      }
      if (id === "delhivery") {
        if (!c.apiToken || !c.clientName) return { ok: false, error: "API token / client name missing" };
        const r = await fetch(`${delhiveryBase(c)}/c/api/pin-codes/json/?filter_codes=110001`, { headers: { Authorization: `Token ${c.apiToken}` } });
        return r.ok ? { ok: true, message: "Delhivery token valid" } : { ok: false, error: `HTTP ${r.status}` };
      }
      if (id === "shipmozo") {
        if (!c.publicKey || !c.privateKey) return { ok: false, error: "Public/Private key missing" };
        const r = await fetch("https://shipping-api.com/app/api/v1/get-warehouses", {
          method: "GET",
          headers: { "public-key": c.publicKey, "private-key": c.privateKey },
        });
        const j: any = await r.json().catch(() => ({}));
        if (!r.ok) return { ok: false, error: `Shipmozo API HTTP ${r.status}` };
        if (String(j?.result) !== "1") return { ok: false, error: j?.message || "Invalid Shipmozo keys" };
        const count = Array.isArray(j?.data) ? j.data.length : 0;
        return { ok: true, message: `Shipmozo keys valid${count ? ` · ${count} warehouse found` : ''}` };
      }
      if (id === "bluedart") {
        if (!c.licenseKey || !c.loginId || !c.customerCode || !c.areaCode) return { ok: false, error: "License key / Login ID / customer code / area code missing" };
        return { ok: true, message: "Bluedart credentials saved (contract API — contact Bluedart to enable WaybillGeneration)" };
      }
      if (id === "dtdc") {
        if (!c.accessToken || !c.customerCode) return { ok: false, error: "Access token / customer code missing" };
        return { ok: true, message: "DTDC credentials saved (contract-only API)" };
      }
      if (id === "ekart") {
        if (!c.merchantCode || !c.apiKey) return { ok: false, error: "Merchant code / API key missing" };
        return { ok: true, message: "Ekart credentials saved (Flipkart Logistics contract API)" };
      }
      if (id === "amazon_shipping") {
        if (!c.sellerId || !c.refreshToken || !c.clientId || !c.clientSecret) return { ok: false, error: "Seller ID / SP-API tokens missing" };
        return { ok: true, message: "Amazon Shipping credentials saved (SP-API contract API)" };
      }
      if (id === "indiapost") {
        if (!c.customerId || !c.apiKey) return { ok: false, error: "Customer ID / API key missing" };
        return { ok: true, message: "India Post credentials saved (manual booking via portal)" };
      }
      return { ok: true, message: "Credentials saved (no test endpoint for this carrier)" };
    } catch (e: any) { return { ok: false, error: e.message }; }
  });
