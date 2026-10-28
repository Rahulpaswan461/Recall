import type { State } from "../types";
import { initialState } from "./engine";
import { isExtension } from "./bookmarks";
export const STORAGE_KEY = "recall.v1";
export function decode(value: unknown): State {
  if (value === undefined || value === null) return initialState();
  // Refuse corrupt data rather than silently losing feedback or privacy preferences.
  const s = value as State;
  const p = s.preferences;
  if (
    s.version !== 1 ||
    !p ||
    ![1, 2, 3].includes(p.dailyCap) ||
    ![7, 30, 90].includes(p.openedCooldownDays) ||
    !Array.isArray(p.excludedFolderIds) ||
    !p.excludedFolderIds.every((id) => typeof id === "string") ||
    typeof p.compact !== "boolean" ||
    typeof p.onboarded !== "boolean" ||
    !s.metadata ||
    !s.days
  )
    throw new Error(
      "Recall’s saved data could not be read. You can reset Recall in Settings; your Chrome bookmarks are safe.",
    );
  for (const m of Object.values(s.metadata))
    if (
      !m ||
      typeof m.bookmarkId !== "string" ||
      !Number.isFinite(m.addedAt) ||
      !Number.isFinite(m.impressionCount) ||
      !["pending", "opened", "snoozed", "dismissed", "completed"].includes(
        m.status,
      ) ||
      [m.lastSuggestedAt, m.lastOpenedAt, m.snoozedUntil].some(
        (t) => t !== undefined && !Number.isFinite(t),
      )
    )
      throw new Error(
        "Recall’s saved bookmark data is damaged. Reset Recall in Settings to recover.",
      );
  for (const d of Object.values(s.days))
    if (
      !d ||
      !Array.isArray(d.shownIds) ||
      !d.shownIds.every((id) => typeof id === "string") ||
      !Array.isArray(d.shownUrls) ||
      !d.shownUrls.every((url) => typeof url === "string") ||
      !Number.isFinite(d.views) ||
      typeof d.paused !== "boolean" ||
      typeof d.collapsed !== "boolean" ||
      (d.activeId !== undefined && typeof d.activeId !== "string")
    )
      throw new Error(
        "Recall’s saved daily data is damaged. Reset Recall in Settings to recover.",
      );
  return s;
}
export async function readState(): Promise<State> {
  const value = isExtension()
    ? (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]
    : JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  return decode(value);
}
async function writeState(state: State) {
  if (isExtension()) await chrome.storage.local.set({ [STORAGE_KEY]: state });
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
export async function transaction(
  update: (state: State) => State,
): Promise<State> {
  return navigator.locks.request("recall-state", async () => {
    const next = update(await readState());
    await writeState(next);
    return next;
  });
}
export async function resetState(): Promise<State> {
  return navigator.locks.request("recall-state", async () => {
    const next = initialState();
    await writeState(next);
    return next;
  });
}
export function watchState(callback: () => void) {
  if (isExtension()) {
    const changed = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === "local" && changes[STORAGE_KEY]) callback();
    };
    chrome.storage.onChanged.addListener(changed);
    return () => chrome.storage.onChanged.removeListener(changed);
  }
  const changed = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", changed);
  return () => window.removeEventListener("storage", changed);
}
