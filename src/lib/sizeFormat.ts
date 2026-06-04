// @ts-nocheck
// Auto kg/g → lbs converter for size labels.
// Skips volume units (ml, l, liter, litre) and non-weight strings (caps, pcs, etc.).

const GRAMS_PER_LB = 453.59237;

/** Parse weight in grams from a size label like "1 kg", "500 g", "2.5kg". Returns null if not a weight. */
export function parseWeightGrams(name: string | null | undefined): number | null {
  if (!name) return null;
  const s = String(name).toLowerCase().trim();
  // Skip volume units explicitly
  if (/\b(ml|l|lt|ltr|liter|litre|liters|litres)\b/i.test(s)) return null;
  // Match: number + optional space + unit (kg | g | gm | gms | gram | grams)
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(kgs?|kilograms?|kilos?|g|gm|gms|grams?)\b/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(num)) return null;
  const unit = m[2];
  if (/^(kg|kgs|kilo|kilos|kilogram|kilograms)$/.test(unit)) return num * 1000;
  return num; // grams
}

/** Format lbs nicely: "2.2 lbs" / "1.1 lb" — 2 decimals, trim trailing zero. */
export function gramsToLbsLabel(grams: number): string {
  const lbs = grams / GRAMS_PER_LB;
  const rounded = Math.round(lbs * 100) / 100;
  const txt = rounded.toFixed(2).replace(/\.?0+$/, '');
  return `${txt} ${rounded === 1 ? 'lb' : 'lbs'}`;
}

/** "1 kg" -> "1 kg (2.2 lbs)". Volume / non-weight strings returned unchanged. */
export function formatSizeDisplay(name: string | null | undefined): string {
  if (!name) return '';
  const grams = parseWeightGrams(name);
  if (grams == null || grams <= 0) return String(name);
  // Already contains lb/lbs? leave as-is to avoid double append.
  if (/\blbs?\b/i.test(name)) return String(name);
  return `${name} (${gramsToLbsLabel(grams)})`;
}
