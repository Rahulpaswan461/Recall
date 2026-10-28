export const DAY = 86_400_000;
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(now: number, days: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.getTime();
}
export function age(addedAt: number, now = Date.now()): string {
  if (!addedAt) return "Saved date unknown";
  const days = Math.max(0, Math.floor((now - addedAt) / DAY));
  if (!days) return "Saved today";
  if (days === 1) return "Saved yesterday";
  if (days < 30) return `Saved ${days} days ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `Saved ${months} ${months === 1 ? "month" : "months"} ago`;
  }
  const years = Math.floor(days / 365);
  return `Saved ${years} ${years === 1 ? "year" : "years"} ago`;
}
