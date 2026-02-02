# Codebase Health Audit Report

**Project:** MS-365-Electron (Unofficial Microsoft 365 desktop client for Linux)
**Version:** 2.1.0
**Date:** 2026-02-02
**Auditor:** Automated (Claude)

---

## Executive Summary

MS-365-Electron is a ~5,500-line Electron app with 22 focused config modules, modern Electron 39.x, and proper security fundamentals (context isolation, sandbox, whitelisted IPC). The codebase is clean of TODOs/FIXMEs and has a functional CI/CD pipeline.

**Top 5 concerns, ranked by blast radius × likelihood:**

1. **Security: Overly permissive permission handlers** — All browser permissions (geolocation, clipboard, devices) are granted unconditionally (`wayland.js:94-121`). This is exploitable by any loaded Microsoft page or injected content.

2. **Reliability: Duplicate script injection** — Every script (notifications, call detection, media state, drop handler) is injected twice on the main window due to overlapping handlers in `main.js`, doubling all event listeners and observers in the renderer.

3. **Correctness: Mixed boolean/string settings** — Boolean preferences are stored as both actual booleans and the strings `"true"`/`"false"` across the codebase. A single storage change silently breaks comparisons in multiple files.

4. **Maintainability: No test infrastructure** — Zero automated tests exist. No test runner, no test files, no coverage tooling. Any refactoring carries high regression risk.

5. **Security: Weak domain regex matching** — `"*.office.com"` becomes regex `".*office.com"`, which matches `"eviloffice.com"` (`main.js:285`).

**Overall health:** Functional and well-structured for a hobbyist Electron app. The security surface needs immediate attention. The lack of tests is the primary barrier to safe remediation of all other issues.

---

## Detailed Findings

### A. Security Surface

| ID | Finding | Location | Severity |
|----|---------|----------|----------|
| S1 | Permission handler grants ALL permissions unconditionally | `config/wayland.js:94-115` | **High** |
| S2 | Device permission handler returns `true` for all devices | `config/wayland.js:118-121` | **High** |
| S3 | Domain regex `"*."` replaced with `".*"` matches unintended domains | `main.js:285` | **High** |
| S4 | `sandbox: false` on preferences window | `config/preferences.js:832` | Medium |
| S5 | `unsafe-inline` in CSP for preferences window | `config/preferences.js:214` | Medium |
| S6 | IPC `preferences:set` does not validate input types | `config/preferences.js:855` | Medium |
| S7 | `notification:show` IPC allows arbitrary OS notifications | `config/notifications.js:231-233` | Low |
| S8 | `appInfo` bridge bypasses IPC channel validation | `preload.js:151-155` | Low |

### B. Dependency Health

| ID | Finding | Details |
|----|---------|---------|
| D1 | 7 moderate npm audit vulnerabilities | `eslint` (stack overflow), `lodash` (prototype pollution), `undici` (decompression DoS) |
| D2 | 3 unused production dependencies | `cross-fetch`, `electron-prompt`, `node-gyp` |
| D3 | Linter is non-functional | `eslint`, `prettier`, `prettier-eslint` installed but zero config files exist; no lint script |
| D4 | Major version gaps | `electron-store` (10.x installed, 11.x available), `node-gyp` (11.x installed, 12.x available) |
| D5 | Hardcoded user-agent Chrome version `131.0.0.0` will become stale | `useragents.json:2-3` |

### C. Code Quality Patterns

