// @ts-nocheck
// Indian languages — superset of Amazon.in's locale picker.
// Native names so users always recognise their language.
export const LOCALES = [
  { code: "en", native: "English",   english: "English" },
  { code: "hi", native: "हिन्दी",     english: "Hindi" },
  { code: "ta", native: "தமிழ்",     english: "Tamil" },
  { code: "te", native: "తెలుగు",     english: "Telugu" },
  { code: "kn", native: "ಕನ್ನಡ",     english: "Kannada" },
  { code: "ml", native: "മലയാളം",   english: "Malayalam" },
  { code: "bn", native: "বাংলা",      english: "Bengali" },
  { code: "mr", native: "मराठी",      english: "Marathi" },
  { code: "gu", native: "ગુજરાતી",   english: "Gujarati" },
  { code: "pa", native: "ਪੰਜਾਬੀ",     english: "Punjabi" },
  { code: "ur", native: "اردو",       english: "Urdu" },
  { code: "or", native: "ଓଡ଼ିଆ",     english: "Odia" },
  { code: "as", native: "অসমীয়া",    english: "Assamese" },
  { code: "bho",      native: "भोजपुरी",      english: "Bhojpuri" },
  { code: "doi",      native: "डोगरी",         english: "Dogri" },
  { code: "gom",      native: "कोंकणी",        english: "Konkani" },
  { code: "mai",      native: "मैथिली",        english: "Maithili" },
  { code: "mni-Mtei", native: "ꯃꯩꯇꯩꯂꯣꯟ",     english: "Meiteilon (Manipuri)" },
  { code: "lus",      native: "Mizo ṭawng",    english: "Mizo" },
  { code: "sa",       native: "संस्कृतम्",      english: "Sanskrit" },
  { code: "sd",       native: "سنڌي",          english: "Sindhi" },
  { code: "ks",       native: "کٲشُر",          english: "Kashmiri" },
  { code: "ne",       native: "नेपाली",         english: "Nepali" },
  { code: "awa",      native: "अवधी",          english: "Awadhi" },
] as const;

export type LocaleCode = typeof LOCALES[number]["code"];
export const LOCALE_CODES = LOCALES.map(l => l.code) as LocaleCode[];
export const DEFAULT_LOCALE: LocaleCode = "en";

export function isLocale(x: string | null | undefined): x is LocaleCode {
  return !!x && (LOCALE_CODES as string[]).includes(x);
}

export function localeLabel(code: string): string {
  return LOCALES.find(l => l.code === code)?.native || code.toUpperCase();
}
