# Browser Color Mode Toggle

An unpacked Chromium extension that toggles a darkened or normal rendering mode for all open tabs, without using the browser debugger API.

## What it does

- Toggles every currently open `http` and `https` tab between normal and darkened mode
- Re-applies the active mode when a page finishes loading
- Exposes a keyboard shortcut: `Ctrl+Shift+Z`
- Works in Chromium-based browsers such as Chrome and Brave

## Install

1. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder: `/home/felix/repos/browser-color-mode-toggle`
5. Open the extension shortcuts page if needed:
   - Chrome: `chrome://extensions/shortcuts`
   - Brave: `brave://extensions/shortcuts`
6. Confirm that `Toggle color scheme` is bound to `Ctrl+Shift+Z`.

## Notes

- Chromium does not allow extensions to control `chrome://`, `brave://`, the extensions page, the web store, or other protected internal pages.
- This version avoids the `debugger` permission, so it will not trigger the browser's debug-mode banner.
- The dark mode effect is implemented by injecting CSS into pages. That avoids debugger warnings, but it is less precise than native `prefers-color-scheme` emulation and some sites may look imperfect.
