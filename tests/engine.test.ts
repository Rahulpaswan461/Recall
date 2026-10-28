import { describe, expect, it } from "vitest";
import {
  applyAction,
  eligible,
  getDay,
  initialState,
  reconcile,
  selectDaily,
} from "../src/lib/engine";
import { addDays, DAY, dayKey } from "../src/lib/dates";
import { safeUrl } from "../src/lib/urls";
import { flattenTree } from "../src/lib/bookmarks";
import { decode } from "../src/lib/storage";
import type { Bookmark, State } from "../src/types";
const now = new Date(2026, 9, 27, 12).getTime();
const b = (id: string, days = 100): Bookmark => ({
  id,
  title: `Bookmark ${id}`,
  url: `https://example.com/${id}`,
  addedAt: now - days * DAY,
  folderIds: ["1"],
  folder: "Bookmarks bar",
});
const library = [b("old", 200), b("new", 10), b("middle", 100)];
function setup(items = library): State {
  const s = initialState();
  s.preferences.onboarded = true;
  return reconcile(s, items);
}
describe("daily recommendations", () => {
  it("prioritizes the oldest untouched bookmark", () =>
    expect(getDay(selectDaily(setup(), library, now, true), now).activeId).toBe(
      "old",
    ));
  it("persists one selection and counts separate visits", () => {
    let s = selectDaily(setup(), library, now, true);
    s = selectDaily(s, library, now + 100, true);
    s = selectDaily(s, library, now + 200, true);
    expect(getDay(s, now)).toMatchObject({
      activeId: "old",
      shownIds: ["old"],
      views: 3,
    });
    expect(s.metadata.old.impressionCount).toBe(3);
  });
  it("reconciliation does not add impressions", () => {
    let s = selectDaily(setup(), library, now, true);
    s = selectDaily(s, library, now + 1);
    expect(s.metadata.old.impressionCount).toBe(1);
  });
  it("does not resurface another item after reaching default cap", () => {
    const s = selectDaily(
      applyAction(
        selectDaily(setup(), library, now, true),
        { type: "dismiss", id: "old" },
        now,
      ),
      library,
      now,
    );
    expect(getDay(s, now).activeId).toBeUndefined();
    expect(getDay(s, now).shownIds).toEqual(["old"]);
  });
  it("advances only after an action up to configured cap", () => {
    let s = setup();
    s.preferences.dailyCap = 2;
    s = selectDaily(s, library, now, true);
    s = selectDaily(
      applyAction(s, { type: "open", id: "old" }, now),
      library,
      now,
    );
    expect(getDay(s, now).activeId).toBe("middle");
    s = selectDaily(
      applyAction(s, { type: "dismiss", id: "middle" }, now),
      library,
      now,
    );
    expect(getDay(s, now).activeId).toBeUndefined();
    expect(getDay(s, now).shownIds).toHaveLength(2);
  });
  it("does not count or select before onboarding", () => {
    const s = selectDaily(initialState(), library, now, true);
    expect(getDay(s, now).shownIds).toEqual([]);
  });
  it("keeps daily limits if the clock rolls back", () => {
    let s = selectDaily(setup(), library, now, true);
    s = applyAction(s, { type: "dismiss", id: "old" }, now);
    s = selectDaily(s, library, now + DAY, true);
    s = selectDaily(s, library, now, true);
    expect(getDay(s, now).activeId).toBeUndefined();
    expect(getDay(s, now).shownIds).toEqual(["old"]);
  });
  it("new day permits a different candidate", () => {
    const s = selectDaily(
      selectDaily(setup(), library, now, true),
      library,
      now + DAY,
      true,
    );
    expect(getDay(s, now + DAY).activeId).toBe("middle");
  });
  it("does not replace stable selection for a new bookmark", () => {
    let s = selectDaily(setup(), library, now, true);
    const updated = [...library, b("ancient", 500)];
    s = selectDaily(reconcile(s, updated), updated, now + 10, true);
    expect(getDay(s, now).activeId).toBe("old");
  });
  it("pause blocks selection and impressions", () => {
    let s = selectDaily(setup(), library, now, true);
    s.days[dayKey(now)].paused = true;
    s = selectDaily(s, library, now + 1, true);
    expect(s.metadata.old.impressionCount).toBe(1);
    expect(
      getDay(selectDaily(s, library, now + DAY, true), now + DAY).paused,
    ).toBe(false);
  });
  it("deleted selections consume their daily slot and prune orphan metadata", () => {
    let s = selectDaily(setup(), library, now, true);
    const updated = library.slice(1);
    s = selectDaily(reconcile(s, updated), updated, now);
    expect(s.metadata.old).toBeUndefined();
    expect(getDay(s, now).activeId).toBeUndefined();
    expect(getDay(s, now).shownIds).toEqual(["old"]);
  });
  it("duplicate URLs cannot use two daily slots", () => {
    const items = [
      b("a", 100),
      { ...b("b", 100), url: "https://example.com/a#section" },
    ];
    let s = setup(items);
    s.preferences.dailyCap = 3;
    s = selectDaily(s, items, now, true);
    s = selectDaily(applyAction(s, { type: "open", id: "a" }, now), items, now);
    expect(getDay(s, now).activeId).toBeUndefined();
    expect(getDay(s, now).shownIds).toEqual(["a"]);
  });
  it("empty, singleton, and large libraries remain valid", () => {
    expect(
      getDay(selectDaily(setup([]), [], now, true), now).activeId,
    ).toBeUndefined();
    expect(
      getDay(selectDaily(setup([b("one")]), [b("one")], now, true), now)
        .activeId,
    ).toBe("one");
    const many = Array.from({ length: 2000 }, (_, i) => b(String(i), i + 1));
    expect(
      getDay(selectDaily(setup(many), many, now, true), now).activeId,
    ).toBe("1999");
  });
  it("excludes nested folders, dismissed and completed items", () => {
    const s = setup();
    s.preferences.excludedFolderIds = ["1"];
    expect(eligible(library[0], s, now)).toBe(false);
    s.preferences.excludedFolderIds = [];
    s.metadata.old.status = "completed";
    expect(eligible(library[0], s, now)).toBe(false);
    s.metadata.old.status = "dismissed";
    expect(eligible(library[0], s, now)).toBe(false);
  });
  it("penalizes repeated impressions and uses deterministic ties", () => {
    const items = [b("a", 100), b("b", 100)];
    const s = setup(items);
    s.metadata.a.impressionCount = 2;
    expect(getDay(selectDaily(s, items, now, true), now).activeId).toBe("b");
    expect(
      getDay(selectDaily(setup(items), items, now, true), now).activeId,
    ).toBe("a");
  });
  it("unknown and future saved dates do not dominate old bookmarks", () => {
    const items = [
      b("a", 100),
      { ...b("future"), addedAt: now + DAY },
      { ...b("unknown"), addedAt: 0 },
    ];
    expect(
      getDay(selectDaily(setup(items), items, now, true), now).activeId,
    ).toBe("a");
  });
});
describe("feedback lifecycle", () => {
  it("consumes a due snooze once and then restores passive suggestion cooldown", () => {
    const items = [b("old")];
    let s = applyAction(
      setup(items),
      { type: "snooze", id: "old", days: 1 },
      now,
    );
    s = selectDaily(s, items, addDays(now, 1), true);
    expect(s.metadata.old.status).toBe("pending");
    expect(s.metadata.old.snoozedUntil).toBeUndefined();
    expect(eligible(items[0], s, addDays(now, 2))).toBe(false);
  });
  it("opening a dismissed bookmark does not restore it implicitly", () => {
    const dismissed = applyAction(setup(), { type: "dismiss", id: "old" }, now);
    const opened = applyAction(dismissed, { type: "open", id: "old" }, now);
    expect(opened.metadata.old.status).toBe("dismissed");
    expect(opened.metadata.old.lastOpenedAt).toBe(now);
    expect(eligible(library[0], opened, now + 400 * DAY)).toBe(false);
    const restored = applyAction(opened, { type: "restore", id: "old" }, now);
    expect(restored.metadata.old.lastOpenedAt).toBe(now);
    expect(eligible(library[0], restored, now)).toBe(true);
  });
  it("a due explicit snooze can override an earlier open cooldown", () => {
    const opened = applyAction(setup(), { type: "open", id: "old" }, now);
    const snoozed = applyAction(
      opened,
      { type: "snooze", id: "old", days: 1 },
      now,
    );
    expect(eligible(library[0], snoozed, addDays(now, 1))).toBe(true);
  });
  it.each([1, 3, 7] as const)(
    "snoozes for %i calendar days then becomes eligible",
    (days) => {
      let s = selectDaily(setup(), library, now, true);
      s = applyAction(s, { type: "snooze", id: "old", days }, now);
      const until = addDays(now, days);
      expect(s.metadata.old.snoozedUntil).toBe(until);
      expect(eligible(library[0], s, until - 1)).toBe(false);
      expect(eligible(library[0], s, until)).toBe(true);
    },
  );
  it("opening records intent, not completion, and respects cooldown", () => {
    const s = applyAction(setup(), { type: "open", id: "old" }, now);
    expect(s.metadata.old.status).toBe("opened");
    expect(s.metadata.old.lastOpenedAt).toBe(now);
    expect(eligible(library[0], s, now + 29 * DAY)).toBe(false);
    expect(eligible(library[0], s, now + 30 * DAY)).toBe(true);
  });
  it("dismiss is indefinite and restore clears eligibility blockers", () => {
    let s = applyAction(setup(), { type: "dismiss", id: "old" }, now);
    expect(eligible(library[0], s, now + 1000 * DAY)).toBe(false);
    s = applyAction(s, { type: "restore", id: "old" }, now);
    expect(eligible(library[0], s, now)).toBe(true);
  });
  it("actions are immutable and safely ignore stale IDs", () => {
    const s = setup();
    expect(applyAction(s, { type: "open", id: "missing" }, now)).toEqual(s);
    applyAction(s, { type: "dismiss", id: "old" }, now);
    expect(s.metadata.old.status).toBe("pending");
  });
  it("recent suggestions have seven-day cooldown and future timestamps stay deferred", () => {
    const s = setup();
    s.metadata.old.lastSuggestedAt = now;
    expect(eligible(library[0], s, now + 6 * DAY)).toBe(false);
    expect(eligible(library[0], s, now + 7 * DAY)).toBe(true);
    expect(eligible(library[0], s, now - DAY)).toBe(false);
  });
});
describe("dates, URLs, and adapters", () => {
  it("uses local calendar boundaries", () => {
    const before = new Date(2026, 9, 27, 23, 59, 59).getTime();
    expect(dayKey(before)).toBe("2026-10-27");
    expect(dayKey(before + 1000)).toBe("2026-10-28");
  });
  it("snoozes across month and year boundaries", () => {
    const date = new Date(2026, 11, 31, 10).getTime();
    expect(dayKey(addDays(date, 1))).toBe("2027-01-01");
    expect(new Date(addDays(date, 7)).getHours()).toBe(10);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "chrome://bookmarks",
    "file:///tmp/a",
    "not a url",
    "https://user:password@example.com",
  ])("rejects unsafe URL %s", (url) => expect(safeUrl(url)).toBeNull());
  it("accepts and normalizes http(s)", () => {
    expect(safeUrl("HTTPS://EXAMPLE.COM")).toBe("https://example.com/");
    expect(safeUrl("http://localhost:3000/x")).toBe("http://localhost:3000/x");
  });
  it("flattens nested folders with safe bookmarks only and retains IDs", () => {
    const result = flattenTree([
      {
        id: "0",
        title: "",
        children: [
          {
            id: "1",
            title: "Bar",
            children: [
              {
                id: "2",
                title: "Nested",
                children: [
                  {
                    id: "3",
                    title: " ",
                    url: "https://example.com",
                    dateAdded: 123,
                  },
                ],
              },
              { id: "4", title: "unsafe", url: "javascript:alert(1)" },
            ],
          },
        ],
      },
    ]);
    expect(result.bookmarks).toEqual([
      {
        id: "3",
        title: "example.com",
        url: "https://example.com/",
        addedAt: 123,
        folderIds: ["1", "2"],
        folder: "Bar / Nested",
      },
    ]);
    expect(result.folders.map((f) => f.depth)).toEqual([0, 1]);
  });
  it("keeps metadata through title, URL, and folder changes", () => {
    let s = applyAction(setup(), { type: "dismiss", id: "old" }, now);
    s = reconcile(s, [
      {
        ...library[0],
        title: "Updated",
        url: "https://changed.example",
        folderIds: ["2"],
      },
    ]);
    expect(s.metadata.old.status).toBe("dismissed");
  });
  it("initializes missing storage and rejects corrupted state", () => {
    expect(decode(null)).toEqual(initialState());
    expect(() => decode({ version: 3 })).toThrow();
    const s = setup();
    s.metadata.old.impressionCount = NaN;
    expect(() => decode(s)).toThrow();
  });
});
