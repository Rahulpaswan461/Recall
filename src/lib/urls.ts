export function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown website";
  }
}
export function canonicalUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  return u.href;
}
