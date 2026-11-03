/**
 * Generates a clean, URL-safe tenant slug from institution name or abbreviation
 * e.g. "IILM" -> "iilm"
 * "St. John's University" -> "st-johns-university"
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
