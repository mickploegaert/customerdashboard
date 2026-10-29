/**
 * Returns the URL only if it is a plain http(s) link. Prevents links such as
 * "javascript:..." coming from external data from ever being rendered.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

/** Demo businesses use the reserved ".example" TLD, which never resolves. */
export function isDemoDomain(url: string | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(".example");
  } catch {
    return false;
  }
}
