# CODEX BUILD PROMPT — RECALL (MVP ONLY)

You are a senior Chrome Extension engineer, React/TypeScript developer, and product-minded UI designer. Build a complete, working, production-quality **local-first MVP** named **Recall** in the current repository. Do not stop at a plan, mockup, or isolated components. Implement the extension, run available build/tests, fix errors, and provide clear installation instructions. If the repository already has code, inspect it first, preserve relevant existing code, and explain any major changes. Do not ask me to make routine implementation decisions; make sensible choices and document them.

## 0. Reference assets and design priority
- A UI reference image is provided in this project at `design/reference-ui.png` (I will copy it there). Open and inspect it before implementing the UI. It is a **visual direction**, not a literal spec: build the functioning main New Tab screen, not an image collage or all the surrounding showcase panels.
- Design language: polished premium-feeling new-tab experience; scenic misty/mountain wallpaper; subtle dark translucent overlays/glass-like surfaces; excellent readability; generous white space; soft rounded corners; refined icons, calm typography; prominent centered greeting and search; one beautiful resurfaced bookmark card; unobtrusive navigation and small utility elements.
- Do **not** use the generic AI-generated dashboard aesthetic: no overwhelming gradients, noisy analytics widgets, large sidebars, or clutter. No fake browser chrome/address bar inside the page, since Chrome provides the real address bar outside the extension.
- Use an intentionally chosen, correctly licensed locally bundled background asset (or a CSS-only fallback) and record attribution/license in the README. Do not hotlink untrusted remote wallpaper images. Responsiveness and legibility are more important than decorative perfection. Provide light/dark readability where appropriate, keyboard accessibility, visible focus rings, and a reduced-motion mode.
- If exact image assets cannot be legally used or imported, approximate the feel without blocking development.

## 1. Problem and product intent
People save articles, technical tutorials, links, and videos in Chrome and forget they exist. Recall passively helps users rediscover bookmarks as part of their existing browsing routine. They should NOT have to open a separate app to remember to read things. The primary interface is a replacement for Chrome's new-tab page. Search/navigation should continue to feel normal; the bookmark recommendation is useful but never intrusive.

Scope this build to **Chrome bookmarks ONLY**. X bookmarks API, YouTube Watch Later integrations, AI summarization, RAG, accounts, notifications, paid plans, backend, PostgreSQL, authentication, cloud sync, analytics upload, behavioral tracking, and remote APIs are explicitly OUT OF SCOPE for MVP. Avoid inventing integrations or claiming these platforms can sync automatically. No backend or server required for normal runtime.

## 2. Required stack / architecture
- Chrome Extension Manifest V3.
- React + TypeScript + Vite. Tailwind CSS is fine; use clean modular components, consistent theme tokens and accessible primitives. Prefer a proven extension-friendly Vite setup if necessary, with reproducible scripts.
- `chrome_url_overrides: {"newtab":"newtab.html"}` targeting the generated output's actual path.
- Request only permissions needed: `bookmarks`, `storage`, and `search` (only if implementing an in-page search field using `chrome.search.query`). Do NOT request `history`, `tabs`, broad host permissions, content scripts, or access to every website unless you can justify and document an unavoidable MVP requirement. No background service worker required unless truly necessary.
- `chrome.bookmarks.getTree()` to read/flatten Chrome bookmarks, and bookmark events (`onCreated`, `onRemoved`, `onChanged`, `onMoved`, plus safe reconciliation after import) to keep the library current. Reloading on page open must also reflect latest bookmarks; ensure events/updates are not assumed to fire while no extension page is open. It is fine to reconcile with `getTree()` each new-tab open because MVP libraries are typically manageable, but ensure UI remains fast.
- `chrome.storage.local` for preferences, user actions, daily recommendation state, and small local-only metadata; never replace or delete the original Chrome bookmarks as a consequence of dismissing/reading/snoozing in Recall.
- No telemetry or user-data upload. No externally hosted scripts/CDN runtime dependencies; bundle scripts/styles locally, compliant with MV3 CSP.
- Strong TypeScript types, small testable pure functions for selection and state transitions, defensive error handling, no secrets.

