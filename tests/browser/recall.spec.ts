import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    type Listener = (...args: any[]) => void;
    const event = () => {
      const listeners: Listener[] = [];
      return {
        addListener: (fn: Listener) => listeners.push(fn),
        removeListener: (fn: Listener) => {
          const i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        },
        emit: (...args: any[]) => listeners.forEach((fn) => fn(...args)),
      };
    };
    const changed = event();
    const tree = [
      {
        id: "0",
        title: "",
        children: [
          {
            id: "1",
            title: "Bookmarks bar",
            children: [
              {
                id: "10",
                title: "The quiet craft of paying attention",
                url: "https://example.com/attention",
                dateAdded: Date.now() - 400 * 86400000,
              },
              {
                id: "11",
                title: "A field guide to creative thinking",
                url: "https://example.com/creative",
                dateAdded: Date.now() - 200 * 86400000,
              },
              {
                id: "12",
                title: "Designing for the long term",
                url: "https://example.org/design",
                dateAdded: Date.now() - 100 * 86400000,
              },
              {
                id: "13",
                title: "<img src=x onerror=alert(1)>",
                url: "javascript:alert(1)",
              },
            ],
          },
        ],
      },
    ];
    Object.assign(window, {
      chrome: {
        bookmarks: {
          getTree: async () => tree,
          onCreated: event(),
          onRemoved: event(),
          onChanged: event(),
          onMoved: event(),
          onImportEnded: event(),
          onChildrenReordered: event(),
        },
        storage: {
          local: {
            get: async (key: string) => ({
              [key]: JSON.parse(localStorage.getItem(key) || "null"),
            }),
            set: async (values: Record<string, unknown>) => {
              const changes: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(values)) {
                localStorage.setItem(key, JSON.stringify(value));
                changes[key] = { newValue: value };
              }
              changed.emit(changes, "local");
            },
          },
          onChanged: changed,
        },
        search: {
          query: async (value: unknown) => {
            (window as any).__search = value;
          },
        },
      },
      __tree: tree,
    });
  });
});
async function start(page: import("@playwright/test").Page) {
  await page.goto("/newtab.html");
  await page.getByRole("button", { name: "Start rediscovering" }).click();
  await expect(
    page.getByRole("heading", { name: "The quiet craft of paying attention" }),
  ).toBeVisible();
}
test("onboarding, stable repeated visits, default search, dismiss and undo", async ({
  page,
}) => {
  await start(page);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("searchbox", { name: "Search with your default search engine" })
    .fill("a thoughtful search");
  await page
    .getByRole("searchbox", { name: "Search with your default search engine" })
    .press("Enter");
  expect(await page.evaluate(() => (window as any).__search)).toEqual({
    text: "a thoughtful search",
    disposition: "CURRENT_TAB",
  });
  await page.reload();
  await expect(page.locator(".featured-card")).toHaveClass(/compact/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "The quiet craft of paying attention" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "All caught up for today." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The quiet craft of paying attention" }),
  ).toBeVisible();
});
test("library search, feedback, settings, reset and narrow layout", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.locator(".library-row")).toHaveCount(3);
  await page
    .getByRole("searchbox", { name: "Search bookmarks" })
    .fill("example.org");
  await expect(page.locator(".library-row")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Search bookmarks" }).fill("");
  await page
    .locator(".library-row")
    .nth(1)
    .getByRole("combobox")
    .selectOption("3");
  await page.getByRole("button", { name: /^Snoozed/ }).click();
  await expect(page.locator(".library-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.locator(".library-row")).toHaveCount(0);
  await page.getByRole("button", { name: "All 3", exact: true }).click();
  await page.screenshot({
    path: "test-results/library-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("switch", { name: "Pause for today" }).click();
  await expect(
    page.getByRole("switch", { name: "Pause for today" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Back to your day" }).click();
  await expect(
    page.getByRole("heading", { name: "A little quiet, just for today." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Resume today/ }).click();
  await expect(page.locator(".featured-card")).toBeVisible();
  await page.getByRole("button", { name: "Close notification" }).click();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Reset Recall", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, reset Recall", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("folder exclusions and source deletion reconcile without deleting Chrome data", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: "Bookmarks bar" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Bookmarks bar" }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Back to your day" }).click();
  await expect(page.locator(".featured-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.locator(".library-row")).toHaveCount(3);
  await page.evaluate(() => {
    (window as any).__tree[0].children[0].children.splice(0, 1);
    (window as any).chrome.bookmarks.onRemoved.emit("10");
  });
  await expect(page.locator(".library-row")).toHaveCount(2);
});

test("large library, untrusted titles, keyboard search, and reduced motion", async ({
  page,
}) => {
  await start(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const search = page.getByRole("searchbox", {
    name: "Search with your default search engine",
  });
  await search.fill("keyboard search");
  await search.focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toBeFocused();
  expect(
    await page
      .getByRole("button", { name: "Search", exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page.evaluate(() => {
    const children = (window as any).__tree[0].children[0].children;
    for (let i = 0; i < 1200; i++)
      children.push({
        id: `bulk-${i}`,
        title: `Research note ${i}`,
        url: `https://example.com/note/${i}`,
        dateAdded: Date.now(),
      });
    children.push({
      id: "untrusted",
      title: "<img src=x onerror=alert(1)>",
      url: "https://example.com/text",
      dateAdded: Date.now(),
    });
    (window as any).chrome.bookmarks.onCreated.emit("bulk");
  });
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.locator(".count-badge")).toHaveText("1204 bookmarks");
  await expect(page.locator(".library-row")).toHaveCount(30);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("Page 2 of 41");
  await page.getByRole("searchbox", { name: "Search bookmarks" }).fill("<img");
  await expect(page.locator(".library-row")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "<img src=x onerror=alert(1)>" }),
  ).toBeVisible();
  await expect(page.locator(".library-row img")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
