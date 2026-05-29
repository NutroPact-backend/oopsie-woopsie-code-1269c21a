// Maps each admin tab id → the permission code required to view it.
// Used to filter the sidebar nav. Tabs without a mapping are visible to any admin.
//
// HOW TO ADD A NEW TAB:
//   1. Add it here with the permission code it should require.
//   2. Add metadata for it in TAB_PERMISSION_META below (category + label).
//   3. That's it — on next super-admin visit, sync_tab_permissions() will
//      auto-create the permission row in the catalog and grant it to admins.

export const TAB_PERMISSIONS: Record<string, string> = {
  dashboard: "dashboard.view",
  analytics: "analytics.view",
  products: "products.view",
  productauth: "productauth.view",
  categories: "products.view",
  brands: "products.view",
  flavors: "products.view",
  sizes: "products.view",
  bulkimport: "products.bulk_import",
  inventory: "inventory.view",
  accounting: "accounting.view",
  dimensions: "products.view",
  orders: "orders.view",
  abandoned: "abandoned.view",
  coupons: "coupons.edit",
  offers: "offers.edit",
  payments: "payments.edit",
  wallet: "wallet.view",
  users: "users.view",
  customer360: "users.view",
  reviewmod: "reviewmod.edit",
  reviews: "reviews.edit",
  contact: "contact.view",
  faq: "faq.edit",
  blog: "blog.edit",
  about: "about.edit",
  pages: "pages.edit",
  sitemap: "sitemap.view",
  homepage: "homepage.edit",
  navigation: "navigation.edit",
  footer: "footer.edit",
  popups: "popups.edit",
  shipping: "shipping.edit",
  automation: "automation.view",
  reconciliation: "reconciliation.view",
  returns: "returns.edit",
  ordermodify: "ordermodify.edit",
  subscriptions: "subscriptions.edit",
  campaigns: "campaigns.edit",
  giftcards: "giftcards.edit",
  loyalty: "loyalty.edit",
  referrals: "referrals.view",
  wholesale: "wholesale.edit",
  productqa: "productqa.edit",
  site: "site.edit",
  marketing: "marketing.edit",
  seocommand: "seocommand.edit",
  settings: "settings.edit",
  ai: "ai.edit",
  chatbot: "chatbot.view",
  notifications: "notifications.view",
  communications: "communications.view",
  messaging: "messaging.edit",
  mailsystem: "mailsystem.edit",
  security: "security.view",
  health: "health.view",
  auditlog: "auditlog.view",
  support: "support.view",
  seodebug: "seodebug.view",
  roas: "roas.view",
  bulkorders: "orders.bulk_ops",
  experiments: "experiments.edit",
  backup: "backup.export",
  superadmin: "super_admin.manage",
  backgrounds: "backgrounds.view",
  whatsapp_channels: "whatsapp_channels.view",
  urgency: "urgency.view",
  quick_checkout: "quick_checkout.view",
  variants_pro: "products.variants_pro.edit",
  verification: "verification.view",
  growth_boosters: "growth_boosters.view",
};

// Catalog metadata used by sync_tab_permissions() to auto-register any
// permission code referenced by a tab but not yet in the DB catalog.
// Only fields needed when AUTO-creating a brand new permission.
export const TAB_PERMISSION_META: Array<{
  code: string;
  category: string;
  label: string;
  description?: string;
  sort_order?: number;
}> = Object.entries(TAB_PERMISSIONS).map(([tabId, code]) => ({
  code,
  category: guessCategory(code),
  label: humanize(tabId),
}));

function guessCategory(code: string): string {
  const prefix = code.split(".")[0];
  const map: Record<string, string> = {
    dashboard: "Overview", analytics: "Overview", roas: "Overview",
    products: "Catalog", productauth: "Catalog", categories: "Catalog",
    brands: "Catalog", flavors: "Catalog", sizes: "Catalog",
    dimensions: "Catalog", inventory: "Catalog", accounting: "Catalog",
    orders: "Sales", abandoned: "Sales", coupons: "Sales", offers: "Sales",
    payments: "Sales", wallet: "Sales", giftcards: "Sales",
    subscriptions: "Sales", ordermodify: "Sales",
    shipping: "Logistics", automation: "Logistics",
    reconciliation: "Logistics", returns: "Logistics", campaigns: "Logistics",
    popups: "Storefront", homepage: "Storefront", navigation: "Storefront",
    footer: "Storefront", backgrounds: "Storefront",
    blog: "Content", about: "Content", pages: "Content", sitemap: "Content",
    users: "Customers", reviewmod: "Customers", reviews: "Customers",
    contact: "Customers", faq: "Customers", productqa: "Customers",
    support: "Customers", chatbot: "Customers", referrals: "Customers",
    loyalty: "Customers", wholesale: "Customers",
    whatsapp_channels: "Conversion Boosters", urgency: "Conversion Boosters",
    quick_checkout: "Conversion Boosters", growth_boosters: "Conversion Boosters",
    verification: "Conversion Boosters", experiments: "Conversion Boosters",
    feature_flags: "Conversion Boosters",
    site: "System", settings: "System", ai: "System",
    notifications: "System", communications: "System", messaging: "System",
    mailsystem: "System", marketing: "System", seocommand: "System",
    seodebug: "System",
    security: "Security", health: "Security", auditlog: "Security",
    backup: "Security", super_admin: "Security",
  };
  return map[prefix] ?? "Auto";
}

function humanize(s: string): string {
  return s.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
