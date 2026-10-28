export interface Bookmark {
  id: string;
  title: string;
  url: string;
  addedAt: number;
  folderIds: string[];
  folder: string;
}
export interface Folder {
  id: string;
  title: string;
  depth: number;
  parentIds: string[];
}
export type Status =
  "pending" | "opened" | "snoozed" | "dismissed" | "completed";
export interface Metadata {
  bookmarkId: string;
  addedAt: number;
  status: Status;
  lastSuggestedAt?: number;
  impressionCount: number;
  lastOpenedAt?: number;
  snoozedUntil?: number;
}
export interface Preferences {
  dailyCap: 1 | 2 | 3;
  excludedFolderIds: string[];
  compact: boolean;
  openedCooldownDays: number;
  onboarded: boolean;
}
export interface DayState {
  shownIds: string[];
  shownUrls: string[];
  activeId?: string;
  views: number;
  paused: boolean;
  collapsed: boolean;
}
export interface State {
  version: 1;
  preferences: Preferences;
  metadata: Record<string, Metadata>;
  days: Record<string, DayState>;
}
export type Action =
  | { type: "open" | "dismiss" | "restore"; id: string }
  | { type: "snooze"; id: string; days: 1 | 3 | 7 };
