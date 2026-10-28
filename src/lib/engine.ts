import type { Action, Bookmark, DayState, Metadata, State } from "../types";
import { addDays, DAY, dayKey } from "./dates";
import { canonicalUrl, safeUrl } from "./urls";
export const initialState = (): State => ({
  version: 1,
  preferences: {
    dailyCap: 1,
    excludedFolderIds: [],
    compact: true,
    openedCooldownDays: 30,
    onboarded: false,
  },
  metadata: {},
  days: {},
});
export const emptyDay = (): DayState => ({
  shownIds: [],
  shownUrls: [],
  views: 0,
  paused: false,
  collapsed: false,
});
export function getDay(state: State, now: number): DayState {
  return state.days[dayKey(now)] ?? emptyDay();
}
export function metaFor(bookmark: Bookmark): Metadata {
  return {
    bookmarkId: bookmark.id,
    addedAt: bookmark.addedAt,
    status: "pending",
    impressionCount: 0,
  };
}
export function reconcile(state: State, bookmarks: Bookmark[]): State {
  const next = structuredClone(state);
  next.metadata = {};
  for (const b of bookmarks)
    next.metadata[b.id] = {
      ...(state.metadata[b.id] ?? metaFor(b)),
      addedAt: b.addedAt,
    };
  return next;
}
export function included(b: Bookmark, state: State): boolean {
  return (
    !!safeUrl(b.url) &&
    !b.folderIds.some((id) => state.preferences.excludedFolderIds.includes(id))
  );
}
export function eligible(
  b: Bookmark,
  state: State,
  now: number,
  active = false,
): boolean {
  if (!included(b, state)) return false;
  const m = state.metadata[b.id] ?? metaFor(b);
  if (
    ["dismissed", "completed"].includes(m.status) ||
    (m.snoozedUntil ?? 0) > now
  )
    return false;
  if (
    m.status === "opened" &&
    m.lastOpenedAt !== undefined &&
    now - m.lastOpenedAt < state.preferences.openedCooldownDays * DAY
  )
    return false;
  // A due snooze is an explicit invitation; it bypasses the passive suggestion cooldown.
  if (
    !active &&
    m.status !== "snoozed" &&
    m.lastSuggestedAt !== undefined &&
    now - m.lastSuggestedAt < 7 * DAY
  )
    return false;
  return true;
}
export function score(b: Bookmark, state: State, now: number): number {
  const m = state.metadata[b.id] ?? metaFor(b);
  return (
    Math.min(3650, Math.max(0, (now - (b.addedAt || now)) / DAY)) -
    m.impressionCount * 30 -
    (m.lastOpenedAt ? 90 : 0)
  );
}
export function selectDaily(
  state: State,
  bookmarks: Bookmark[],
  now: number,
  visit = false,
): State {
  const next = structuredClone(state),
    key = dayKey(now),
    day = (next.days[key] ??= emptyDay());
  if (day.paused || !next.preferences.onboarded) return next;
  const active = bookmarks.find((b) => b.id === day.activeId);
  if (!active || !eligible(active, next, now, true)) day.activeId = undefined;
  if (!day.activeId && day.shownIds.length < next.preferences.dailyCap) {
    const pool = bookmarks.filter(
      (b) =>
        eligible(b, next, now) &&
        !day.shownIds.includes(b.id) &&
        !day.shownUrls.includes(canonicalUrl(b.url)),
    );
    pool.sort(
      (a, b) =>
        score(b, next, now) - score(a, next, now) || a.id.localeCompare(b.id),
    );
    const selected = pool[0];
    if (selected) {
      day.activeId = selected.id;
      day.shownIds.push(selected.id);
      day.shownUrls.push(canonicalUrl(selected.url));
      day.views = 0;
      day.collapsed = false;
    }
  }
  if (day.activeId && (visit || day.views === 0)) {
    day.views++;
    const b = bookmarks.find((b) => b.id === day.activeId)!;
    const m = (next.metadata[b.id] ??= metaFor(b));
    // Consume a due reminder once; subsequent days use the normal cooldown.
    if (m.status === "snoozed" && (m.snoozedUntil ?? 0) <= now) {
      m.status = "pending";
      m.snoozedUntil = undefined;
    }
    m.lastSuggestedAt = now;
    m.impressionCount++;
  }
  return next;
}
export function applyAction(state: State, action: Action, now: number): State {
  const next = structuredClone(state),
    m = next.metadata[action.id];
  if (!m) return next;
  if (action.type === "open") {
    if (m.status !== "dismissed" && m.status !== "completed")
      m.status = "opened";
    m.lastOpenedAt = now;
    m.snoozedUntil = undefined;
  }
  if (action.type === "dismiss") {
    m.status = "dismissed";
    m.snoozedUntil = undefined;
  }
  if (
    action.type === "snooze" &&
    !["dismissed", "completed"].includes(m.status)
  ) {
    m.status = "snoozed";
    m.snoozedUntil = addDays(now, action.days);
  }
  if (action.type === "restore") {
    m.status = "pending";
    m.snoozedUntil = undefined;
    m.lastSuggestedAt = undefined;
  }
  const day = next.days[dayKey(now)];
  if (day?.activeId === action.id) day.activeId = undefined;
  return next;
}
