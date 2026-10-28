# Recall

A calmer Chrome new tab. A second look at the ideas you saved.

Recall is a complete **Phase 1, local-first Manifest V3 extension** built with React, TypeScript, and Vite. It reads Chrome bookmarks, offers a stable daily rediscovery, and lets you open, snooze, dismiss, or restore items. No account, backend, telemetry, AI summaries, or platform integrations are included.

The supplied `CODEX_PROMPT.md` and `design/reference-ui.png` were read before implementation. The reference inspired the spacious greeting, central search, scenic mountains, and single restrained bookmark card. Its surrounding showcase panels and browser chrome were not reproduced. Implementation is in `/Users/rahulpaswan/Desktop/Projects/bookmark-schedular/`. The original `recall_codex_starter/` directory and starter ZIP remain unchanged.

## Install in Chrome

The built extension is in **`dist/`**, alongside this README.

1. If rebuilding, install Node.js 22.12+ (Node 24 is recommended), then run `npm ci` and `npm run build` from this project directory. For an initial checkout without a lockfile, `npm install` also works; this project includes a lockfile.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the upper-right corner.
4. Click **Load unpacked** and select the project's **`dist` folder**, not the source directory.
5. Open a new tab. Confirm **Keep it** or the equivalent prompt if Chrome asks whether to keep Recall as your New Tab page. Review the bookmark permission prompt if shown.
6. Choose your bookmark folders and click **Start rediscovering**. If Chrome has no bookmarks, save a website normally with **⌘D** on Mac or **Ctrl+D** on Windows/Linux.
7. After a code change, rebuild, click the extension's **Reload** button on `chrome://extensions`, and open a fresh tab. A source Vite development page is not an installed extension.

Existing website tabs remain untouched. Chrome's address bar continues to work normally. If another extension controls New Tab, disable its new-tab override or choose Recall in Chrome's prompt. Removing Recall restores Chrome's normal new-tab handling (subject to other installed extensions).

## Try the MVP

- Enter a query into the central **search-only** field. Recall calls `chrome.search.query` with `CURRENT_TAB`, using your configured Chrome search provider. It does not treat URL-looking text as direct navigation or change your default provider. Blank queries do nothing; errors are shown explicitly.
- Open three successive new tabs. The same bookmark remains selected; tabs after the first use a compact card by default. Expand/collapse is available on the card.
- **Read now** opens the validated bookmark in a separate tab with its opener removed. Recall records **Opened**, never “read” or “completed.”
- **Remind later** offers 1, 3, or 7 calendar days. **Dismiss** keeps the original Chrome bookmark and offers a ten-second Undo toast. Library → Dismissed → Restore is always available afterward.
- With the default cap of one distinct item per day, opening, snoozing, or dismissing it leaves a calm “All caught up for today” state. Settings can raise the cap to two or three. The next candidate appears only after an action, not on every refresh.
- In **Library**, search titles/URLs, filter by folder or status, change saved-date ordering, and paginate in groups of 30. Excluded folders remain visible in the library. **Restore** explicitly removes recommendation blockers without erasing the historical last-opened timestamp.
- In **Settings**, change the daily cap, folder inclusion, compact mode, opening cooldown, or today's pause. Reset requires an explicit in-app confirmation and only removes Recall's own data.

## Development and verification

```sh
npm install
npm run dev             # Open http://127.0.0.1:5173/newtab.html
npm run typecheck
npm run test
npm run build           # Produces dist/newtab.html and dist/manifest.json
npx playwright install chromium
npm run test:ui         # Rebuilds, then runs browser + actual MV3 integration tests
```

The ordinary browser preview intentionally starts with an empty library and a visible preview label. It uses localStorage solely for development and does not pretend to have Chrome API access. No fabricated bookmarks are shipped in the product. Browser fixtures live only under `tests/`.

Verification performed for this delivery:

- TypeScript strict type check and production build.
- 38 unit tests: ranking, stable selection, caps, local day boundaries, snooze expiry, dismissal/restore, recent opening, duplicates, deletion, folder exclusions, URL safety, invalid storage, and 2,000-bookmark selection. Also run in `America/New_York` to verify local-date assumptions outside the development timezone.
- Four UI scenarios with explicitly mocked Chrome APIs: onboarding, search dispatch, repeated visits, dismiss/undo, library feedback, settings/reset, source deletion, folder exclusions, 320px/390px layouts, reduced motion, keyboard access, untrusted titles, and a 1,204-bookmark library.
- One **real built MV3 integration test** in a disposable Chromium profile: new-tab override, actual Chrome bookmark APIs, simultaneous new tabs sharing a daily cap, storage change propagation, dismiss/undo without deleting source data, opening a separate tab, rename/removal events, and current-tab search navigation.
- The integration test creates and removes bookmarks only in its temporary profile; it does not touch your personal Chrome profile. External test destinations are intercepted locally, so it verifies search/navigation dispatch, not search-result quality or a custom provider's behavior.
- Desktop and mobile screenshots inspected. `npm audit` reports zero vulnerabilities for the final dependency set.

Browser screenshots are generated under `test-results/` (gitignored). The remaining personal-Chrome checks are listed in `MVP_CHECKLIST.md`; an automated Chromium test cannot validate Chrome's user-facing install confirmation on your profile.

## Architecture and files

Small pure functions hold the recommendation rules separately from the UI and browser APIs. Vite produces ordinary bundled extension files, so no special extension framework, worker lifecycle, or runtime server is necessary.

```text
newtab.html                     New Tab entry point
public/manifest.json             MV3 permissions and override
public/wallpaper.svg             Original, locally bundled mountain illustration
public/icons/icon{16,48,128}.png  Original extension identity assets
public/THIRD_PARTY_NOTICES.txt    Bundled runtime dependency licenses
src/types/index.ts              Bookmark, metadata, preferences, and daily state types
src/lib/bookmarks.ts             Safe tree flattening and bookmark event subscriptions
src/lib/engine.ts                Pure ranking, eligibility, reconciliation, lifecycle
src/lib/storage.ts               Validated persistence and cross-tab transactions
src/lib/dates.ts                 Local day keys, calendar snoozes, saved age
src/lib/urls.ts                  HTTP(S) validation, domains, duplicate keys
src/newtab/main.tsx              React bootstrap
src/newtab/App.tsx               Coordination, routes, errors, Undo, daily refresh
src/newtab/SearchBox.tsx         Default-provider current-tab search
src/newtab/Featured.tsx          Full/compact daily reminder
src/newtab/BookmarkActions.tsx   Open, snooze, dismiss, restore controls
src/newtab/FolderPicker.tsx      Nested folder inclusion
src/newtab/Onboarding.tsx        Native modal first-run experience
src/newtab/Library.tsx           Search, filters, sorting, pagination
src/newtab/Settings.tsx          Preferences, privacy, confirmed reset
src/newtab/styles.css           Responsive visual system, focus, reduced motion
tests/engine.test.ts             Unit coverage
tests/browser/recall.spec.ts     Mocked browser/UI scenarios
tests/browser/extension.spec.ts  Actual built-extension integration
package.json / package-lock.json Reproducible dependencies and commands
tsconfig.json                   Strict TypeScript configuration
vite.config.ts                  Production newtab.html build
vitest.config.ts                Unit test scope
playwright.config.ts            Browser verification and local server
MVP_CHECKLIST.md                 Acceptance results and manual QA
ASSET_LICENSES.md                Asset attribution/licensing
.gitignore                      Generated/dependency exclusions
CODEX_PROMPT.md                  Supplied specification, preserved
design/reference-ui.png         Supplied visual reference; not bundled in dist
```

### Selection rules