| ID | Finding | Location |
|----|---------|----------|
| C1 | App-type detection from URL duplicated 3 times with inconsistent defaults | `main.js:352-366`, `windowManager.js:182-194`, `dropHandler.js:74-84` |
| C2 | File-type-to-app mapping duplicated | `fileHandler.js:14-25`, `cli.js:278-286` |
| C3 | `BrowserWindow.getFocusedWindow()` null-check repeated ~12 times in menu.js | `config/menu.js` (multiple locations) |
| C4 | `__filename`/`__dirname` ESM shim duplicated in 5 files | `main.js:57-58`, `preferences.js:11-12`, `windowManager.js:12-13`, `badge.js:10-11`, `tray.js:13-14` |
| C5 | Ad blocker initialization duplicated | `main.js:149-153` and `main.js:437-441` |
| C6 | `setWindowOpenHandler` has cyclomatic complexity 12+ with 4-level nesting | `main.js:277-340` |
| C7 | `setPreference` is a 107-line switch with 16 cases | `config/preferences.js:89-196` |
| C8 | Preferences UI is 600+ lines of inline HTML/CSS/JS in a template literal | `config/preferences.js:208-809` |
| C9 | Dynamic `import("electron")` inside menu handlers despite static import at top | `config/menu.js:45, 323` |
| C10 | `dialog.showMessageBoxSync()` blocks main process from async handler | `config/rpc.js:10` |

### D. Error Handling & Edge Cases

| ID | Finding | Location |
|----|---------|----------|
| E1 | `ElectronBlocker.fromPrebuiltAdsAndTracking()` — no `.catch()` | `main.js:150`, `main.js:438` |
| E2 | `autoUpdater.checkForUpdatesAndNotify()` — no `.catch()` | `main.js:260` |
| E3 | Multiple `window.loadURL()` calls with no `.catch()` | `config/appLauncher.js:167,175,183,200` |
| E4 | 7+ empty `.catch(() => {})` blocks with zero logging | `main.js:292,322,399`, `notifications.js:241`, `dropHandler.js:290`, `mediaState.js:283`, `power.js:157`, `theme.js:91` |
| E5 | No global `process.on('unhandledRejection')` handler | `main.js` (missing) |
| E6 | `getFocusedWindow()` can return null in `rpc.js` error dialog | `config/rpc.js:10` |

### E. Architecture & Design

| ID | Finding | Location |
|----|---------|----------|
| A1 | `createWindow()` in main.js bypasses `windowManager.js` entirely | `main.js:80` vs `config/windowManager.js` |
| A2 | Two different window creation paths with different configs | `main.js` vs `appLauncher.js:182-183` |
| A3 | Module-level side effects in `store.js` (migration + defaults at import time) | `config/store.js:47-83` |
| A4 | Splash screen loaded from remote URL — fails if offline | `main.js:123` |
| A5 | `enable-features` flag appended twice on Wayland (second may overwrite first) | `config/wayland.js:50-51,64-65` |

### F. Race Conditions & Memory Leaks

| ID | Finding | Location |
|----|---------|----------|
| R1 | `dimensions.js` returns `undefined` before `app.ready` | `config/dimensions.js:2-6` |
| R2 | `restoreSession()` returns `true` before staggered windows are created | `config/sessionManager.js:87-99` |
| R3 | `saveSession()` registered twice (main.js + sessionManager.js `before-quit`) | `main.js:461`, `sessionManager.js:149` |
| R4 | `setInterval` in injected `power.js` script never cleared | `config/power.js:99` |
| R5 | MutationObserver on `document.body` with `subtree: true, attributes: true` — expensive | `config/power.js:102-110` |
| R6 | Auto-save `setInterval` in sessionManager never cleared | `config/sessionManager.js:154` |
| R7 | Duplicate script injection doubles all renderer-side event listeners | `main.js:156-159` + `main.js:408-413` |
| R8 | Tray `app.on` listeners not cleaned up in `destroyTray()` | `config/tray.js:230-251` |

---

## Proposed Remediation Plan

### Quick Wins (Low risk, high confidence)

| Priority | Fix | Rationale | Risk | Verification |
|----------|-----|-----------|------|-------------|
| 1 | Fix domain regex: escape dots and use proper subdomain matching | S3 is directly exploitable | Minimal — only affects URL matching | Manual test: verify `eviloffice.com` is rejected |
| 2 | Default permission handler to `callback(false)`, whitelist only `media`, `notifications` | S1/S2 grant everything | Low — only restricts unwanted permissions | Manual test: verify Teams audio/video still works |
| 3 | Add `.catch(err => log.warn(...))` to all unhandled promises | E1-E3 cause silent crashes | None — only adds logging | Verify no unhandled rejection warnings in logs |
| 4 | Remove unused deps: `cross-fetch`, `electron-prompt`, `node-gyp` | D2 reduces install size and attack surface | Very low | `npm ci` succeeds, app starts normally |
| 5 | Add `process.on('unhandledRejection', ...)` handler | E5 prevents silent failures | None | Inject a failing promise, verify it's logged |
| 6 | Run `npm audit fix` to resolve `lodash` and `undici` vulns | D1 resolves known CVEs | Low — patch-level updates | `npm audit` shows 0 vulnerabilities |
| 7 | Remove duplicate `import("electron")` in menu.js | C9 is dead code | None | App menus still work |