## 3. First-run experience
- On first open, show a simple, tasteful onboarding overlay/page explaining: (a) Recall replaces the Chrome New Tab page, (b) accesses local Chrome bookmarks solely to suggest forgotten items, (c) stores feedback locally, (d) never deletes source bookmarks when dismissed.
- Explain that Chrome may ask the user to confirm a new-tab override and bookmark access at install time.
- Optional selection: include/exclude bookmark folders (default include all valid HTTP/HTTPS URL bookmarks, with ability to change later). In MVP, a basic multi-select is sufficient; if confusing root folders, render a simple nested/selectable folder list.
- Offer a 'Start rediscovering' CTA and a small skip/empty state. If there are no bookmarks, show a friendly empty state and guidance on bookmarking websites normally using Chrome.

## 4. New Tab screen (primary UI)
Each time a user opens a new Chrome tab, Recall's page loads. Existing open tabs and normal website pages must remain unchanged.
- Scenic background wallpaper with tasteful overlay.
- Small top-left Recall wordmark/logo; top-right icons/actions for Library and Settings.
- Centered time-aware greeting (Good morning / afternoon / evening) based on local device time, with optional small date. Avoid excessive live timer rerenders.
- Prominent elegant search input, hinting 'Search with your default search engine'. Press Enter -> `chrome.search.query({text: query, disposition: 'CURRENT_TAB'})` so search opens in the CURRENT tab and respects the user's configured Chrome search provider. Do not hardcode google.com or secretly change the default search engine. Chrome omnibox remains usable independently. If URL input support is provided, implement safe URL parsing and navigate current tab for valid URLs; otherwise clearly label the field as search-only. Handle blank inputs and errors without silent failure.
- One featured bookmark card on first new tab of day: title, domain, how long ago it was saved, subtle thematic styling or favicon where allowed safely; optional one-line description ONLY if truly available—never hallucinate summaries. Main actions:
  * **Read now** — open bookmark URL in a NEW tab, leave Recall tab accessible; record `opened`/`lastOpenedAt` but don't claim user finished reading.
  * **Remind later** — snooze for 1 day, 3 days, or 7 days, persisted.
  * **Dismiss** — exclude from future resurfacing while keeping source Chrome bookmark intact, with undo toast.
- After a user has seen the featured card repeatedly on tabs the same day, show a smaller/collapsed card rather than a heavy interrupting panel. Persist the day's selected bookmark and its display state across new tabs. Avoid changing to a different bookmark on every tab refresh. Once user dismisses/snoozes/opens: update its lifecycle, choose a different eligible candidate only if under configured daily cap, or show a calm 'All caught up for today' state; never spam.
- Daily recommendation default = **one distinct item/day** (configurable 1–3 max, but do NOT swap on every new tab). Define 'day' using local calendar date and document date/time-zone behavior. If user has no eligible bookmarks, show a graceful empty state.
- Provide a discreet button to view all bookmarks and a minimal affordance to collapse today's reminder / pause resurfacing for the day.
- App must not present itself as Google's official New Tab UI; product identity Recall should be clear.

## 5. Bookmark library screen
Can be a route within the extension (React state or hash routing) rather than a separate hosted website.
- Search by title or URL/domain (client-side).
- Tabs/filters: All, To revisit, Opened, Snoozed, Dismissed. Include counts when practical.
- Sorted by date saved (newest/oldest), with clear source/domain and saved age. Folder filter and basic pagination or virtual rendering if useful for large collections.
- Card/list actions: Open, Remind later, Dismiss, Restore. These actions must be persisted, and restoring a dismissed item makes it eligible again.
- Do not imply you know whether a source article was read. Use labels 'Opened' versus 'Read' unless user explicitly marks it completed. Optionally add a distinct user-driven 'Mark as read' action with a separate state.
- Handle bookmarks whose Chrome source was deleted, changed, moved, or duplicated. Use stable Chrome bookmark IDs for local status while reconciling stale IDs; avoid accidental mutation of source bookmarks. Do not display folder nodes as URL bookmarks or accept `chrome://` or `javascript:` URLs as openable article links.

## 6. Settings screen
- Daily recommendation count: 1 (default), 2, or 3.
- Included bookmark folders.
- Toggle 'Compact after first display' (default on), and 'Pause recommendations for today'.
- Choose reminder behavior after opening: default do not suggest that link again for at least a period, without falsely assuming it has been read. Sensible MVP policy: opening removes it from the current day's queue and lowers future priority; user can explicitly mark as completed/dismiss.
- Privacy summary: locally stored data, no server; disclaimer about Chrome permissions.
- Reset Recall statuses/preferences with clear confirmation, never delete original bookmarks.
- Include a route back to New Tab.