1. Flatten Chrome's bookmark tree, retaining stable Chrome IDs, folder ancestry, and `dateAdded`. Keep HTTP/HTTPS URLs only; reject URLs with embedded credentials. Missing dates display “Saved date unknown” and do not receive an age advantage.
2. Exclude unselected folders and descendants, dismissed/completed items, active snoozes, recently opened items (default 30 days; configurable 7/30/90), and items passively suggested within seven days. A due snooze is an explicit request and bypasses passive cooldowns. Restore also explicitly permits eligibility again.
3. Rank by **min(age in days, 3650) − 30 × impressionCount − 90 if ever opened**. Use the bookmark ID for stable ties. Future saved dates receive zero age advantage. This is deterministic, not AI.
4. Save the day's selected ID, shown IDs, normalized shown URLs, view count, pause, and collapse state. A selected bookmark remains stable while eligible. Opening, snoozing, dismissing, deleting, or excluding it consumes its already-used daily slot. Increasing the cap allows more slots; lowering it does not retract an already displayed item.
5. URL duplicates remain separate library entries with per-ID feedback. They cannot consume multiple slots on the same day; URL fragments are ignored for daily deduplication. This MVP does not merge duplicate records or apply one ID's dismissal to other IDs.
6. Reconcile from `chrome.bookmarks.getTree()` on every new-tab load and focus; listen for create/remove/change/move/reorder/import-end events while an extension page is open. Events are debounced. Deleted source IDs lose orphaned metadata; historical daily slots remain consumed. Changed titles/URLs/folders preserve feedback for the stable ID.

A day is `YYYY-MM-DD` in the device's **current local timezone**, not a rolling 24-hour window or UTC day. Snoozes use `Date.setDate`, preserving local wall-clock time across daylight-saving changes (the platform resolves nonexistent/ambiguous times). Passive cooldowns use elapsed 24-hour periods. A visible open page checks the calendar once per minute; focus/open reconciles immediately. Moving to another local calendar date may start another day's allowance. Returning to a previous date reuses its stored daily ledger, so clock rollback does not reset its cap. Future action timestamps remain deferred until time catches up; reset is the explicit recovery path for a badly mis-set device clock.

### Persistence and privacy

All production state lives under `recall.v1` in `chrome.storage.local`. Web Locks serialize read/modify/write operations across extension pages, and storage events keep open pages synchronized. Storage is validated; damaged data produces a visible error rather than silently overwriting feedback. Settings → Reset remains available as recovery.

Permissions are exactly **bookmarks**, **storage**, and **search**. No `tabs`, history, host permissions, content scripts, background service worker, account, server, or telemetry is used. React renders bookmark titles as text. URLs are checked again before opening. All scripts, styles, icons, and wallpaper are bundled, and the MV3 CSP forbids remote scripts/eval. No external favicons are fetched. System fonts avoid font-service requests. Chrome itself may sync your source bookmarks according to your Chrome settings; Recall feedback uses local storage, not Chrome sync. Navigating or searching is an explicit user action and necessarily contacts the chosen destination/provider.

Reset erases Recall preferences, statuses, and daily history only. Uninstalling normally removes extension-local state; reinstalling begins onboarding again. Original Chrome bookmarks remain intact. This MVP retains small daily ledgers to safely handle calendar rollback; it does not keep a copy of page contents or browsing history.

## Design assets

The wallpaper is an original layered SVG mountain/forest illustration created for Recall, bundled locally with no network dependency. The leaf mark and PNG extension icons are original. These original artwork assets are dedicated under CC0-1.0; see `ASSET_LICENSES.md`. Lucide icons use the ISC license and the project uses system fonts. The supplied reference image is retained only for project documentation and is not redistributed inside the extension build.

## Known limitations and Phase 2 considerations

- Chrome on desktop is the target (minimum version 120). Chrome for Android does not support loading this extension.
- No page descriptions, read-duration estimates, topic inference, completion detection, or remote thumbnails are invented. “Opened” means only opened via Recall.
- Snoozes become eligible at their due time; there are no notifications and no guarantee the item outranks every other eligible bookmark immediately.
- Separate windows share state, so feedback from one can update another's displayed card. Undo is available in the initiating page's toast, and Restore is available everywhere.
- Your Chrome install prompts, custom search providers, conflicting New Tab extensions, OS screen readers, and reinstall behavior still need the manual checks below. Automated integration ran in Chromium, not your personal Chrome profile.

Potential **Phase 2 only**, requiring a new request:

1. Optional, privacy-conscious topical grouping and improved ranking controls.
2. Explicit share/capture workflows for other bookmark sources using supported APIs.
3. Opt-in cross-device synchronization with clear export/deletion controls.
4. Carefully sourced, opt-in summaries that clearly separate source content from generated text.

None of these Phase 2 features are implemented.
