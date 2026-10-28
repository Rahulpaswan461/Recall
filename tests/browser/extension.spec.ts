import { chromium, expect, test } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

test("built MV3 extension: real bookmarks, new-tab override, cross-tab cap, events and search", async () => {
  const profile = await mkdtemp(join(tmpdir(), "recall-extension-"));
  const extension = resolve("dist");
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  try {
    await context.route(/^https?:/, (route) =>
      route.fulfill({
        status: 200,
        body: "Test destination — no external request sent.",
      }),
    );
    const page = await context.newPage();
    await page.goto("chrome://newtab/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Start rediscovering" }).click();
    const source = await page.evaluate(async () => {
      const tree = await chrome.bookmarks.getTree();
      const parent = tree[0].children!.find((n) => !n.url)!.id;
      return await chrome.bookmarks.create({
        parentId: parent,
        title: "A real Chrome bookmark",
        url: "https://example.com/recall-test",
      });
    });
    await expect(
      page.getByRole("heading", { name: "A real Chrome bookmark" }),
    ).toBeVisible();
    const newTabs = await Promise.all([context.newPage(), context.newPage()]);
    await Promise.all(newTabs.map((p) => p.goto("chrome://newtab/")));
    for (const tab of newTabs) {
      await expect(
        tab.getByRole("heading", { name: "A real Chrome bookmark" }),
      ).toBeVisible();
      await expect(tab.locator(".featured-card")).toHaveClass(/compact/);
    }
    const stored = await page.evaluate(
      async () => (await chrome.storage.local.get("recall.v1"))["recall.v1"],
    );
    expect(Object.values(stored.days).flatMap((d: any) => d.shownIds)).toEqual([
      source.id,
    ]);
    await newTabs[0]
      .getByRole("button", { name: "Dismiss", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "All caught up for today." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        async (id) => (await chrome.bookmarks.get(id)).length,
        source.id,
      ),
    ).toBe(1);
    await newTabs[0].getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "A real Chrome bookmark" }),
    ).toBeVisible();
    const popupPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Read now", exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForURL("https://example.com/recall-test");
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await expect(
      page.getByRole("heading", { name: "All caught up for today." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await expect(page.locator(".row-status")).toContainText("Opened");
    await page.evaluate(
      async (id) => chrome.bookmarks.update(id, { title: "Renamed in Chrome" }),
      source.id,
    );
    await expect(
      page.getByRole("heading", { name: "Renamed in Chrome" }),
    ).toBeVisible();
    await page.evaluate(async (id) => chrome.bookmarks.remove(id), source.id);
    await expect(page.locator(".library-row")).toHaveCount(0);
    await page.getByRole("button", { name: "Back to your day" }).click();
    const search = page.getByRole("searchbox", {
      name: "Search with your default search engine",
    });
    await search.fill("recall extension integration");
    await search.press("Enter");
    await page.waitForURL(/^https?:/);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
