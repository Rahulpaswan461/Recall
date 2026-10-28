# Recall Phase 1 acceptance

## Implemented and verified

- [x] Read the full supplied specification and inspect the reference before implementation.
- [x] MV3, React, strict TypeScript, Vite; generated `dist/newtab.html` matches the manifest.
- [x] Exactly bookmarks/storage/search permissions; no host permissions, background worker, or content scripts.
- [x] Original bundled mountain wallpaper, refined single-card design, clear Recall identity, no fake browser chrome.
- [x] Onboarding explains New Tab replacement, local feedback, permissions, and source-bookmark preservation.
- [x] Nested folder inclusion defaults to all; parent exclusion includes descendants.
- [x] Time-aware greeting and local date; search uses Chrome's default provider in the current tab.
- [x] Stable daily recommendation with configurable 1–3 cap, compact repeated visits, collapse, and daily pause.
- [x] Validated HTTP(S) Read now opens another tab; records Opened, never inferred reading.
- [x] Calendar snoozes (1/3/7 days), dismissal, Undo, and explicit Restore persist.
- [x] Dismissed items remain dismissed when opened from the library, until explicitly restored.
- [x] Library search, saved-date sorting, folder/status filters, counts, and 30-item pagination.
- [x] Settings, opening cooldowns, privacy summary, and confirmed non-destructive reset.
- [x] Pure deterministic ranking and lifecycle tests; missing dates and future clocks are handled.
- [x] Source creation/removal/rename live reconciliation tested with real Chrome APIs in a disposable Chromium profile.
- [x] Create/remove/change/move/reorder/import-end subscriptions; tree refreshed on every new-tab open and focus.
- [x] Duplicate IDs remain independent; equivalent URL fragments cannot consume two daily slots.
- [x] Multi-tab Web Locks and storage propagation verified with simultaneous real extension tabs.
- [x] Empty library, invalid source URLs, orphaned metadata, and damaged storage handling.
- [x] 2,000-item engine test and 1,204-item browser library test.
- [x] Keyboard search, native modal focus containment, visible focus outlines, and reduced-motion styling.
- [x] Responsive layouts checked at 1440px, 390px, and 320px; desktop/mobile screenshots inspected.
- [x] User titles render as text; no remote favicons, scripts, fonts, telemetry, or background requests.
- [x] `npm run typecheck`, `npm run test`, `npm run build`, and `npm run test:ui` pass.
- [x] Unit tests also pass with `TZ=America/New_York`.
- [x] Final npm dependency audit: zero vulnerabilities.
- [x] Installation, architecture, behavior, limitations, licensing, and Phase 2 ideas documented.
- [x] Phase 2 features remain unimplemented.

## Manual QA in your own Chrome profile

These checks are intentionally not marked complete by automated Chromium results.

- [ ] At `chrome://extensions`, enable Developer mode and Load unpacked → `dist/`. Verify any New Tab override/bookmark confirmation prompts and no extension errors.
- [ ] Open three new tabs with at least one eligible bookmark. Confirm stable content and compact repeats. Existing website tabs must stay unchanged.
- [ ] Set your preferred Chrome search provider, search from Recall, and confirm the correct provider opens in the same tab. Try blank input and a search-provider error.
- [ ] Read now opens a separate tab; the Recall page remains accessible. Check Library → Opened and verify the source bookmark still exists.
- [ ] Snooze for 1/3/7 days, reopen Chrome, and verify persistence. Confirm eligibility after the due time using a disposable test profile if changing the device clock.
- [ ] Dismiss, Undo, then dismiss again and restore via the library. Verify Chrome's source bookmark is untouched throughout.
- [ ] Exclude a parent folder and confirm its descendants stop contributing. Re-enable it and confirm the library still contains all source entries.
- [ ] Create, rename, move, import, and delete source bookmarks in Chrome. Confirm live changes and fresh state after all Recall tabs have been closed/reopened.
- [ ] Test daily caps 1/2/3, pause/resume, midnight rollover, and timezone changes. Returning to an already-used date should not reset its allowance.
- [ ] Reset with confirmation, then reinstall in a test profile. Verify onboarding returns and original bookmarks remain intact.
- [ ] Test a competing New Tab extension and Chrome's override choice. Verify keyboard and your OS screen reader on all screens, at 200% zoom and a narrow window.
- [ ] Verify normal behavior without internet access except explicit destination/search navigation.
