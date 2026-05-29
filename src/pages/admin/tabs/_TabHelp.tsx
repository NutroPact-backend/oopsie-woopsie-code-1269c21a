// @ts-nocheck
import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

type Topic =
  | "shipping" | "mail" | "messaging" | "gst" | "wallet" | "coupons"
  | "offers" | "payments" | "secrets" | "notifications" | "returns"
  | "order-modify" | "subscriptions" | "campaigns" | "giftcards"
  | "inventory" | "blog" | "homepage" | "users" | "popups" | "ai"
  | "dimensions" | "globalReviews" | "navigation" | "pages" | "faq"
  | "footer" | "contact" | "about" | "sitemap" | "communications"
  | "analytics" | "chatbot" | "loyalty" | "productqa"
  // newly added topics
  | "brands" | "categories" | "flavors" | "sizes" | "products"
  | "reviews" | "abandonedCarts" | "auditLog" | "automation"
  | "backupExport" | "bulkImport" | "customAnalytics" | "dashboard"
  | "marketingSeo" | "orderBulkOps" | "placements" | "productAuth"
  | "reconciliation" | "referrals" | "roas" | "security" | "seoCommand"
  | "seoDebug" | "site" | "supportInbox" | "wholesale" | "adminHealth"
  | "accounting";

const DOCS: Record<Topic, { title: string; body: React.ReactNode }> = {
  shipping: {
    title: "Shipping Setup",
    body: (
      <>
        <p><b>What to do:</b> Add your Shipmozo (or any courier aggregator) API key and secret here. Once an order is paid, an auto-shipment is created within 10 minutes.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Provider:</b> shipmozo (default), can be changed later</li>
          <li><b>API Key / Secret:</b> Shipmozo dashboard → Settings → API</li>
          <li><b>Pickup Address:</b> Full warehouse address + pincode</li>
          <li><b>Default Weight (kg):</b> Used when a product has no weight set</li>
          <li><b>COD Enabled:</b> Whether you support Cash-on-Delivery</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">Auto-shipment cron runs every 10 min. Tracking sync runs every 30 min.</p>
      </>
    ),
  },
  mail: {
    title: "Email System",
    body: (
      <>
        <p><b>What to do:</b> Configure SMTP/Resend to send transactional emails (order placed, shipped, invoice).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>From Email + Name:</b> Sender identity (e.g. orders@nutropact.com)</li>
          <li><b>Provider:</b> Resend recommended (free 3000/mo). Get API key from the Resend dashboard</li>
          <li><b>Reply-to:</b> Where customer replies go (support email)</li>
          <li><b>Domain verify:</b> Add your domain in Resend and add the DNS records</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">Mail queue cron auto-dispatches every 5 min.</p>
      </>
    ),
  },
  messaging: {
    title: "SMS / WhatsApp",
    body: (
      <>
        <p><b>What to do:</b> Configure a provider to send order updates over SMS/WhatsApp.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>SMS:</b> MSG91 / Fast2SMS — need Sender ID + API key (DLT approved)</li>
          <li><b>WhatsApp:</b> Interakt / Wati / Gallabox — API key + approved template names</li>
          <li><b>Templates:</b> order_placed, payment_confirmed, shipped, out_for_delivery, delivered</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">If no provider is configured, messages stay in <code>pending_external</code> — no data loss.</p>
      </>
    ),
  },
  gst: {
    title: "GST & Invoicing",
    body: (
      <>
        <p><b>What to do:</b> Fill business details so invoices are tax-compliant.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Legal Name:</b> Name on your GST certificate</li>
          <li><b>GSTIN:</b> 15-digit GST number</li>
          <li><b>State Code:</b> 2-digit (e.g. 27=Maharashtra, 09=UP, 07=Delhi) — wrong code breaks CGST/SGST vs IGST split</li>
          <li><b>Invoice Prefix:</b> e.g. NUT/2026/ (default INV-)</li>
          <li><b>Default HSN + GST%:</b> Applied when not set at product level</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">Auto-invoice cron runs every 15 min for paid orders.</p>
      </>
    ),
  },
  wallet: {
    title: "NutroPay & Rewards",
    body: (
      <>
        <p><b>What to do:</b> Set the customer loyalty NutroPay rules.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Signup Bonus:</b> Credit on new user signup (fixed ₹)</li>
          <li><b>Order Cashback:</b> % or fixed, optional max cap</li>
          <li><b>Max Balance per User:</b> Abuse prevention</li>
          <li><b>Expiry Days:</b> How long credit stays valid (blank = never)</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">NutroPay expiry cron runs daily at 2 AM.</p>
      </>
    ),
  },
  coupons: {
    title: "Coupons",
    body: (
      <>
        <p><b>What to do:</b> Create discount codes (percent / flat amount).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Code:</b> Unique (e.g. WELCOME10)</li>
          <li><b>Type:</b> percent / fixed</li>
          <li><b>Min Order + Max Discount:</b> Set the limits</li>
          <li><b>Usage Limit:</b> Total / per-user</li>
          <li><b>Expiry:</b> Start + end date</li>
        </ul>
      </>
    ),
  },
  offers: {
    title: "Payment Offers",
    body: (
      <>
        <p><b>What to do:</b> Extra discount/reward for a specific payment method (e.g. 5% off on UPI, NutroPay credit on COD).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Trigger:</b> Payment method (UPI/Card/COD/Net Banking)</li>
          <li><b>Reward Type:</b> instant (deducted at checkout), NutroPay (credited after delivery), coupon (for next order)</li>
          <li><b>Min Order + Max Cap:</b> Required</li>
        </ul>
      </>
    ),
  },
  payments: {
    title: "Payment Gateways",
    body: (
      <>
        <p><b>What to do:</b> Add Razorpay / PayU / Cashfree keys.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Razorpay:</b> Key ID + Key Secret (dashboard → Settings → API Keys)</li>
          <li><b>Webhook URL:</b> Copy and add it in the Razorpay dashboard (for auto-confirming orders)</li>
          <li><b>Test mode:</b> Verify with test keys first</li>
        </ul>
      </>
    ),
  },
  secrets: {
    title: "App Secrets",
    body: (
      <>
        <p><b>What to do:</b> Third-party API keys used only by the backend (never exposed to the frontend).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Any key added here is stored encrypted</li>
          <li>Backend code reads it via <code>process.env.KEY_NAME</code></li>
          <li>Use UPPER_SNAKE_CASE for names (e.g. SHIPMOZO_API_KEY)</li>
        </ul>
      </>
    ),
  },
  notifications: {
    title: "In-app Notifications",
    body: (
      <p>Log of in-account notifications shown to users. Generated automatically from order events — nothing to do manually. Use this tab to monitor.</p>
    ),
  },
  returns: {
    title: "Returns & Refunds",
    body: (
      <>
        <p><b>What to do:</b> Return policy + refund rules.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Return Window:</b> Days after delivery (e.g. 7)</li>
          <li><b>Refund Mode:</b> NutroPay / Original payment / Both</li>
          <li><b>Reverse Pickup:</b> Auto-pickup via Shipmozo or manual</li>
          <li><b>Non-returnable:</b> Categories/products that cannot be returned</li>
        </ul>
      </>
    ),
  },
  "order-modify": {
    title: "Order Modification Links",
    body: (
      <>
        <p><b>What to do:</b> Before an order is dispatched, generate a one-time link so the customer can update address / phone / quantity, then send it over WhatsApp/Email.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Expiry:</b> Default 30 min (override via <code>modifyLinkExpiryMinutes</code> in Site Settings)</li>
          <li><b>Customer:</b> Opens the link, updates address, phone, items and submits</li>
          <li><b>Admin:</b> Review the request → Approve → Apply to sync directly onto the order</li>
          <li><b>Blocked:</b> Links cannot be created for shipped / delivered / cancelled orders</li>
        </ul>
      </>
    ),
  },
  subscriptions: {
    title: "Subscriptions (Subscribe & Save)",
    body: (
      <>
        <p><b>What it is:</b> Recurring orders — customer sets up once, an order is auto-created every interval with a discount.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Cron:</b> pg_cron hits <code>/api/public/hooks/subscriptions-run</code> hourly to create orders for due subscriptions</li>
          <li><b>Customer control:</b> /account/subscriptions to pause, skip or cancel</li>
          <li><b>Admin:</b> Run-now button for manual trigger, change status or update discount</li>
          <li><b>Payment:</b> COD or prepaid (prepaid stays pending until customer pays separately)</li>
        </ul>
      </>
    ),
  },
  campaigns: {
    title: "Segments & Bulk Campaigns",
    body: (
      <>
        <p><b>What it is:</b> Build customer audiences with filters, then blast email / WhatsApp / SMS / push to them.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Segment:</b> Filter by min orders, LTV, lapsed days, city, state, has subscription</li>
          <li><b>Preview:</b> Use "Preview audience" to see exact count + sample before sending</li>
          <li><b>Campaign:</b> Pick a segment, choose channel, write message — "Send now" or schedule</li>
          <li><b>Delivery:</b> Messages go to <code>notification_queue</code>; the existing dispatcher cron sends them</li>
          <li><b>Push:</b> Only delivered to users with a <code>push_subscriptions</code> entry (web push)</li>
        </ul>
      </>
    ),
  },
  giftcards: {
    title: "Gift Cards",
    body: (
      <>
        <p><b>What it is:</b> Issue code-based gift cards. When a customer redeems a code, the amount is credited to their NutroPay and can be used at checkout.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Issue:</b> Set amount + expiry. Code auto-generated (format <code>GC-XXXX-XXXX-XXXX</code>)</li>
          <li><b>Recipient email:</b> Optional — for tracking only, sharing is manual for now</li>
          <li><b>Redeem:</b> Customer enters the code at <code>/account/redeem</code>; NutroPay credit is instant</li>
          <li><b>Disable:</b> An active card can be disabled if fraud is suspected</li>
          <li><b>Single-use:</b> Each code is redeemed once (full amount at one shot)</li>
        </ul>
      </>
    ),
  },
  inventory: {
    title: "Inventory Alerts",
    body: (
      <>
        <p><b>Low Stock Threshold:</b> When stock reaches this number or below, admins get a notification. Out-of-stock products auto-hide (Add to Cart disabled).</p>
        <p className="text-xs text-muted-foreground mt-2">Stock auto-decrements when an order is placed.</p>
      </>
    ),
  },
  blog: { title: "Blog", body: <p>Publish articles for SEO. A featured image is required for og:image (social share).</p> },
  homepage: { title: "Homepage Sections", body: <p>Hero banner, featured products, testimonials, etc. Sections can be reordered via drag-and-drop.</p> },
  users: { title: "Users & Roles", body: <p>Assign admin/customer roles. Users with the admin role can access the admin panel.</p> },
  popups: { title: "Popups", body: <p>Popups for site visitors (newsletter, offer banner). Trigger by time delay / exit intent / scroll %.</p> },
  ai: { title: "AI Assistant", body: <p>Uses Lovable AI Gateway — no API key required. Models: Gemini / GPT-5 family.</p> },
  dimensions: { title: "Product Dimensions", body: <p>Default LxWxH (cm) + weight (g) used for shipping rate calculation.</p> },
  globalReviews: { title: "Global Reviews", body: <p>Site-wide testimonials (not product-specific). Shown on the homepage.</p> },
  navigation: { title: "Navigation Menu", body: <p>Header/footer menu items. Drag to reorder.</p> },
  pages: { title: "Custom Pages", body: <p>Static pages (Privacy, Terms, Shipping Policy). No spaces in URL slugs.</p> },
  faq: { title: "FAQ", body: <p>Question-answer pairs. Can be grouped by category.</p> },
  footer: { title: "Footer", body: <p>Footer links, social icons, copyright text, payment method badges.</p> },
  contact: { title: "Contact Info", body: <p>Email, phone, address — shown in the footer of every page.</p> },
  about: { title: "About Page", body: <p>Brand story, team, mission. Rich text + images.</p> },
  sitemap: { title: "Sitemap", body: <p>Auto-generated sitemap.xml for SEO. This is preview only.</p> },
  communications: { title: "Communications", body: <p>Master view of customer-facing message templates.</p> },
  analytics: {
    title: "Order Analytics",
    body: (
      <>
        <p><b>What it is:</b> Live order data — revenue, AOV, top products, status breakdown — for the last 7/30/90/365 days.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Revenue:</b> Only paid orders (online paid + COD) are counted</li>
          <li><b>AOV:</b> Average order value = total revenue / order count</li>
          <li><b>Top products:</b> Ranked by revenue; units sold also shown</li>
          <li><b>Cancellation rate:</b> Above 10% is a red flag — review refund/COD policy</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">Data is live — no cron, latest fetched on each visit. Max 1000 orders per range (Supabase default cap).</p>
      </>
    ),
  },
  chatbot: {
    title: "AI Chatbot Inbox",
    body: (
      <>
        <p><b>What it is:</b> Floating chat widget on the site (bottom-left). AI auto-replies. When the customer taps "Talk to human", the chat is handed off and you can reply from here.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Open:</b> Only AI is replying, no human action needed</li>
          <li><b>Handoff:</b> Customer asked for a human — reply here, AI will pause</li>
          <li><b>Closed:</b> Wrap-up done</li>
          <li><b>Realtime:</b> Customer and admin messages update live (Supabase Realtime)</li>
        </ul>
      </>
    ),
  },
  loyalty: {
    title: "Loyalty Tiers",
    body: (
      <>
        <p><b>What it is:</b> Bronze/Silver/Gold tier auto-assigned based on the customer's lifetime paid spend. Set discount %, free shipping and custom perks per tier.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Threshold:</b> Min lifetime spend (₹) — users above this move into the tier</li>
          <li><b>Discount %:</b> Auto-applied at checkout for logged-in users</li>
          <li><b>Free shipping:</b> Unlocked with the tier</li>
          <li><b>Perks:</b> Display-only list (shown on the member benefits page)</li>
          <li><b>Recompute:</b> "Recompute all" re-buckets every signed-up customer (paid + non-cancelled orders count)</li>
          <li><b>Customer page:</b> <code>/account/loyalty</code> — see tier, progress, perks</li>
        </ul>
      </>
    ),
  },
  productqa: {
    title: "Product Q&A",
    body: (
      <>
        <p><b>What it is:</b> Customers ask questions on the PDP, you moderate and answer here. Only <i>published</i> answers appear on the PDP.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Pending:</b> New questions appear here — write an answer and "Answer & publish"</li>
          <li><b>Hidden:</b> Hide spam/off-topic questions (safer than delete)</li>
          <li><b>Helpful counter:</b> Customers mark answers 👍 — top ones sort first</li>
          <li><b>PDP placement:</b> "Questions & Answers" section auto-rendered after Reviews</li>
          <li><b>Login required:</b> Only signed-in users can ask (to reduce spam)</li>
        </ul>
      </>
    ),
  },

  // ───── newly added ─────
  brands: { title: "Brands", body: <p>Manage brand catalogue. Each product can be tagged with a brand for filtering on the listing pages.</p> },
  categories: { title: "Categories", body: <p>Top-level and sub categories used in navigation, filters and SEO URLs (<code>/category/&lt;slug&gt;</code>). Slugs must be unique.</p> },
  flavors: { title: "Flavors", body: <p>Master list of flavor options used as product variants (e.g. Chocolate, Vanilla). Keep names short and consistent.</p> },
  sizes: { title: "Sizes", body: <p>Master list of size/weight options (e.g. 250g, 1kg). Used by variant pricing.</p> },
  products: { title: "Products", body: <p>Full product catalogue. Each product has variants, images, SEO meta and inventory. Out-of-stock items auto-hide Add-to-Cart.</p> },
  reviews: { title: "Reviews Moderation", body: <p>Customer reviews land here as <i>pending</i>. Approve, hide or delete. Only approved reviews show on the PDP and feed into the average rating.</p> },
  abandonedCarts: {
    title: "Abandoned Carts",
    body: (
      <>
        <p><b>What it is:</b> Carts where checkout was not completed. A recovery email / WhatsApp goes out after the configured wait time with a one-tap resume link.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Recovery cron:</b> <code>/api/public/hooks/recover-carts</code> runs hourly</li>
          <li><b>Bulk:</b> Select multiple carts to resend or mark recovered</li>
        </ul>
      </>
    ),
  },
  auditLog: { title: "Audit Log", body: <p>Immutable log of admin actions (who changed what and when). Use for security review and incident analysis. Cannot be edited.</p> },
  automation: {
    title: "Automation Controls",
    body: (
      <>
        <p><b>What it is:</b> Master switches for every cron-driven workflow (auto-shipment, auto-invoice, abandoned cart recovery, etc.).</p>
        <p className="text-xs text-muted-foreground mt-2">Turning a job off here stops the cron from acting until re-enabled. Useful during incidents.</p>
      </>
    ),
  },
  backupExport: { title: "Backup & Export", body: <p>One-click CSV/JSON export of orders, customers, products. Use for periodic offline backups and accountant handoff.</p> },
  bulkImport: { title: "Bulk Import", body: <p>Upload a CSV to create/update products in bulk. A sample template is provided — match column headers exactly.</p> },
  customAnalytics: { title: "Custom Analytics", body: <p>Build saved query cards (revenue by city, top discounted SKUs, etc.). Cards appear on the dashboard.</p> },
  dashboard: { title: "Dashboard", body: <p>Snapshot of today's revenue, orders, low-stock products and pending tasks. Tap a card to drill in.</p> },
  marketingSeo: { title: "Marketing & SEO", body: <p>Set per-route SEO meta (title, description, OG image). Robots and sitemap are auto-generated.</p> },
  orderBulkOps: {
    title: "Order Bulk Ops + Timeline",
    body: (
      <>
        <p>Filter and select multiple orders, then bulk-change status or export to CSV. Open any order to see its full event timeline (paid, confirmed, shipped, delivered).</p>
        <p className="text-xs text-muted-foreground mt-2">Bulk status changes are atomic and audit-logged.</p>
      </>
    ),
  },
  placements: { title: "Placements", body: <p>Decide where promotional widgets show (homepage, PDP, cart). Each placement can be A/B tested and scheduled.</p> },
  productAuth: {
    title: "Product Authentication (ProofPack)",
    body: (
      <>
        <p><b>What it is:</b> Anti-counterfeit system. Each unit gets a unique QR / scratch code; customers verify at <code>/verify/&lt;code&gt;</code>. NFC tags (NTAG 213/424 DNA) also supported.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Batches:</b> Generate codes in bulk per SKU and print them</li>
          <li><b>Heatmap:</b> Live geographic map of scans + suspicious clusters</li>
          <li><b>Phase 5 hub:</b> Guardians, marketplace hunt, distributor health, legal toolkit</li>
        </ul>
      </>
    ),
  },
  reconciliation: { title: "Reconciliation", body: <p>Match payment gateway settlements with orders to find missing payouts. Discrepancies show in red and can be exported.</p> },
  referrals: { title: "Referrals", body: <p>Each customer gets a unique referral code. Reward both referrer and referee on the first qualifying order. Tune reward amount and min order here.</p> },
  roas: { title: "ROAS Dashboard", body: <p>Per-channel return on ad spend (Meta, Google, organic). Requires <code>utm_source</code> tagging on incoming traffic.</p> },
  security: { title: "Security", body: <p>2FA enforcement for admins, login alerts, IP allow-list and active session management. Revoke any session here.</p> },
  seoCommand: { title: "SEO Command Center", body: <p>Keyword tracking, competitor backlinks, on-page AI suggestions, technical audit and Google Search Console data. Needs SEMRUSH_API_KEY and a Google service account.</p> },
  seoDebug: { title: "SEO Debug", body: <p>Inspect the exact meta tags, JSON-LD and Open Graph being served for any URL. Useful before sharing on social.</p> },
  site: { title: "Site Settings", body: <p>Global brand, logo, contact, default SEO and feature toggles. Changes here affect every page.</p> },
  supportInbox: { title: "Support Inbox", body: <p>Unified inbox for contact form, chatbot handoffs and email replies. Assign to a teammate and close when resolved.</p> },
  wholesale: { title: "Wholesale / B2B", body: <p>Approve wholesale accounts, set per-customer price lists and minimum order quantities. Hidden from regular shoppers.</p> },
  adminHealth: { title: "Admin Health", body: <p>System health: database latency, cron job status, queue depth, recent errors. Green = healthy, red = needs attention.</p> },
  accounting: { title: "Accounting / GSTR", body: <p>Auto-generated GSTR-1 / GSTR-3B summaries and B2B invoice exports for your CA. Filter by month and download CSV.</p> },
};

export function TabHelp({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false);
  const doc = DOCS[topic];
  if (!doc) return null;
  return (
    <div className="mb-4 border border-border rounded-lg bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Setup Guide: {doc.title}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border space-y-2 leading-relaxed">
          {doc.body}
        </div>
      )}
    </div>
  );
}
