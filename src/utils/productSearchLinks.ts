/** udm=28 is Google's product-search view — better fit for a bare barcode
 * number than the default web search. */
export function googleSearchUrl(barcode: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(barcode)}&udm=28`;
}

export function amazonSearchUrl(barcode: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(barcode)}`;
}