### Requires Careful Refactoring (Touch multiple areas)

| Priority | Fix | Rationale | Prerequisites | Sequence |
|----------|-----|-----------|---------------|----------|
| 8 | Unify boolean settings to actual booleans with migration in `store.js` | C1 prevents silent breakage | **Must add tests first** for all settings consumers | Do store.js migration → update all comparison sites |
| 9 | Deduplicate script injection (remove from `createWindow`, keep only in `web-contents-created`) | R7 causes doubled listeners | Verify `web-contents-created` fires for all windows | Single change in main.js |
| 10 | Consolidate window creation through `windowManager.js` | A1/A2 cause tracking inconsistencies | Map all callers of `new BrowserWindow()` | Refactor appLauncher.js → main.js → verify session restore |
| 11 | Extract app-type detection into shared utility | C1 prevents inconsistencies | Identify all 3 call sites | Create utility → update callers |
| 12 | Extract preferences HTML to separate file | C8 enables tooling and maintainability | None, but large diff | Single file extraction + loadFile |
| 13 | Add ESLint + Prettier config files and lint script | D3 enables automated quality checks | None | Add configs → run lint → fix errors → add to CI |

### Needs Architectural Discussion

| Item | Concern | Trade-off |
|------|---------|-----------|
| Bundle splash screen locally | A4: offline splash fails | Adds ~50KB to app but eliminates network dependency |
| Replace inline HTML preferences with a proper renderer page | C8: 600-line template literal | Significant refactor but enables hot-reload dev and testing |
| Add test infrastructure (Playwright for E2E, vitest for unit) | No tests exist | Required before any major refactoring is safe |

### Monitor But Defer

| Item | Reason to defer |
|------|----------------|
| `electron-store` major version upgrade (10→11) | Breaking changes, current version works. Revisit when forced. |
| MutationObserver performance on `document.body` (R5) | Only affects Teams calls; monitor for user reports of sluggishness. |
| Stale user-agent Chrome version (D5) | Update periodically; not urgent until Microsoft blocks old UAs. |
| Session auto-save interval never cleared (R6) | Benign for app lifecycle; the interval runs until quit anyway. |

---

## Open Questions

1. **Is `cross-fetch` actually used by `@cliqz/adblocker-electron` at runtime?** — `depcheck` flagged it as unused, but the ad blocker's `fromPrebuiltAdsAndTracking(fetch)` call at `main.js:150` passes the global `fetch`. If the ad blocker requires `cross-fetch` as a polyfill, removing it may break ad blocking on older Electron versions.

2. **Does `electron-prompt` have a dynamic usage path?** — It's flagged unused by depcheck but may be loaded dynamically. A full-text search found no imports, but it could be a planned dependency.

3. **What is the intended behavior for `enable-features` double-append on Wayland?** — Does `appendSwitch` overwrite or append? If overwrite, the first set of features (VaapiVideoDecoder, VaapiVideoEncoder) is lost.

4. **Should the preferences window remain unsandboxed?** — `sandbox: false` at `preferences.js:832` may be required for certain Node.js APIs used in the preload script. Needs investigation.

5. **Is the `before-quit` double session-save intentional?** — Both `main.js:461` and `sessionManager.js:149` register save handlers. This may be harmless (idempotent) or may cause race conditions if file writes overlap.

6. **What test coverage standard is desired?** — Adding a full E2E suite for an Electron app is substantial. Need to determine: unit tests only? Integration tests for IPC? E2E with Playwright?
