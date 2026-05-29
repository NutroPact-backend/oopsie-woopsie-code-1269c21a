// @ts-nocheck
// Shared list of site pages used by features like Page Backgrounds and
// Category placement ("show this category link on which pages").
export const PAGE_OPTIONS: { key: string; label: string }[] = [
  { key: "global", label: "Global (every page)" },
  { key: "home", label: "Home (/)" },
  { key: "products", label: "Products listing (/products)" },
  { key: "p", label: "Product detail (/p/*)" },
  { key: "category", label: "Category pages (/category/*)" },
  { key: "cart", label: "Cart (/cart)" },
  { key: "checkout", label: "Checkout (/checkout)" },
  { key: "about", label: "About (/about)" },
  { key: "blog", label: "Blog (/blog & /blog/*)" },
  { key: "contact", label: "Contact (/contact)" },
  { key: "faq", label: "FAQ (/faq)" },
  { key: "testimonials", label: "Testimonials (/testimonials)" },
  { key: "search", label: "Search (/search)" },
  { key: "account", label: "Account (/account/*)" },
  { key: "login", label: "Login (/login)" },
  { key: "track-order", label: "Track Order (/track-order)" },
  { key: "shipping", label: "Shipping policy (/shipping)" },
  { key: "privacy", label: "Privacy (/privacy)" },
  { key: "terms", label: "Terms (/terms)" },
  { key: "refund", label: "Refund (/refund)" },
  { key: "combo", label: "Combo builder (/combo)" },
];