## 7. Recommendation algorithm (deterministic MVP, no AI)
Implement as pure tested logic:
1. Load valid Chrome bookmarks and metadata.
2. Exclude bookmark folders, invalid/non-http(s) URLs, excluded folders, dismissed items, actively snoozed items, and items intentionally marked completed.
3. Track: bookmarkId, addedAt (use Chrome's dateAdded if available), lastSuggestedAt, impressionCount, lastOpenedAt, snoozedUntil, status. Do not confuse displaying the card with actually opening or reading the bookmark.
4. Prioritize older untouched bookmarks, penalize repeatedly surfaced bookmarks, and avoid items recently opened or suggested. Use simple documented weights/rules or stable sorting rather than AI/black box. Ensure old junk isn't indefinitely pushed; allow Dismiss.
5. Persist a stable selection for the local day and maintain daily shown IDs to avoid repeats and excessive exposures.
6. Snoozed items re-enter eligibility after expiration; dismissal persists until manually restored.
7. Ensure date arithmetic, empty pools, duplicates, deleted source bookmarks, clock changes, and new bookmark arrivals are handled safely.

## 8. UX / performance / security acceptance criteria
- New-tab content renders quickly with cached state; don't await slow external network fetch before rendering. Keep the bundle lean and avoid layout shifts.
- Works with 0 bookmarks, 1 bookmark, and 1,000+ bookmarks without freezing.
- Keyboard accessible inputs/buttons; tooltips/ARIA where helpful; sufficient contrast on wallpaper; responsive down to narrow browser widths; loading/empty/error states.
- External URLs only opened after validating safe `http:` or `https:` schemes, and with appropriate Chrome APIs. Sanitize/display untrusted bookmark titles as text, never unsanitized HTML. No remote code or eval.
- No browser history tracking or claim that bookmarks are unread based on browsing history; 'not yet opened via Recall' is the honest signal.
- Avoid hardcoding Google as the search provider; use `chrome.search.query` and `search` permission. No search-provider changes.
- Testing: unit tests for selection, day-boundary, snooze, dismiss/restore, URL validity and state lifecycle. Manual QA checklist for chrome://extensions load-unpacked, New Tab override confirmation, search, 3 successive tabs, opening, snooze, dismissal, folder exclusion, deletion/updates, reinstall/reset behavior.

## 9. Project layout / deliverables
Implement the app in a maintainable structure, e.g.:
- `src/newtab/` components and pages (New Tab, Library, Settings, Onboarding)
- `src/lib/` bookmark adapters, ranking engine, persistence, date utils, URL/search utils
- `src/types/` domain interfaces
- `public/` locally bundled icons/background, manifest where suitable
- `tests/` algorithm/unit tests
- `README.md` with architecture, behavior, privacy, development, build, install as unpacked extension, known limitations, and future phases
- `MVP_CHECKLIST.md` with functional acceptance criteria and checkbox results
- Any necessary `package.json`, TypeScript/Vite/Tailwind configs, extension icons.

At minimum, provide working commands `npm install`, `npm run dev` (if supported for UI development), `npm run build`, `npm run test`, `npm run typecheck` and explain which built directory to Load unpacked at `chrome://extensions`. Do not claim an automated test demonstrates real Chrome integration if it only tested mocks.

## 10. Important phased instruction
**Build PHASE 1 (MVP) ONLY in this run**. Do not implement Phase 2 features yet. Within Phase 1 you may work incrementally: (A) inspect repo/reference & scaffold, (B) bookmarks + persistence + algorithm, (C) new tab + library + settings UI, (D) integration & QA. Fully complete Phase 1 with real functionality and as much verification as tools permit, not placeholders or TODO-only buttons.

After finishing MVP, summarize:
- exact files created/changed and working features;
- architecture and why selected;
- commands run and their real results (tests/build/typecheck);
- how I install/test in Chrome step-by-step;
- known limitations or untested manual behaviors;
- 3–5 sensible improvements to consider in Phase 2, but **do not build them without a new request**.

## 11. Future direction (document only, do NOT implement)
Potential follow-up features: better topical ranking with opt-in privacy-safe metadata, X/YouTube capture via explicit sharing or supported authorized APIs, opt-in cross-device sync, carefully validated AI summaries, engagement measurement with user consent, optional subscription. These are NOT needed for this MVP.

Be meticulous with implementation details. Prioritize **user trust, useful resurfacing, clean premium UI, and low distraction** over feature quantity. Start by inspecting the repository and the provided reference image, then IMPLEMENT.
