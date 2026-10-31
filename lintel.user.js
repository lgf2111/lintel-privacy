// ==UserScript==
// @name         Lintel
// @namespace    sit-lintel
// @version      1.0.0.202610312151
// @description  Unofficial, faster board for SIT's room booking system. Runs in your own session and never books by itself. Not affiliated with SIT.
// @author       Lintel
// @match        https://rbs.singaporetech.edu.sg/*
// @exclude      https://rbs.singaporetech.edu.sg/Files/*
// @updateURL    https://leeguanfeng.com/lintel-privacy/lintel.meta.js
// @downloadURL  https://leeguanfeng.com/lintel-privacy/lintel.user.js
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

/* --- chrome.storage.local shim (localStorage-backed) --- */


(function () {
  var g = (typeof window !== 'undefined' ? window : globalThis);
  if (g.chrome && g.chrome.storage && g.chrome.storage.local) return; // real extension: leave it
  var PREFIX = 'rbslintel:'; // namespace in localStorage so we never clash with RBS's own keys
  var listeners = [];
  function ls() {
    try { return g.localStorage; } catch (e) { return null; }
  }
  function readKey(k) {
    var store = ls();
    if (!store) return undefined;
    var raw = store.getItem(PREFIX + k);
    if (raw == null) return undefined;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }
  function writeKey(k, v) {
    var store = ls();
    if (!store) return;
    try { store.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* quota/full: ignore */ }
  }
  function removeKey(k) {
    var store = ls();
    if (store) { try { store.removeItem(PREFIX + k); } catch (e) {} }
  }
  function collect(keys) {
    // keys: string | string[] | object(defaults) | null/undefined(all)
    var out = {};
    var names = [];
    if (keys == null) {
      var store = ls();
      if (store) {
        for (var i = 0; i < store.length; i++) {
          var full = store.key(i);
          if (full && full.indexOf(PREFIX) === 0) names.push(full.slice(PREFIX.length));
        }
      }
    } else if (typeof keys === 'string') {
      names = [keys];
    } else if (Array.isArray(keys)) {
      names = keys.slice();
    } else if (typeof keys === 'object') {
      names = Object.keys(keys);
      for (var k in keys) out[k] = keys[k]; // seed defaults
    }
    for (var j = 0; j < names.length; j++) {
      var val = readKey(names[j]);
      if (val !== undefined) out[names[j]] = val;
    }
    return out;
  }
  function fireChanged(changes) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](changes, 'local'); } catch (e) {}
    }
  }
  var local = {
    get: function (keys, cb) {
      var out = collect(keys);
      if (typeof cb === 'function') { cb(out); return; }      // callback form
      return Promise.resolve(out);                             // promise form
    },
    set: function (items, cb) {
      var changes = {};
      for (var k in items) {
        if (!Object.prototype.hasOwnProperty.call(items, k)) continue;
        var oldVal = readKey(k);
        writeKey(k, items[k]);
        changes[k] = { oldValue: oldVal, newValue: items[k] };
      }
      fireChanged(changes);
      if (typeof cb === 'function') { cb(); return; }
      return Promise.resolve();
    },
    remove: function (keys, cb) {
      var names = typeof keys === 'string' ? [keys] : (keys || []);
      var changes = {};
      for (var i = 0; i < names.length; i++) {
        var oldVal = readKey(names[i]);
        removeKey(names[i]);
        changes[names[i]] = { oldValue: oldVal, newValue: undefined };
      }
      fireChanged(changes);
      if (typeof cb === 'function') { cb(); return; }
      return Promise.resolve();
    }
  };
  var onChanged = {
    addListener: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    removeListener: function (fn) { listeners = listeners.filter(function (l) { return l !== fn; }); },
    hasListener: function (fn) { return listeners.indexOf(fn) !== -1; }
  };
  g.chrome = g.chrome || {};
  g.chrome.storage = g.chrome.storage || {};
  g.chrome.storage.local = local;
  g.chrome.storage.onChanged = onChanged;
  // Logout saves 'native' mode, and only the extension's toolbar popup can undo
  // that. Phones have no popup, so every page load starts back in Lintel.
  removeKey('lintel:uiMode');
})();


/* --- panel.css (legacy ?lintel=0 fallback styles) --- */


(function () {
  try {
    var s = document.createElement('style');
    s.setAttribute('data-rbs-userscript-panelcss', '1');
    s.textContent = "/*\n * content/panel.css\n *\n * Styles for the Lintel full-page app. These rules are injected\n * INTO the shadow root (as PANEL_CSS in panel.js), so they do not leak out onto\n * the WebForms page and the page styles do not leak in. :host targets the\n * shadow host element. This file is also listed in manifest content_scripts.css\n * so Chrome loads it as an extension resource; keep it in sync with PANEL_CSS.\n */\n\n:host {\n  all: initial;\n}\n\n:host {\n  /* Dark theme (default) */\n  --rbs-page: #0b0c0e;\n  --rbs-surface: #14161a;\n  --rbs-surface2: #1f2226;\n  --rbs-border: #2b2f36;\n  --rbs-border-hour: #3a3f48;\n  --rbs-primary-text: #e6e8eb;\n  --rbs-muted: #8b9199;\n  --rbs-accent: #c8102e; /* SIT red */\n  --rbs-free: #3fb950;\n  --rbs-taken: #7f2d2d;\n  --rbs-closed: #2a2d33;\n  --rbs-font: -apple-system, \"Segoe UI\", system-ui, sans-serif;\n  --rbs-font-mono: ui-monospace, \"SF Mono\", Monaco, \"Cascadia Mono\", monospace;\n  --rbs-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);\n  --rbs-gap: 12px;\n  --rbs-radius: 8px;\n  --rbs-cell-size: 32px;\n  --rbs-hour-height: 40px;\n  --rbs-row-height: 32px;\n  --rbs-topbar-height: 64px;\n  --rbs-status-height: 24px;\n}\n\n:host([data-theme=\"light\"]) {\n  /* Complete light theme block (unused by default) */\n  --rbs-page: #ffffff;\n  --rbs-surface: #f8f9fa;\n  --rbs-surface2: #e9ecef;\n  --rbs-border: #dee2e6;\n  --rbs-border-hour: #ced4da;\n  --rbs-primary-text: #212529;\n  --rbs-muted: #6c757d;\n  --rbs-accent: #0d6efd;\n  --rbs-free: #198754;\n  --rbs-taken: #dc3545;\n  --rbs-closed: #dee2e6;\n  --rbs-font: -apple-system, \"Segoe UI\", system-ui, sans-serif;\n  --rbs-font-mono: ui-monospace, \"SF Mono\", Monaco, \"Cascadia Mono\", monospace;\n  --rbs-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n  --rbs-gap: 12px;\n  --rbs-radius: 8px;\n  --rbs-cell-size: 32px;\n  --rbs-hour-height: 40px;\n  --rbs-row-height: 32px;\n  --rbs-topbar-height: 64px;\n  --rbs-status-height: 24px;\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n/* Full-page layout */\n.rbs-fullpage {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483000;\n  display: flex;\n  flex-direction: column;\n  background: var(--rbs-page);\n  color: var(--rbs-primary-text);\n  font-family: var(--rbs-font);\n  font-size: 13px;\n  line-height: 1.4;\n  overflow: hidden;\n}\n\n/* Top bar */\n.rbs-topbar {\n  height: var(--rbs-topbar-height);\n  display: flex;\n  align-items: center;\n  padding: 0 var(--rbs-gap);\n  background: var(--rbs-surface);\n  border-bottom: 1px solid var(--rbs-border);\n  gap: var(--rbs-gap);\n  flex-shrink: 0;\n}\n\n.rbs-brand {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-weight: 600;\n  color: var(--rbs-accent);\n  margin-right: 12px;\n}\n\n.rbs-brand-text {\n  font-size: 14px;\n}\n\n.rbs-brand-building {\n  font-size: 13px;\n  color: var(--rbs-primary-text);\n  margin-left: 4px;\n}\n\n.rbs-control-group {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.rbs-control-group select,\n.rbs-control-group input {\n  background: var(--rbs-surface2);\n  border: 1px solid var(--rbs-border);\n  color: var(--rbs-primary-text);\n  border-radius: var(--rbs-radius);\n  padding: 6px 8px;\n  font-size: 12px;\n  min-height: 28px;\n  appearance: none;\n  -webkit-appearance: none;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b9199' d='M2.5 4.5L6 8l3.5-3.5H2.5z'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat;\n  background-position: right 8px center;\n  padding-right: 28px;\n}\n\n.rbs-control-group select option {\n  background: var(--rbs-surface2);\n  color: var(--rbs-primary-text);\n}\n\n.rbs-control-group select:focus,\n.rbs-control-group input:focus {\n  outline: 2px solid var(--rbs-accent);\n  outline-offset: 0;\n}\n\n.rbs-capacity-input {\n  width: 80px;\n}\n\n.rbs-search-input {\n  width: 120px;\n}\n\n.rbs-date-chips {\n  display: flex;\n  gap: 4px;\n  overflow-x: auto;\n  padding: 2px;\n  scrollbar-width: none;\n}\n\n.rbs-date-chip {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 6px 8px;\n  background: var(--rbs-surface2);\n  border: 1px solid var(--rbs-border);\n  border-radius: var(--rbs-radius);\n  min-width: 70px;\n  cursor: pointer;\n  user-select: none;\n}\n\n.rbs-date-chip:hover {\n  background: var(--rbs-surface);\n}\n\n.rbs-date-chip.rbs-selected {\n  background: var(--rbs-accent);\n  color: white;\n  border-color: var(--rbs-accent);\n  font-weight: 600;\n  outline: 2px solid var(--rbs-accent);\n  outline-offset: -1px;\n}\n\n.rbs-date-weekday {\n  font-size: 10px;\n  font-weight: 600;\n  margin-bottom: 2px;\n}\n\n.rbs-date-label {\n  font-size: 11px;\n}\n\n.rbs-window-controls {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.rbs-window-select {\n  width: 88px;\n}\n\n.rbs-topbar-actions {\n  margin-left: auto;\n  display: flex;\n  gap: 8px;\n}\n\n.rbs-action-btn {\n  background: var(--rbs-surface2);\n  border: 1px solid var(--rbs-border);\n  color: var(--rbs-primary-text);\n  border-radius: var(--rbs-radius);\n  padding: 6px 12px;\n  font-size: 12px;\n  cursor: pointer;\n  min-height: 28px;\n  white-space: nowrap;\n  min-width: 60px;\n}\n\n.rbs-action-btn:hover {\n  background: var(--rbs-surface);\n}\n\n.rbs-action-btn.rbs-primary {\n  background: var(--rbs-accent);\n  color: white;\n  border-color: var(--rbs-accent);\n}\n\n.rbs-action-btn.rbs-primary:hover {\n  background: #d93046;\n}\n\n/* Main board area */\n.rbs-main {\n  flex: 1;\n  display: flex;\n  overflow: hidden;\n  position: relative;\n}\n\n.rbs-board-area {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.rbs-board-header {\n  height: var(--rbs-hour-height);\n  background: var(--rbs-surface);\n  border-bottom: 1px solid var(--rbs-border);\n  display: grid;\n  align-items: center;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n}\n\n.rbs-room-label {\n  padding: 0 12px;\n  font-family: var(--rbs-font-mono);\n  font-size: 12px;\n  color: var(--rbs-muted);\n  border-right: 1px solid var(--rbs-border);\n}\n\n.rbs-board-scroll {\n  flex: 1;\n  overflow: auto;\n  background-image: repeating-linear-gradient(to bottom, transparent 0 31px, var(--rbs-border) 31px 32px);\n}\n\n.rbs-board-rows {\n  display: flex;\n  flex-direction: column;\n}\n\n.rbs-board-row {\n  height: var(--rbs-row-height);\n  display: grid;\n  align-items: center;\n  border-bottom: 1px solid var(--rbs-border);\n}\n\n.rbs-room-info {\n  display: flex;\n  align-items: center;\n  padding: 0 8px;\n  gap: 5px;\n  min-width: 0;\n  overflow: hidden;\n  font-size: 12px;\n  border-right: 1px solid var(--rbs-border);\n}\n\n.rbs-room-code {\n  font-family: var(--rbs-font-mono);\n  color: var(--rbs-primary-text);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  min-width: 0;\n  line-height: 1.1;\n}\n\n.rbs-room-type {\n  color: var(--rbs-muted);\n  font-size: 11px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  max-width: 120px;\n}\n\n.rbs-room-cap {\n  background: var(--rbs-surface2);\n  color: var(--rbs-primary-text);\n  border-radius: 999px;\n  padding: 0 6px;\n  font-size: 10px;\n  font-weight: 600;\n  margin-left: auto;\n}\n\n.rbs-slot-cells {\n  display: grid;\n  gap: 1px;\n  height: 100%;\n  align-items: center;\n}\n\n.rbs-slot-cell {\n  height: 100%;\n  border-right: 1px solid var(--rbs-border);\n}\n\n.rbs-slot-cell.rbs-hour-boundary {\n  border-right-color: var(--rbs-border-hour);\n}\n\n.rbs-slot-cell.rbs-free {\n  background: var(--rbs-free);\n}\n\n.rbs-slot-cell.rbs-taken {\n  background: var(--rbs-taken);\n}\n\n.rbs-slot-cell.rbs-closed {\n  background: var(--rbs-closed);\n}\n\n.rbs-slot-cell.rbs-unknown {\n  background: var(--rbs-surface2);\n}\n\n.rbs-slot-cell.rbs-outside {\n  opacity: 0.3;\n}\n\n.rbs-slot-cell.rbs-selected {\n  outline: 2px solid var(--rbs-accent);\n  outline-offset: -1px;\n  z-index: 1;\n}\n\n.rbs-slot-cell.rbs-skel {\n  background: linear-gradient(90deg, var(--rbs-surface2) 25%, var(--rbs-surface) 37%, var(--rbs-surface2) 63%);\n  background-size: 400% 100%;\n  animation: rbs-shimmer 1.2s ease-in-out infinite;\n}\n\n/* Right drawer */\n.rbs-drawer {\n  width: 400px;\n  background: var(--rbs-surface);\n  border-left: 1px solid var(--rbs-border);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.rbs-drawer.rbs-collapsed {\n  width: 0;\n  border-left: none;\n}\n\n.rbs-drawer-header {\n  padding: var(--rbs-gap);\n  border-bottom: 1px solid var(--rbs-border);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.rbs-drawer-title {\n  font-weight: 600;\n  font-size: 14px;\n}\n\n.rbs-drawer-toggle {\n  background: none;\n  border: none;\n  color: var(--rbs-muted);\n  cursor: pointer;\n  padding: 4px;\n}\n\n.rbs-drawer-content {\n  flex: 1;\n  padding: var(--rbs-gap);\n  overflow-y: auto;\n}\n\n.rbs-selected-room {\n  margin-bottom: var(--rbs-gap);\n}\n\n.rbs-room-title {\n  font-weight: 600;\n  font-size: 16px;\n  margin-bottom: 4px;\n}\n\n.rbs-room-subtitle {\n  font-size: 12px;\n  color: var(--rbs-muted);\n  margin-bottom: 8px;\n}\n\n.rbs-window-info {\n  background: var(--rbs-surface2);\n  border-radius: var(--rbs-radius);\n  padding: var(--rbs-gap);\n  margin-bottom: var(--rbs-gap);\n}\n\n.rbs-window-label {\n  font-size: 11px;\n  color: var(--rbs-muted);\n  margin-bottom: 4px;\n}\n\n.rbs-window-value {\n  font-family: var(--rbs-font-mono);\n  font-size: 14px;\n  margin-bottom: 8px;\n}\n\n.rbs-slot-count {\n  font-size: 12px;\n  color: var(--rbs-muted);\n}\n\n.rbs-conflict-note {\n  background: rgba(139, 58, 58, 0.1);\n  border: 1px solid var(--rbs-taken);\n  border-radius: var(--rbs-radius);\n  padding: 8px;\n  margin-bottom: var(--rbs-gap);\n  font-size: 12px;\n  color: #ff6b6b;\n}\n\n.rbs-drawer-actions {\n  display: flex;\n  gap: 8px;\n  margin-top: var(--rbs-gap);\n}\n\n.rbs-drawer-btn {\n  flex: 1;\n  padding: 10px;\n  border-radius: var(--rbs-radius);\n  border: none;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.rbs-drawer-btn.rbs-primary {\n  background: var(--rbs-accent);\n  color: white;\n}\n\n.rbs-drawer-btn.rbs-secondary {\n  background: var(--rbs-surface2);\n  color: var(--rbs-primary-text);\n  border: 1px solid var(--rbs-border);\n}\n\n/* Status bar */\n.rbs-statusbar {\n  height: var(--rbs-status-height);\n  background: var(--rbs-surface);\n  border-top: 1px solid var(--rbs-border);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 var(--rbs-gap);\n  font-family: var(--rbs-font-mono);\n  font-size: 11px;\n  color: var(--rbs-muted);\n  flex-shrink: 0;\n  overflow: hidden;\n  white-space: nowrap;\n}\n\n.rbs-stats {\n  display: flex;\n  gap: 12px;\n}\n\n.rbs-error-indicator {\n  color: #ff6b6b;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.rbs-retry-btn {\n  background: none;\n  border: none;\n  color: var(--rbs-accent);\n  cursor: pointer;\n  text-decoration: underline;\n  font-family: inherit;\n  font-size: inherit;\n  padding: 0;\n  margin: 0;\n}\n\n/* Fallback banner */\n.rbs-fallback-banner {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  background: #8a1c13;\n  color: white;\n  padding: 8px var(--rbs-gap);\n  font-size: 12px;\n  z-index: 2147483001;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.rbs-fallback-close {\n  background: none;\n  border: none;\n  color: white;\n  cursor: pointer;\n  padding: 0 4px;\n}\n\n/* Keyboard hint */\n.rbs-keyboard-hint {\n  position: fixed;\n  bottom: 40px;\n  right: 20px;\n  background: var(--rbs-surface);\n  border: 1px solid var(--rbs-border);\n  border-radius: var(--rbs-radius);\n  padding: 8px;\n  font-size: 11px;\n  color: var(--rbs-muted);\n  z-index: 2147483001;\n}\n\n/* Animations */\n@keyframes rbs-shimmer {\n  0% {\n    background-position: 100% 0;\n  }\n  100% {\n    background-position: 0 0;\n  }\n}\n\n/* Responsive */\n@media (max-width: 1279px) {\n  .rbs-topbar {\n    flex-wrap: wrap;\n    height: auto;\n    padding: 8px;\n  }\n  \n  .rbs-date-chips {\n    order: 1;\n    width: 100%;\n    margin-top: 8px;\n  }\n}\n\n@media (max-width: 900px) {\n  .rbs-drawer {\n    position: fixed;\n    inset: 0;\n    width: 100%;\n    z-index: 20;\n  }\n  \n  .rbs-drawer.rbs-collapsed {\n    display: none;\n  }\n}\n\n.rbs-book-note.rbs-visible {\n  display: block;\n}\n\n.rbs-book-note.rbs-error {\n  background: #fdecea;\n  color: #8a1c13;\n}\n\n/* Launcher button injected on non-search RBS pages. */\n.rbs-launcher {\n  position: fixed;\n  bottom: 22px;\n  right: 22px;\n  z-index: 2147483000;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica,\n    Arial, sans-serif;\n}\n\n.rbs-launcher a {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  background: #2a6f97;\n  color: #fff;\n  text-decoration: none;\n  font-size: 13px;\n  font-weight: 600;\n  padding: 10px 16px;\n  border-radius: 999px;\n  box-shadow: 0 8px 22px rgba(16, 24, 40, 0.22);\n}\n\n.rbs-launcher a:hover {\n  background: #1b4965;\n}\n/* App visibility with native UI toggle */\n.rbs-fullpage.rbs-app-hidden {\n  display: none !important;\n}\n\n/* Legend */\n.rbs-legend {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-left: auto;\n  margin-right: 12px;\n  font-size: 11px;\n  color: var(--rbs-muted);\n}\n\n.rbs-legend-dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n}\n\n.rbs-legend-dot.rbs-free-dot {\n  background-color: var(--rbs-free);\n}\n\n.rbs-legend-dot.rbs-closed-dot {\n  background-color: var(--rbs-closed);\n  border: 1px solid var(--rbs-border);\n}\n\n.rbs-legend-dot.rbs-taken-dot {\n  background-color: var(--rbs-taken);\n}";
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();


/* --- content/native.js (pure data/parse/queue layer) --- */

/*
 * content/native.js
 *
 * The API + parsing layer for SIT Lintel.
 *
 * Everything meaningful here is a PURE function so it can run in both the
 * browser (as a content script) and in Node (for `node --test tests/`).
 *
 * RBS exposes two JSON endpoints that the content script hits directly as
 * same-origin POSTs (no postback, no VIEWSTATE, no page navigation):
 *
 *   1) POST /SRB001/SearchSRB001List
 *        -> JSON array of rooms for a date/window/type/building/capacity.
 *   2) POST /SRB001/GetTimeSlotListByresidNdatetime
 *        -> JSON array of 30-minute slots for ONE room on a date/window.
 *
 * Both are sent with
 *   Content-Type: application/x-www-form-urlencoded; charset=UTF-8
 *   X-Requested-With: XMLHttpRequest
 * and carry a fresh `__RequestVerificationToken` read from the hidden input on
 * the page right before each call.
 *
 * Performance facts that dictate the architecture (measured on the live site):
 *   - SearchSRB001List: ~1.8-2.3 s.
 *   - GetTimeSlotListByresidNdatetime: ~2.1-2.2 s PER ROOM.
 *   - Requests DO NOT parallelise: the server serialises per session, so 6
 *     concurrent slot calls took ~13.7 s while 2 sequential took ~4.3 s.
 *     => exactly ONE slot request in flight at any time. Never Promise.all.
 *
 * This file provides the pure building blocks. panel.js owns the DOM, the
 * single-flight queue, the cache, the generation counter and the Book action.
 */

'use strict';

/** The native control ids the extension reads from. */
const RBS_CONTROL_IDS = Object.freeze({
  resourceType: 'resourceType',
  date: 'searchSlotDate',
  start: 'SearchHoursFrom',
  end: 'SearchHoursTo',
  status: 'bookingstatus',
  capacity: 'srcCapacity',
  capacityOperator: 'srcCapacityOperator',
  campus: 'campus',
  building: 'building',
  facilities: 'facilities',
  searchButton: 'btnBookingMainSearch',
});

/** The two JSON endpoints (same-origin paths). */
const RBS_ENDPOINTS = Object.freeze({
  searchList: '/SRB001/SearchSRB001List',
  slotList: '/SRB001/GetTimeSlotListByresidNdatetime',
});

/** Default day window used by the board. */
const DEFAULT_WINDOW = Object.freeze({ start: '07:00', end: '22:30' });

/** SLT_STATUS mapping, verified live: 1 = free, 3 = taken, else unknown. */
// Live mapping: 1 = free, 3 = booked, 7 = unavailable for this user (quota /
// permission / not bookable) - verified against the site. Everything else unknown.
const SLOT_STATUS = Object.freeze({ FREE: 1, TAKEN: 3, UNAVAILABLE: 7 });
// 7 is NOT "booked" - it is "not open for booking" (past/weekend/permission).
// Rendering it as taken painted whole closed days red.

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format a Date as the RBS date-input format, e.g. "24 Oct 2026".
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('formatDate: expected a valid Date');
  }
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a time window for display, e.g. "07:00–22:30" (en dash).
 * @param {string} start "HH:MM"
 * @param {string} end   "HH:MM"
 * @returns {string}
 */
function formatWindow(start, end) {
  return `${start}\u2013${end}`;
}

/**
 * Convert a "HH:MM" string to minutes since midnight. Returns NaN if malformed.
 * @param {string} hhmm
 * @returns {number}
 */
function timeToMinutes(hhmm) {
  if (typeof hhmm !== 'string') return NaN;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return NaN;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (hours > 23 || mins > 59) return NaN;
  return hours * 60 + mins;
}

/**
 * Convert minutes-since-midnight to a zero-padded "HH:MM" label.
 * @param {number} mins
 * @returns {string}
 */
function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${h}:${mm}`;
}

/**
 * Collapse whitespace in a string and trim.
 * @param {string} s
 * @returns {string}
 */
function normalizeText(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

// --- Payload builders --------------------------------------------------------

/**
 * Build the exact x-www-form-urlencoded field object for
 * POST /SRB001/SearchSRB001List.
 *
 * Every documented key is present; empty string is allowed. `ResourceType` is
 * the option TEXT (e.g. "Discussion Room"); `''` means all types.
 * `bookingstatus` AND `BookingStatus` are BOTH set and equal.
 *
 * @param {object} fields
 * @param {string} fields.token           __RequestVerificationToken (fresh)
 * @param {string} [fields.capacityOperator]
 * @param {string} [fields.singleCapacity]
 * @param {string} [fields.minCapacity]
 * @param {string} [fields.maxCapacity]
 * @param {string} [fields.campusID]
 * @param {string} [fields.buildingID]
 * @param {string} [fields.status]        "All" | "Available"
 * @param {string} [fields.facilities]
 * @param {string} [fields.search]        free-text substring
 * @param {string} fields.resourceType    option TEXT, '' for all
 * @param {string} fields.date            "24 Oct 2026"
 * @param {string} fields.start           "HH:MM"
 * @param {string} fields.end             "HH:MM"
 * @returns {Object<string,string>}
 */
function buildSearchPayload(fields) {
  fields = fields || {};
  const str = (v) => (v == null ? '' : String(v));
  const status = fields.status === 'All' ? 'All' : fields.status === 'Available' ? 'Available' : str(fields.status);

  return {
    __RequestVerificationToken: str(fields.token),
    CapacityOperator: str(fields.capacityOperator),
    SingleCapacity: str(fields.singleCapacity),
    MinCapacity: str(fields.minCapacity),
    MaxCapacity: str(fields.maxCapacity),
    campusID: str(fields.campusID),
    buildingID: str(fields.buildingID),
    bookingstatus: status,
    BookingStatus: status,
    faciequip: str(fields.facilities),
    Search: str(fields.search),
    ResourceType: str(fields.resourceType),
    Location: '',
    LocationID: '',
    SearchDate: str(fields.date),
    SearchStartTime: str(fields.start),
    SearchEndTime: str(fields.end),
  };
}

/**
 * Build the exact field object for
 * POST /SRB001/GetTimeSlotListByresidNdatetime for ONE room.
 *
 * `BKG_RUL` and `IS_SLD_Resource` come from the room record. `bookingstatus`
 * is always `All` (it returns every slot with a status).
 *
 * @param {object} room   parseRooms() record ({id, typeId, isBkgrul, isSld, ...})
 * @param {string} date   "24 Oct 2026"
 * @param {{start:string,end:string}} window
 * @param {string} [status]  defaults to 'All'
 * @param {string} [token]   __RequestVerificationToken (fresh)
 * @returns {Object<string,string>}
 */
function buildSlotPayload(room, date, window, status, token) {
  room = room || {};
  window = window || {};
  const str = (v) => (v == null ? '' : String(v));
  const boolStr = (v) => (v === true ? 'true' : v === false ? 'false' : str(v));

  return {
    __RequestVerificationToken: str(token),
    rsrcID: str(room.id),
    rsrctypID: str(room.typeId),
    bookingstatus: status === 'Available' ? 'Available' : 'All',
    SearchDate: str(date),
    SearchStartTime: str(window.start),
    SearchEndTime: str(window.end),
    BKG_RUL: boolStr(room.isBkgrul),
    IS_SLD_Resource: boolStr(room.isSld),
  };
}

/**
 * Encode a field object as an application/x-www-form-urlencoded body string.
 * @param {Object<string,string>} fields
 * @returns {string}
 */
function encodeForm(fields) {
  return Object.keys(fields)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(fields[k] == null ? '' : fields[k]))
    .join('&');
}

// --- Response parsers --------------------------------------------------------

/**
 * Parse the room-search JSON into the fields the board needs, in API order.
 *
 * @param {Array|string} json  parsed array or a JSON string
 * @returns {Array<{id:string,name:string,type:string,capacity:number,
 *   building:string,isBkgrul:boolean,isSld:boolean,bookable:boolean,
 *   permitted:boolean,typeId:string}>}
 */
function parseRooms(json) {
  const arr = typeof json === 'string' ? JSON.parse(json) : json;
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => ({
    id: String(r.RSRC_ID == null ? '' : r.RSRC_ID),
    name: normalizeText(r.RSRC_NAME),
    serial: normalizeText(r.SERIAL_NUM),
    capacity: Number(r.CAPACITY) || 0,
    typeId: String(r.RSRC_TYP_ID == null ? '' : r.RSRC_TYP_ID),
    type: normalizeText(r.RSRC_TYP_NAME),
    building: normalizeText(r.BLDNG_NAME),
    isBkgrul: r.IS_BKGRUL === true,
    isSld: r.IS_SLD === true,
    bookable: r.IS_BOOKABLE === true,
    permitted: r.IS_PERMITTED === true,
    eventType: r.Event_Type,
    paragraph: normalizeText(r.Paragraph),
    disclaimer: normalizeText(r.DISCLAIMER),
  }));
}

/**
 * Classify a single SLT_STATUS value. 1 = free, 3 = taken, else unknown.
 * @param {number} status
 * @returns {"free"|"taken"|"unknown"}
 */
function classifySlotStatus(status) {
  const n = Number(status);
  if (n === SLOT_STATUS.FREE) return 'free';
  if (n === SLOT_STATUS.TAKEN) return 'taken';
  if (n === SLOT_STATUS.UNAVAILABLE) return 'closed';
  return 'unknown';
}

/**
 * Parse the slot JSON for one room into normalized slot records.
 *
 * `canBooked` is intentionally ignored (it was false on every live probe).
 *
 * @param {Array|string} json
 * @returns {Array<{time:string,status:number,state:string,sltId:string,
 *   dateTime:string,quota:number}>}
 */
function parseSlots(json) {
  const arr = typeof json === 'string' ? JSON.parse(json) : json;
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => {
    const status = Number(s.SLT_STATUS);
    // SLT_Desc is the "HH:MM" label; fall back to SLT_Time ("1400" -> "14:00").
    let time = normalizeText(s.SLT_Desc);
    if (!/^\d{2}:\d{2}$/.test(time)) {
      const raw = String(s.SLT_Time == null ? '' : s.SLT_Time).padStart(4, '0');
      time = raw.slice(0, 2) + ':' + raw.slice(2);
    }
    return {
      time,
      status,
      state: classifySlotStatus(status),
      sltId: String(s.SLT_ID == null ? '' : s.SLT_ID),
      dateTime: String(s.SLT_Date_Time == null ? '' : s.SLT_Date_Time),
      quota: Number(s.Quota) || 0,
    };
  });
}

// --- Axis + alignment --------------------------------------------------------

/**
 * Build the shared half-hour time axis for a day window.
 *
 * For "07:00"-"22:30" this returns 30 labels starting "07:00" and ending
 * "21:30" (the last 30-minute slot BEGINS at 21:30 and runs to 22:00; the end
 * bound is exclusive of a slot that starts at it, matching the live API which
 * returned 30 entries for 07:00-22:30).
 *
 * @param {string} start "HH:MM"
 * @param {string} end   "HH:MM"
 * @returns {string[]}
 */
function buildSlotAxis(start, end) {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (isNaN(startMin)) throw new Error(`buildSlotAxis: invalid start "${start}"`);
  if (isNaN(endMin)) throw new Error(`buildSlotAxis: invalid end "${end}"`);
  // The axis labels are slot START times. The final slot starts one hour before
  // the window end: the API returns 30 slots for 07:00-22:30 and the last one
  // begins at 21:30 (runs 21:30-22:00). So the last label is `end - 60 min`.
  const out = [];
  for (let m = startMin; m <= endMin - 60; m += 30) {
    out.push(minutesToTime(m));
  }
  return out;
}

/**
 * Align parsed slots onto an axis: exactly one cell per axis label, in axis
 * order. A label with no matching slot becomes `null` (API returned nothing
 * for it). The axis length is never changed.
 *
 * @param {string[]} axis   labels from buildSlotAxis
 * @param {Array<{time:string}>} slots  parseSlots output (any order)
 * @returns {Array<object|null>}
 */
function alignSlots(axis, slots) {
  const byTime = new Map();
  for (const s of Array.isArray(slots) ? slots : []) {
    if (s && typeof s.time === 'string' && !byTime.has(s.time)) {
      byTime.set(s.time, s);
    }
  }
  return (Array.isArray(axis) ? axis : []).map((label) =>
    byTime.has(label) ? byTime.get(label) : null
  );
}

/**
 * Build block models for rendering: one per room, in the order given, each
 * carrying its aligned cells (or all-null skeleton cells when slots are not yet
 * loaded for that room).
 *
 * @param {Array} rooms                 parseRooms output
 * @param {Object<string,Array>} slotsByRoomId  rsrcId -> parseSlots output
 * @param {string[]} axis               buildSlotAxis output
 * @returns {Array<{id,name,type,capacity,building,isBkgrul,loaded,cells}>}
 */
function buildBoardModel(rooms, slotsByRoomId, axis) {
  slotsByRoomId = slotsByRoomId || {};
  const safeAxis = Array.isArray(axis) ? axis : [];
  return (Array.isArray(rooms) ? rooms : []).map((room) => {
    const slots = slotsByRoomId[room.id];
    const loaded = Array.isArray(slots);
    const cells = loaded
      ? alignSlots(safeAxis, slots)
      : safeAxis.map(() => null);
    return {
      id: room.id,
      name: room.name,
      type: room.type,
      capacity: room.capacity,
      building: room.building,
      isBkgrul: room.isBkgrul,
      loaded,
      cells,
    };
  });
}

/**
 * Decide what an empty-ish board means, from counts.
 *
 *   - 0 rooms from the search              -> "no rooms match these filters"
 *   - rooms exist but every cell is taken  -> "all slots taken in this window"
 *   - otherwise                            -> "has availability"
 *
 * `cells` may be given as a count of free cells, or as an array/matrix of cell
 * states; we only need to know whether ANY cell is free.
 *
 * @param {object} arg
 * @param {number} arg.rooms           number of rooms returned
 * @param {number|Array|string} [arg.cells]  free-cell signal (see above)
 * @returns {"no rooms match these filters"|"all slots taken in this window"|"has availability"}
 */
function classifyEmpty(arg) {
  arg = arg || {};
  const rooms = Number(arg.rooms) || 0;
  if (rooms <= 0) return 'no rooms match these filters';

  const anyFree = hasAnyFreeCell(arg.cells);
  if (!anyFree) return 'all slots taken in this window';
  return 'has availability';
}

/**
 * True if the given cells signal contains at least one free cell.
 * Accepts: a number (free-cell count), a flat array of cells/states, or a
 * nested array (per-room rows) of cells/states.
 * @param {number|Array|undefined} cells
 * @returns {boolean}
 */
function hasAnyFreeCell(cells) {
  if (typeof cells === 'number') return cells > 0;
  if (!Array.isArray(cells)) return false;
  for (const item of cells) {
    if (Array.isArray(item)) {
      if (hasAnyFreeCell(item)) return true;
    } else if (isFreeCell(item)) {
      return true;
    }
  }
  return false;
}

/** Is a single cell (object, state string, or status number) free? */
function isFreeCell(cell) {
  if (cell == null) return false;
  if (typeof cell === 'string') return cell === 'free';
  if (typeof cell === 'number') return cell === SLOT_STATUS.FREE;
  if (typeof cell === 'object') return cell.state === 'free' || cell.status === SLOT_STATUS.FREE;
  return false;
}

// --- Single-flight slot-loading queue ---------------------------------------

/**
 * Build the cache key for one room's slots: `rsrcId|date|window|status`.
 * @param {string} roomId
 * @param {string} date
 * @param {{start:string,end:string}} window
 * @param {string} status
 * @returns {string}
 */
function slotCacheKey(roomId, date, window, status) {
  const w = window ? `${window.start}-${window.end}` : '';
  return `${roomId}|${date}|${w}|${status}`;
}

/**
 * Create a single-flight slot-loading queue.
 *
 * This is the CORE of the feature and is kept pure/injectable so it can be
 * tested under Node without a DOM:
 *   - `fetcher(room)` -> Promise resolving to that room's slots (already
 *     parsed). It is the ONLY place a network call happens. The queue
 *     guarantees at most ONE fetcher call is in flight at any moment (the
 *     server serialises per session, so parallelism only hurts).
 *   - responses are cached by `slotCacheKey`; a cached room is NEVER re-fetched.
 *   - a generation counter: bumping it abandons in-flight/queued work so stale
 *     responses are discarded instead of painted.
 *
 * @param {object} opts
 * @param {(room:object)=>Promise<Array>} opts.fetcher
 * @param {string} opts.date
 * @param {{start:string,end:string}} opts.window
 * @param {string} opts.status
 * @param {(roomId:string, slots:Array)=>void} [opts.onLoaded]   painted (fresh gen) only
 * @param {(roomId:string, error:Error)=>void} [opts.onError]
 * @param {(done:number, total:number)=>void} [opts.onProgress]
 * @param {Map} [opts.cache]   shared cache (created if omitted)
 * @returns {{enqueue, prioritize, bumpGeneration, generation, run, cache, stats}}
 */
function createSlotQueue(opts) {
  opts = opts || {};
  const fetcher = opts.fetcher;
  if (typeof fetcher !== 'function') {
    throw new Error('createSlotQueue: fetcher is required');
  }
  const date = opts.date;
  const window = opts.window;
  const status = opts.status || 'All';
  const cache = opts.cache instanceof Map ? opts.cache : new Map();
  const onLoaded = typeof opts.onLoaded === 'function' ? opts.onLoaded : () => {};
  const onError = typeof opts.onError === 'function' ? opts.onError : () => {};
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  const onDone = typeof opts.onDone === 'function' ? opts.onDone : () => {};

  let generation = 0;
  let inFlight = 0; // concurrency gauge; MUST never exceed 1
  let running = false;
  let queue = []; // room objects, DOM order
  let total = 0;
  let done = 0;

  const stats = { maxInFlight: 0, fetches: 0 };

  function enqueue(rooms) {
    for (const r of Array.isArray(rooms) ? rooms : [rooms]) {
      queue.push(r);
      total += 1;
    }
  }

  // Move a room (by id) to the front of the queue so a viewport block jumps it.
  function prioritize(roomId) {
    const idx = queue.findIndex((r) => r.id === roomId);
    if (idx > 0) {
      const [r] = queue.splice(idx, 1);
      queue.unshift(r);
    }
  }

  function bumpGeneration() {
    generation += 1;
    // Abandon everything queued: a fresh load must be re-enqueued by the caller.
    queue = [];
    total = done;
    return generation;
  }

  function key(room) {
    return slotCacheKey(room.id, date, window, status);
  }

  // Drain the queue one request at a time. Safe to call repeatedly; it no-ops
  // if already draining.
  async function run() {
    if (running) return;
    running = true;
    const myGen = generation;

    try {
      while (queue.length > 0) {
        // Generation changed out from under us -> abandon this drain.
        if (generation !== myGen) return;

        const room = queue.shift();
        const k = key(room);

        // Cache hit: never re-fetch.
        if (cache.has(k)) {
          done += 1;
          onProgress(done, total);
          onLoaded(room.id, cache.get(k));
          continue;
        }

        // Single-flight: exactly one fetcher invocation at a time.
        inFlight += 1;
        if (inFlight > stats.maxInFlight) stats.maxInFlight = inFlight;
        stats.fetches += 1;

        let slots = null;
        let err = null;
        try {
          slots = await fetcher(room);
        } catch (e) {
          err = e instanceof Error ? e : new Error(String(e));
        } finally {
          inFlight -= 1;
        }

        // If the generation moved while this request was in flight, the
        // response is STALE: cache it (still valid data) but do NOT paint.
        const stale = generation !== myGen;

        if (err) {
          if (!stale) {
            done += 1;
            onProgress(done, total);
            onError(room.id, err);
          }
          continue;
        }

        cache.set(k, slots);
        if (stale) return; // abandon the rest of this drain quietly
        done += 1;
        onProgress(done, total);
        onLoaded(room.id, slots);
      }
    } finally {
      running = false;
      if (generation === myGen) onDone({ done, total });
    }
  }

  return {
    enqueue,
    prioritize,
    bumpGeneration,
    run,
    cache,
    stats,
    get generation() {
      return generation;
    },
    get inFlight() {
      return inFlight;
    },
    get remaining() {
      return queue.length;
    },
  };
}

// --- New functions for full-page UI -----------------------------------------

/** CSS selectors for hiding native UI containers (must NOT hide modals). */
const NATIVE_HIDE_SELECTORS = Object.freeze([
  'header', 'nav', 'footer', '.body-content', '#divRoomInfo',
  '#divSearchContentResult', '#divbtnbottom',
]);

/** Forbidden click IDs — NEVER submit a booking. */
const FORBIDDEN_CLICK_IDS = Object.freeze([
  'btnBookingSave', 'btnConfirmBookingSave', 'btnBookingNext', 'btnBooking',
  'btnBookingMainClear', 'btnMultipleBookingConfirm', 'btnMultipleBookingConfirmSave',
]);

/** Weekday initials: Sun, Mon, Tue, Wed, Thu, Fri, Sat */
const WEEKDAY_INITIALS = Object.freeze(['S', 'M', 'T', 'W', 'T', 'F', 'S']);

/**
 * Build date chips for the next N days.
 * @param {Date} startDate  base date (today)
 * @param {number} count    how many chips to produce
 * @returns {Array<{date:Date,label:string,weekday:string,isToday:boolean}>}
 */
function buildDateChips(startDate, count) {
  const chips = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const day = d.getDate();
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    const weekday = WEEKDAY_INITIALS[d.getDay()];
    chips.push({
      date: d,
      label: `${day} ${month} ${year}`,
      weekday,
      isToday: i === 0,
    });
  }
  return chips;
}

/**
 * Convert a cell range (start,end indices) to a time window.
 * @param {string[]} axis    buildSlotAxis output
 * @param {number} fromIdx   inclusive start index (0-based)
 * @param {number} toIdx     inclusive end index
 * @returns {{start:string,end:string,count:number}}
 */
function rangeToWindow(axis, fromIdx, toIdx) {
  if (!Array.isArray(axis) || axis.length === 0) {
    return { start: '', end: '', count: 0 };
  }
  const startIdx = Math.max(0, Math.min(fromIdx, toIdx));
  const endIdx = Math.min(axis.length - 1, Math.max(fromIdx, toIdx));
  const start = axis[startIdx];
  let end = axis[endIdx];
  // The slot that starts at `end` runs for 30 min, so the window ends at its end time.
  const endMin = timeToMinutes(end);
  if (!isNaN(endMin)) {
    end = minutesToTime(endMin + 30);
  }
  return { start, end, count: endIdx - startIdx + 1 };
}

/**
 * Does a range contain at least one taken slot?
 * @param {Array<object|null>} slots    alignSlots output (may contain nulls)
 * @param {number} fromIdx              inclusive start index
 * @param {number} toIdx                inclusive end index
 * @returns {boolean}
 */
function rangeHasConflict(slots, fromIdx, toIdx) {
  if (!Array.isArray(slots)) return false;
  const start = Math.max(0, Math.min(fromIdx, toIdx));
  const end = Math.min(slots.length - 1, Math.max(fromIdx, toIdx));
  for (let i = start; i <= end; i++) {
    const s = slots[i];
    if (s && s.state === 'taken') return true;
  }
  return false;
}

/**
 * Map a key to an action, ignoring while an input is focused.
 * @param {string} key          lowercase key (e.g., 'j')
 * @param {object} context
 * @param {boolean} [context.inInput]  true if focus is inside an input/textarea/select
 * @returns {string|null}       action name or null for no-op
 */
function keyToAction(key, context) {
  if (context && context.inInput) return null;
  const map = {
    '/': 'focusSearch',
    'j': 'rowDown',
    'k': 'rowUp',
    'enter': 'handoff',
    'd': 'toggleNative',
    'escape': 'clear',
  };
  return map[key] || null;
}

/**
 * Should we reveal the native UI after consecutive failures?
 * @param {object} arg
 * @param {number} arg.consecutiveFailures
 * @returns {boolean}
 */
function shouldRevealNative(arg) {
  return (arg.consecutiveFailures || 0) >= 3;
}

/**
 * Should we reveal native UI based on a self-check result?
 * @param {{ok: boolean, missing: string[]}} check
 * @returns {boolean}
 */
function shouldRevealNativeOnFailure(check) {
  return check ? check.ok === false : false;
}

/**
 * Filter rooms based on capacity and equipment rules.
 * When roomType is empty (All rooms), filter out equipment:
 * - Equipment has capacity 0 AND type is not in facilityTypes list
 * - Rooms with capacity 0 BUT type in facilityTypes list are kept
 * @param {Array} rooms parseRooms output
 * @param {string} roomType selected room type (empty for All rooms)
 * @param {number} minCapacity minimum capacity filter
 * @param {Array<string>} facilityTypes list of facility types from #resourceType
 * @returns {Array} filtered rooms
 */
function filterRooms(rooms, roomType, minCapacity, facilityTypes) {
  if (!Array.isArray(rooms)) return [];
  return rooms.filter((r) => {
    // Capacity filter
    if (r.capacity < minCapacity) return false;
    
    // When room type is "All rooms", filter out equipment
    if (roomType === '') {
      // Equipment has capacity 0 AND type is not a facility type
      if (r.capacity === 0 && r.type) {
        const isFacilityType = facilityTypes.includes(r.type);
        if (!isFacilityType) {
          return false; // Filter out equipment
        }
      }
    }
    
    return true;
  });
}

// --- Axis grid helpers ------------------------------------------------------

/**
 * Return the grid-template-columns value for both header and rows.
 * @param {string[]} axis buildSlotAxis output
 * @returns {string}
 */
function axisGridTemplate(axis) {
  if (!Array.isArray(axis)) return '180px';
  return `200px repeat(${axis.length}, minmax(0, 1fr))`;
}

/**
 * Build hour axis header cells.
 * @param {string[]} axis buildSlotAxis output
 * @returns {Array<{isHour: boolean, label: string}>}
 */
function buildAxisHeaderCells(axis) {
  if (!Array.isArray(axis)) return [];
  return axis.map(label => ({
    isHour: /:00$/.test(label),
    label
  }));
}

// --- Self-check for panel.js UI references ---------------------------------

/**
 * Validate UI references object for required keys and element properties.
 * Returns {ok: boolean, missing: string[]} listing keys that are null/undefined
 * or elements missing the required properties (e.g., addEventListener).
 * @param {object} refs
 * @returns {{ok: boolean, missing: string[]}}
 */
function selfCheck(refs) {
  if (!refs || typeof refs !== 'object') {
    return { ok: false, missing: ['refs (null or non-object)'] };
  }
  
  const required = [
    'host', 'topbar', 'buildingSelect', 'typeSelect', 'capInput', 'searchInput',
    'dateChips', 'startSelect', 'endSelect', 'sortSelect', 'refreshBtn', 
    'nativeBtn', 'boardHeader', 'boardRows', 'statusBar'
  ];
  
  const missing = [];
  
  for (const key of required) {
    const val = refs[key];
    if (val == null) {
      missing.push(key);
      continue;
    }
    
    // For element references, verify they're actually DOM elements
    // Only check addEventListener for elements that need it
    if (key === 'dateChips') {
      // dateChips is a container div, doesn't need addEventListener
    } else if (key !== 'host' && key !== 'topbar' && key !== 'boardHeader' && 
        key !== 'boardRows' && key !== 'statusBar') {
      // Inputs, selects, buttons need addEventListener
      if (typeof val.addEventListener !== 'function') {
        missing.push(`${key} (not a DOM element)`);
      }
    }
  }
  
  return { ok: missing.length === 0, missing };
}

// --- New helper functions for Shoelace adoption ------------------------------

/**
 * Check if Shoelace components are available.
 * @returns {boolean}
 */
function hasShoelace() {
  // Chrome gives a content-script isolated world a NULL custom element
  // registry: `typeof window.customElements` is 'object' but its value is
  // null (the real CustomElementRegistry only lives in the MAIN world). A
  // plain `typeof customElements === 'undefined'` guard sails right over
  // that null, so we must require the registry to be truthy, expose a
  // `get` function, and actually resolve sl-button before trusting it.
  try {
    if (!customElements) return false;
    if (typeof customElements.get !== 'function') return false;
    return typeof customElements.get('sl-button') === 'function';
  } catch (_err) {
    return false;
  }
}

/**
 * Determine default form values based on native page state.
 * Returns the first concrete room type and the native building when present,
 * and falls back to 'All rooms' + empty building when native state is empty.
 * @param {object} nativeState
 * @param {string[]} nativeState.roomTypes - Available room types from the page
 * @param {string} nativeState.building - Current building value from native page
 * @param {string} nativeState.buildingName - Current building name
 * @returns {{roomType: string, building: string, buildingName: string}}
 */
function defaultForm(nativeState) {
  const { roomTypes = [], building = '', buildingName = '' } = nativeState || {};
  
  // Find first concrete room type (not empty string)
  const firstConcreteType = roomTypes.find(t => t && t.trim() !== '') || '';
  
  return {
    roomType: firstConcreteType,
    building,
    buildingName
  };
}

/**
 * Generate status bar text based on loading state.
 * @param {object} state
 * @param {number} state.loaded - Number of rooms loaded
 * @param {number} state.total - Total number of rooms
 * @param {number} state.inFlight - Number of requests in flight (0 or 1)
 * @param {number} state.failed - Number of failed room loads
 * @returns {string}
 */
function queueStatus({ loaded = 0, total = 0, inFlight = 0, failed = 0 }) {
  if (total === 0) {
    return '0 rooms';
  }
  
  const parts = [];
  
  // Show total rooms and loading progress
  if (loaded + failed >= total) {
    // All rooms accounted for
    parts.push(`${loaded}/${total} rooms loaded`);
  } else {
    // Still loading
    parts.push(`${total} rooms · loading slots ${loaded}/${total}`);
  }
  
  if (inFlight > 0) {
    parts.push(`${inFlight} request${inFlight !== 1 ? 's' : ''} in flight`);
  } else if (loaded + failed >= total) {
    // All rooms accounted for (loaded or failed)
    if (failed > 0) {
      parts.push(`${failed} failed`);
    } else {
      parts.push('Done');
    }
  } else {
    // Still loading, not all rooms accounted for, no requests in flight
    parts.push('idle');
  }
  
  return parts.join(' · ');
}

// --- Exports: browser (globalThis) AND Node (module.exports, guarded) --------

const RBS_NATIVE = {
  RBS_CONTROL_IDS,
  RBS_ENDPOINTS,
  DEFAULT_WINDOW,
  SLOT_STATUS,
  NATIVE_HIDE_SELECTORS,
  FORBIDDEN_CLICK_IDS,
  WEEKDAY_INITIALS,
  formatDate,
  formatWindow,
  timeToMinutes,
  minutesToTime,
  normalizeText,
  buildSearchPayload,
  buildSlotPayload,
  encodeForm,
  parseRooms,
  parseSlots,
  classifySlotStatus,
  buildSlotAxis,
  alignSlots,
  buildBoardModel,
  classifyEmpty,
  hasAnyFreeCell,
  slotCacheKey,
  createSlotQueue,
  buildDateChips,
  rangeToWindow,
  rangeHasConflict,
  keyToAction,
  shouldRevealNative,
  shouldRevealNativeOnFailure,
  selfCheck,
  filterRooms,
  axisGridTemplate,
  buildAxisHeaderCells,
  hasShoelace,
  defaultForm,
  queueStatus,
};

// Expose each on globalThis for the content script / panel.js.
if (typeof globalThis !== 'undefined') {
  for (const [key, val] of Object.entries(RBS_NATIVE)) {
    globalThis[key] = val;
  }
  globalThis.RBS_NATIVE = RBS_NATIVE;
}

// Node / CommonJS, guarded so the browser never trips on `module`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RBS_NATIVE;
}


/* --- content/panel.js (legacy panel + window.__rbsBridge) --- */

/*
 * content/panel.js
 *
 * The Lintel full-page app.
 *
 * Replaces the floating panel with a fixed full-page overlay (inset 0).
 * Dark theme matches panel.css; loads helpers from content/native.js.
 */

(function () {
  'use strict';

  const SEARCH_PATH = '/SRB001/SRB001Page';
  const STORAGE_KEY = 'rbsLastBoard';
  // The axis the board always draws; the user's window only dims cells outside it.
  const DAY_WINDOW = Object.freeze({ start: '07:00', end: '22:30' });
  const PANEL_CSS = `:host{all:initial}
  
  /* RBS theme variables */
  :host {
    --rbs-page: #0b0c0e;
    --rbs-surface: #14161a;
    --rbs-surface2: #1f2226;
    --rbs-border: #2b2f36;
    --rbs-border-hour: #3a3f48;
    --rbs-primary-text: #e6e8eb;
    --rbs-muted: #8b9199;
    --rbs-accent: #c8102e; /* SIT red */
    --rbs-free: #2dd4bf;
    --rbs-taken: #b45309;
    --rbs-closed: #2a2d33;
    --rbs-font: -apple-system, "Segoe UI", system-ui, sans-serif;
    --rbs-font-mono: ui-monospace, "SF Mono", Monaco, "Cascadia Mono", monospace;
    --rbs-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    --rbs-gap: 12px;
    --rbs-radius: 8px;
    --rbs-cell-size: 32px;
    --rbs-hour-height: 40px;
    --rbs-row-height: 34px;
    --rbs-topbar-height: 64px;
    --rbs-status-height: 24px;
    
    /* Shoelace theme mapping */
    --sl-color-primary-50: #fef2f2;
    --sl-color-primary-100: #fee2e2;
    --sl-color-primary-200: #fecaca;
    --sl-color-primary-300: #fca5a5;
    --sl-color-primary-400: #f87171;
    --sl-color-primary-500: #ef4444;
    --sl-color-primary-600: var(--rbs-accent); /* #c8102e */
    --sl-color-primary-700: #b91c1c;
    --sl-color-primary-800: #991b1b;
    --sl-color-primary-900: #7f1d1d;
    --sl-color-primary-950: #450a0a;
    
    --sl-color-neutral-50: #f9fafb;
    --sl-color-neutral-100: #f3f4f6;
    --sl-color-neutral-200: #e5e7eb;
    --sl-color-neutral-300: #d1d5db;
    --sl-color-neutral-400: #9ca3af;
    --sl-color-neutral-500: #6b7280;
    --sl-color-neutral-600: #4b5563;
    --sl-color-neutral-700: #374151;
    --sl-color-neutral-800: #1f2937;
    --sl-color-neutral-900: #111827;
    --sl-color-neutral-950: #030712;
    
    --sl-color-neutral-0: var(--rbs-page);
    --sl-color-neutral-1000: var(--rbs-primary-text);
    
    --sl-font-sans: var(--rbs-font);
    --sl-font-mono: var(--rbs-font-mono);
    --sl-border-radius-small: 4px;
    --sl-border-radius-medium: var(--rbs-radius);
    --sl-border-radius-large: 12px;
    --sl-border-radius-x-large: 16px;
    
    --sl-input-height-small: 28px;
    --sl-input-height-medium: 32px;
    --sl-input-height-large: 40px;
    
    --sl-panel-background-color: var(--rbs-surface);
    --sl-panel-border-color: var(--rbs-border);
    
    --sl-input-background-color: var(--rbs-surface2);
    --sl-input-border-color: var(--rbs-border);
    --sl-input-color: var(--rbs-primary-text);
    --sl-input-placeholder-color: var(--rbs-muted);
    
    --sl-button-small-font-size: 12px;
    --sl-button-font-size-small: 12px;
    
    --sl-focus-ring-color: var(--rbs-accent);
    --sl-focus-ring-style: solid;
    --sl-focus-ring-width: 2px;
  }
  
  :host([data-theme="light"]) {
    --rbs-page: #ffffff;
    --rbs-surface: #f8f9fa;
    --rbs-surface2: #e9ecef;
    --rbs-border: #dee2e6;
    --rbs-border-hour: #ced4da;
    --rbs-primary-text: #212529;
    --rbs-muted: #6c757d;
    --rbs-accent: #0d6efd;
    --rbs-free: #198754;
    --rbs-taken: #dc3545;
    
    /* Light theme Shoelace overrides */
    --sl-color-primary-600: var(--rbs-accent);
    --sl-color-neutral-0: var(--rbs-page);
    --sl-color-neutral-1000: var(--rbs-primary-text);
    --sl-panel-background-color: var(--rbs-surface);
    --sl-panel-border-color: var(--rbs-border);
    --sl-input-background-color: var(--rbs-surface2);
    --sl-input-border-color: var(--rbs-border);
    --sl-input-color: var(--rbs-primary-text);
    --sl-input-placeholder-color: var(--rbs-muted);
  }
  
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  
  .rbs-fullpage {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    background: var(--rbs-page);
    color: var(--rbs-primary-text);
    font-family: var(--rbs-font);
    font-size: 13px;
    line-height: 1.4;
    overflow: hidden;
  }
  
  .rbs-topbar {
    height: var(--rbs-topbar-height);
    display: flex;
    align-items: center;
    padding: 0 var(--rbs-gap);
    background: var(--rbs-surface);
    border-bottom: 1px solid var(--rbs-border);
    gap: var(--rbs-gap);
    flex-shrink: 0;
  }
  
  .rbs-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--rbs-accent);
    margin-right: 12px;
  }
  
  .rbs-brand-text {
    font-size: 14px;
  }
  
  .rbs-brand-building {
    font-size: 13px;
    color: var(--rbs-primary-text);
    margin-left: 4px;
  }
  
  .rbs-control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .rbs-control-group select,
  .rbs-control-group input {
    background: var(--rbs-surface2);
    border: 1px solid var(--rbs-border);
    color: var(--rbs-primary-text);
    border-radius: var(--rbs-radius);
    padding: 6px 8px;
    font-size: 12px;
    min-height: 28px;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b9199' d='M2.5 4.5L6 8l3.5-3.5H2.5z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 28px;
  }
  
  .rbs-control-group select:focus,
  .rbs-control-group input:focus {
    outline: 2px solid var(--rbs-accent);
    outline-offset: 0;
  }
  
  .rbs-control-group select option {
    background: var(--rbs-surface2);
    color: var(--rbs-primary-text);
  }
  
  .rbs-capacity-input {
    width: 80px;
  }
  
  .rbs-search-input {
    width: 120px;
  }
  
  .rbs-date-chips {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 2px;
    scrollbar-width: none;
  }
  
  .rbs-date-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 8px;
    background: var(--rbs-surface2);
    border: 1px solid var(--rbs-border);
    border-radius: var(--rbs-radius);
    min-width: 70px;
    cursor: pointer;
    user-select: none;
  }
  
  .rbs-date-chip:hover {
    background: var(--rbs-surface);
  }
  
  .rbs-date-chip.rbs-selected {
    background: var(--rbs-accent);
    color: white;
    border-color: var(--rbs-accent);
    font-weight: 600;
    outline: 2px solid var(--rbs-accent);
    outline-offset: -1px;
  }
  
  .rbs-date-weekday {
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  
  .rbs-date-label {
    font-size: 11px;
  }
  
  .rbs-window-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .rbs-window-select {
    width: 88px;
  }
  
  .rbs-topbar-actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
  
  .rbs-action-btn {
    background: var(--rbs-surface2);
    border: 1px solid var(--rbs-border);
    color: var(--rbs-primary-text);
    border-radius: var(--rbs-radius);
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    min-height: 28px;
    white-space: nowrap;
    min-width: 60px;
  }
  
  .rbs-action-btn:hover {
    background: var(--rbs-surface);
  }
  
  .rbs-action-btn.rbs-primary {
    background: var(--rbs-accent);
    color: white;
    border-color: var(--rbs-accent);
  }
  
  .rbs-action-btn.rbs-primary:hover {
    background: #d93046;
  }
  
  .rbs-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }
  
  .rbs-board-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .rbs-board-header {
    height: var(--rbs-hour-height);
    background: var(--rbs-surface);
    border-bottom: 1px solid var(--rbs-border);
    display: grid;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .rbs-hour-last {
    font-size: 10px;
    color: var(--rbs-muted);
  }
  
  .rbs-room-label {
    padding: 0 12px;
    font-family: var(--rbs-font-mono);
    font-size: 12px;
    color: var(--rbs-muted);
    border-right: 1px solid var(--rbs-border);
  }
  
  .rbs-board-scroll {
    flex: 1;
    overflow: auto;
    background-image: repeating-linear-gradient(to bottom, transparent 0 31px, var(--rbs-border) 31px 32px);
  }
  
  .rbs-board-rows {
    display: flex;
    flex-direction: column;
  }
  
  .rbs-board-row.rbs-row-odd .rbs-room-info {
    background: rgba(255, 255, 255, 0.04);
  }
  
  .rbs-board-row.rbs-row-odd .rbs-slot-cell.rbs-unknown,
  .rbs-board-row.rbs-row-odd .rbs-slot-cell.rbs-closed {
    background-color: rgba(255, 255, 255, 0.035);
  }
  
  .rbs-board-row.rbs-row-odd .rbs-slot-cell.rbs-free {
    box-shadow: inset 0 0 0 999px rgba(255, 255, 255, 0.05);
  }
  
  .rbs-board-row.rbs-row-odd .rbs-slot-cell.rbs-taken {
    box-shadow: inset 0 0 0 999px rgba(0, 0, 0, 0.12);
  }
  
  .rbs-board-row:hover .rbs-room-info {
    background: rgba(255, 255, 255, 0.06);
  }
  
  .rbs-slot-cell:hover {
    outline: 1px solid var(--rbs-accent);
    outline-offset: -1px;
  }
  
  .rbs-board-row {
    height: var(--rbs-row-height);
    display: grid;
    align-items: center;
    border-bottom: 1px solid var(--rbs-border);
  }
  
  .rbs-room-info {
    display: flex;
    align-items: center;
    padding: 0 8px;
    gap: 5px;
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    border-right: 1px solid var(--rbs-border);
  }
  
  .rbs-room-code {
    font-family: var(--rbs-font-mono);
    color: var(--rbs-primary-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.1;
    flex: 1 1 auto;
    font-size: 11px;
    letter-spacing: -0.2px;
  }
  
  .rbs-room-type {
    color: var(--rbs-muted);
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 88px;
  }
  
  .rbs-room-cap {
    background: var(--rbs-surface2);
    color: var(--rbs-primary-text);
    border-radius: 999px;
    padding: 0 6px;
    font-size: 10px;
    font-weight: 600;
    margin-left: auto;
  }
  
  .rbs-slot-cells {
    display: grid;
    gap: 1px;
    height: 100%;
    align-items: center;
  }
  
  .rbs-slot-cell {
    height: 100%;
    border-right: 1px solid var(--rbs-border);
  }
  
  .rbs-slot-cell.rbs-hour-boundary {
    border-right-color: var(--rbs-border-hour);
  }
  
  .rbs-slot-cell.rbs-free {
    background: var(--rbs-free);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
  }
  
  .rbs-slot-cell.rbs-taken {
    background-color: var(--rbs-taken);
    background-image: repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.28) 0 3px,
      transparent 3px 6px
    );
  }
  
  .rbs-slot-cell.rbs-unknown {
    background: var(--rbs-surface2);
  }
  
  .rbs-slot-cell.rbs-outside {
    opacity: 0.3;
  }
  
  .rbs-slot-cell.rbs-selected {
    outline: 2px solid var(--rbs-accent);
    outline-offset: -1px;
    z-index: 1;
  }
  
  .rbs-slot-cell.rbs-skel {
    background: linear-gradient(90deg, var(--rbs-surface2) 25%, var(--rbs-surface) 37%, var(--rbs-surface2) 63%);
    background-size: 400% 100%;
    animation: rbs-shimmer 1.2s ease-in-out infinite;
  }
  
  @keyframes rbs-shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: 0 0;
    }
  }
  
  .rbs-statusbar {
    height: var(--rbs-status-height);
    background: var(--rbs-surface);
    border-top: 1px solid var(--rbs-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    font-family: var(--rbs-font-mono);
    font-size: 11px;
    color: var(--rbs-muted);
    flex-shrink: 0;
    overflow: hidden;
    white-space: nowrap;
  }
  
  .rbs-stats {
    display: flex;
    gap: 12px;
  }
  
  .rbs-error-indicator {
    color: #ff6b6b;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .rbs-retry-btn {
    background: none;
    border: none;
    color: var(--rbs-accent);
    cursor: pointer;
    text-decoration: underline;
    font-family: inherit;
    font-size: inherit;
    padding: 0;
    margin: 0;
  }
  
  .rbs-legend {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    margin-right: 12px;
    font-size: 11px;
    color: var(--rbs-muted);
  }
  
  .rbs-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  
  .rbs-legend-dot.rbs-free-dot {
    background-color: var(--rbs-free);
  }
  
  .rbs-legend-dot.rbs-closed-dot {
    background-color: var(--rbs-closed);
    border: 1px solid var(--rbs-border);
  }
  
  .rbs-legend-swatch {
    width: 14px;
    height: 10px;
    border-radius: 2px;
    display: inline-block;
  }
  
  .rbs-legend-swatch.rbs-free-swatch {
    background: var(--rbs-free);
  }
  
  .rbs-legend-swatch.rbs-taken-swatch {
    background-color: var(--rbs-taken);
    background-image: repeating-linear-gradient(45deg, rgba(0,0,0,.28) 0 3px, transparent 3px 6px);
  }
  
  .rbs-legend-swatch.rbs-closed-swatch {
    background: var(--rbs-closed);
    border: 1px solid var(--rbs-border);
  }
  
  .rbs-legend-dot.rbs-taken-dot {
    background-color: var(--rbs-taken);
  }
  
  @media (max-width: 1279px) {
    .rbs-topbar {
      flex-wrap: wrap;
      height: auto;
      padding: 8px;
    }
    
    .rbs-date-chips {
      order: 1;
      width: 100%;
      margin-top: 8px;
    }
  }
  
  .rbs-fullpage.rbs-app-hidden {
    display: none !important;
  }
  
  /* Shoelace component customizations */
  sl-select[size="small"] {
    --sl-input-height-small: 28px;
    --sl-input-font-size-small: 12px;
  }
  
  sl-input[size="small"] {
    --sl-input-height-small: 28px;
    --sl-input-font-size-small: 12px;
  }
  
  sl-button[size="small"] {
    --sl-button-font-size-small: 12px;
  }
  
  .rbs-shoelace-fallback {
    padding: 4px 8px;
    background: var(--rbs-surface2);
    border: 1px solid var(--rbs-border);
    border-radius: var(--rbs-radius);
    font-size: 11px;
    color: var(--rbs-muted);
    text-align: center;
  }`;

  const N = globalThis.RBS_NATIVE || globalThis;
  const {
    RBS_CONTROL_IDS,
    RBS_ENDPOINTS,
    DEFAULT_WINDOW,
    formatDate,
    formatWindow,
    buildSearchPayload,
    buildSlotPayload,
    encodeForm,
    parseRooms,
    parseSlots,
    buildSlotAxis,
    alignSlots,
    classifyEmpty,
    createSlotQueue,
    timeToMinutes,
    NATIVE_HIDE_SELECTORS,
    shouldRevealNativeOnFailure,
    rangeToWindow,
    filterRooms,
    axisGridTemplate,
    buildAxisHeaderCells,
    hasShoelace,
    defaultForm,
    queueStatus,
  } = N;

  // Global UI references
  let ui = null;
  
  // Safer UI access with guard
  function getUI() {
    if (!ui) {
      renderFatal('UI not initialized');
      throw new Error('UI not initialized');
    }
    return ui;
  }

  // Guard: if native.js failed to load, do nothing rather than throw on page.
  if (typeof buildSearchPayload !== 'function' || typeof createSlotQueue !== 'function') {
    return;
  }

  // ---- utilities ------------------------------------------------------------

  function isSearchPage() {
    return location.pathname.indexOf(SEARCH_PATH) !== -1;
  }

  function el(tag, props, children) {
    // Shoelace's sl-select only understands <sl-option> children; a plain <option>
    // is ignored, which left every select empty after the Shoelace migration.
    const realTag = tag === 'option' && hasShoelace() ? 'sl-option' : tag;
    const node = document.createElement(realTag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'for') node.htmlFor = v;
        else if (k.startsWith('on') && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v != null) {
          node.setAttribute(k, v);
        }
      }
    }
    if (children) {
      for (const c of [].concat(children)) {
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  // Helper for creating Shoelace components with fallback
  function createControl(tag, props, children, fallbackTag = 'div') {
    const useShoelace = hasShoelace();
    const element = useShoelace ? document.createElement(tag) : document.createElement(fallbackTag);
    
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === 'class') {
          element.className = v;
        } else if (k === 'text') {
          if (useShoelace && tag.startsWith('sl-')) {
            element.textContent = v;
          } else {
            element.textContent = v;
          }
        } else if (k === 'value' && useShoelace && tag.startsWith('sl-')) {
          element.value = v;
        } else if (k === 'placeholder' && useShoelace && tag.startsWith('sl-')) {
          element.placeholder = v;
        } else if (k === 'type' && useShoelace && tag.startsWith('sl-')) {
          element.type = v;
        } else if (k === 'size' && useShoelace && tag.startsWith('sl-')) {
          element.size = v;
        } else if (k === 'variant' && useShoelace && tag.startsWith('sl-')) {
          element.variant = v;
        } else if (k === 'clearable' && useShoelace && tag.startsWith('sl-')) {
          element.clearable = v;
        } else if (k === 'hoist' && useShoelace && tag.startsWith('sl-')) {
          element.hoist = v;
        } else if (k === 'label' && useShoelace && tag.startsWith('sl-')) {
          element.setAttribute('label', v);
        } else if (k === 'pill' && useShoelace && tag.startsWith('sl-')) {
          element.pill = v;
        } else if (k.startsWith('on') && typeof v === 'function') {
          const eventName = k.slice(2).toLowerCase();
          element.addEventListener(eventName, v);
        } else if (v != null) {
          element.setAttribute(k, v);
        }
      }
    }
    
    if (children) {
      for (const c of [].concat(children)) {
        if (c == null) continue;
        if (typeof c === 'string') {
          element.appendChild(document.createTextNode(c));
        } else if (c instanceof HTMLElement || c instanceof SVGElement) {
          element.appendChild(c);
        }
      }
    }
    
    return element;
  }

  // Read the option elements of a control regardless of whether it is a
  // Shoelace <sl-select> (children are <sl-option>) or a plain <select>
  // (children are <option> exposed via .options). On the plain-HTML path a
  // blind querySelectorAll('sl-option') returns [], which silently collapsed
  // the concrete room type to "All rooms" (~60 rooms). Route every option
  // read through here so both control kinds behave the same.
  function readControlOptions(control) {
    if (!control) return [];
    if (control.tagName === 'SL-SELECT') {
      return Array.from(control.querySelectorAll('sl-option'));
    }
    return Array.from(control.options || control.querySelectorAll('option') || []);
  }

  // Merge select options preserving current selection
  function mergeSelectOptions(existingOptions, newOptions, currentValue) {
    // existingOptions: array of current option values
    // newOptions: array of new option values
    // currentValue: currently selected value
    
    // If current value exists in new options, keep it
    if (newOptions.includes(currentValue)) {
      return { options: newOptions, value: currentValue };
    }
    
    // Otherwise fall back to appropriate default
    if (currentValue === '') {
      // "All rooms" or empty - keep empty if available, otherwise first
      return { options: newOptions, value: '' };
    } else {
      // Specific value no longer available - fall back to first option
      return { options: newOptions, value: newOptions.length > 0 ? newOptions[0] : '' };
    }
  }

  // Debounce helper
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Read option TEXTs from a native <select>, skipping placeholders.
  function readOptionTexts(id) {
    const sel = document.getElementById(id);
    if (!sel) return [];
    return Array.from(sel.options)
      .map((o) => (o.textContent || '').trim())
      .filter((t) => t && !/^-+$/.test(t) && !/please select/i.test(t));
  }

  // Room types: the option texts of #resourceType. '' = "All rooms".
  function readRoomTypes() {
    return readOptionTexts(RBS_CONTROL_IDS.resourceType);
  }

  // The day-window option texts ("07:00" ... "22:30") from the native selects.
  function readWindowOptions() {
    const from = readOptionTexts(RBS_CONTROL_IDS.start).filter((t) => /^\d{2}:\d{2}$/.test(t));
    const to = readOptionTexts(RBS_CONTROL_IDS.end).filter((t) => /^\d{2}:\d{2}$/.test(t));
    return { from, to };
  }

  // The current campus/building values from the native hidden selects.
  function readIdValue(id) {
    const node = document.getElementById(id);
    return node ? node.value || '' : '';
  }

  // Read building name from the selected building option
  function readBuildingName() {
    const buildingSelect = document.getElementById(RBS_CONTROL_IDS.building);
    if (!buildingSelect) return '';
    
    const selectedOption = buildingSelect.options[buildingSelect.selectedIndex];
    if (!selectedOption) return '';
    
    const text = selectedOption.textContent.trim();
    if (!text || /^-+$/.test(text) || /please select/i.test(text)) {
      return '';
    }
    
    // Extract building code (e.g., "E2" from "E2 - Engineering Block 2")
    const match = text.match(/^([A-Z0-9]+)/);
    return match ? match[1] : text.split(' ')[0];
  }

  // Update room type and window selects based on current building
  function updateTypeAndWindowSelects(typeSelect, startSelect, endSelect) {
    if (!typeSelect || !startSelect || !endSelect) return;
    
    // Read fresh room types and window options
    const roomTypes = readRoomTypes();
    const windowOpts = readWindowOptions();
    
    // Check if using Shoelace
    const isShoelace = typeSelect.tagName === 'SL-SELECT';
    
    // Update room type select
    const currentTypeValue = typeSelect.value;
    const existingTypeOptions = isShoelace 
      ? Array.from(typeSelect.querySelectorAll('sl-option')).map(opt => opt.value)
      : Array.from(typeSelect.options).map(opt => opt.value);
    const typeResult = mergeSelectOptions(existingTypeOptions, roomTypes, currentTypeValue);
    
    if (isShoelace) {
      // Clear and rebuild sl-options
      typeSelect.innerHTML = '';
      const allOption = createControl('sl-option', { value: '', text: 'All rooms' }, null, 'option');
      typeSelect.appendChild(allOption);
      for (const t of typeResult.options) {
        const option = createControl('sl-option', { value: t, text: t }, null, 'option');
        typeSelect.appendChild(option);
      }
      typeSelect.value = typeResult.value;
    } else {
      typeSelect.innerHTML = '';
      typeSelect.appendChild(el('option', { value: '', text: 'All rooms' }));
      for (const t of typeResult.options) {
        typeSelect.appendChild(el('option', { value: t, text: t }));
      }
      typeSelect.value = typeResult.value;
    }
    
    // Update window start select
    const currentStartValue = startSelect.value;
    const existingStartOptions = isShoelace
      ? Array.from(startSelect.querySelectorAll('sl-option')).map(opt => opt.value)
      : Array.from(startSelect.options).map(opt => opt.value);
    const startResult = mergeSelectOptions(existingStartOptions, windowOpts.from, currentStartValue);
    
    if (isShoelace) {
      startSelect.innerHTML = '';
      for (const t of startResult.options) {
        const option = createControl('sl-option', { value: t, text: t }, null, 'option');
        startSelect.appendChild(option);
      }
      startSelect.value = startResult.value;
    } else {
      startSelect.innerHTML = '';
      for (const t of startResult.options) {
        startSelect.appendChild(el('option', { value: t, text: t }));
      }
      startSelect.value = startResult.value;
    }
    
    // Update window end select
    const currentEndValue = endSelect.value;
    const existingEndOptions = isShoelace
      ? Array.from(endSelect.querySelectorAll('sl-option')).map(opt => opt.value)
      : Array.from(endSelect.options).map(opt => opt.value);
    const endResult = mergeSelectOptions(existingEndOptions, windowOpts.to, currentEndValue);
    
    if (isShoelace) {
      endSelect.innerHTML = '';
      for (const t of endResult.options) {
        const option = createControl('sl-option', { value: t, text: t }, null, 'option');
        endSelect.appendChild(option);
      }
      endSelect.value = endResult.value;
    } else {
      endSelect.innerHTML = '';
      for (const t of endResult.options) {
        endSelect.appendChild(el('option', { value: t, text: t }));
      }
      endSelect.value = endResult.value;
    }
  }

  // Populate building select from the live cascade
  async function populateBuildingSelect(buildingSelect, typeSelect, startSelect, endSelect) {
    const nativeBuildingSelect = document.getElementById(RBS_CONTROL_IDS.building);
    if (!nativeBuildingSelect) {
      buildingSelect.disabled = true;
      buildingSelect.innerHTML = '';
      buildingSelect.appendChild(el('option', { value: '', text: 'Building…' }));
      return;
    }
    
    // Read current options
    const options = Array.from(nativeBuildingSelect.options)
      .map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
      .filter(opt => opt.text && !/^-+$/.test(opt.text) && !/please select/i.test(opt.text));
    
    if (options.length >= 2) {
      // We have real building options
      buildingSelect.innerHTML = '';
      buildingSelect.appendChild(el('option', { value: '', text: 'All buildings' }));
      options.forEach(opt => {
        buildingSelect.appendChild(el('option', { 
          value: opt.value, 
          text: opt.text 
        }));
      });
      buildingSelect.disabled = false;
      
      // Update room type and window selects since building is now populated
      if (typeSelect && startSelect && endSelect) {
        updateTypeAndWindowSelects(typeSelect, startSelect, endSelect);
      }
    } else {
      // Building select is empty - need to trigger cascade
      buildingSelect.disabled = true;
      buildingSelect.innerHTML = '';
      buildingSelect.appendChild(el('option', { value: '', text: 'Building…' }));
      
      // Try to trigger campus change to populate building
      const campusSelect = document.getElementById(RBS_CONTROL_IDS.campus);
      if (campusSelect && campusSelect.options.length > 1) {
        // Select first non-placeholder campus option
        const realOptions = Array.from(campusSelect.options)
          .filter(opt => opt.text.trim() && !/^-+$/.test(opt.text.trim()) && !/please select/i.test(opt.text.trim()));
        
        if (realOptions.length > 0 && campusSelect.value !== realOptions[0].value) {
          campusSelect.value = realOptions[0].value;
          campusSelect.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Wait for cascade to populate building
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Re-read building options
          const newOptions = Array.from(nativeBuildingSelect.options)
            .map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
            .filter(opt => opt.text && !/^-+$/.test(opt.text) && !/please select/i.test(opt.text));
          
          if (newOptions.length >= 2) {
            buildingSelect.innerHTML = '';
            buildingSelect.appendChild(el('option', { value: '', text: 'All buildings' }));
            newOptions.forEach(opt => {
              buildingSelect.appendChild(el('option', { 
                value: opt.value, 
                text: opt.text 
              }));
            });
            buildingSelect.disabled = false;
            
            // Update room type and window selects since building is now populated
            if (typeSelect && startSelect && endSelect) {
              updateTypeAndWindowSelects(typeSelect, startSelect, endSelect);
            }
          }
        }
      }
    }
  }

  // Which required native ids are missing? Gate the board on ALL of these.
  function missingControlIds() {
    const required = [
      RBS_CONTROL_IDS.resourceType,
      RBS_CONTROL_IDS.date,
      RBS_CONTROL_IDS.start,
      RBS_CONTROL_IDS.end,
      RBS_CONTROL_IDS.searchButton,
      RBS_CONTROL_IDS.building,
      RBS_CONTROL_IDS.campus,
    ];
    return required.filter((id) => !document.getElementById(id));
  }

  // ---- fatal error rendering -----------------------------------------------

  function renderFatal(message) {
    try {
      // Reveal native UI when showing fatal error
      showNativeUI();
      
      const existing = document.getElementById('sit-lintel-host');
      if (existing) existing.remove();
      
      const hostEl = el('div', { id: 'sit-lintel-host' });
      document.body.appendChild(hostEl);
      const shadow = hostEl.attachShadow({ mode: 'open' });
      shadow.appendChild(el('style', { text: PANEL_CSS }));
      
      const host = el('div', { class: 'rbs-fullpage' });
      shadow.appendChild(host);
      
      const errorDiv = el('div', { 
        style: 'display: flex; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; font-size: 14px; padding: 20px; text-align: center;'
      }, message);
      host.appendChild(errorDiv);
      
      console.error('Lintel fatal:', message);
    } catch (e) {
      console.error('Lintel fatal (rendering failed):', message, e);
    }
  }

  // ---- main UI shell --------------------------------------------------------

  function buildFullPageShell(shadow, missing) {
    const host = el('div', { class: 'rbs-fullpage' });
    
    if (missing.length) {
      // Gate failed: show error panel
      shadow.appendChild(el('style', { text: PANEL_CSS }));
      shadow.appendChild(host);
      host.appendChild(
        el('div', { class: 'rbs-main' }, [
          el('div', { class: 'rbs-board-area' }, [
            el('div', { class: 'rbs-board-header' }),
            el('div', { class: 'rbs-board-scroll' }, [
              el('div', { class: 'rbs-board-rows' }, [
                el('div', { style: 'padding: 20px; text-align: center; color: #ff6b6b;' },
                  'RBS page changed. Controls not found: ' + missing.map((id) => '#' + id).join(', '))
              ])
            ])
          ])
        ])
      );
      return null;
    }
    
    // Build empty shell (topbar will be filled in pass 2, board in pass 3)
    shadow.appendChild(el('style', { text: PANEL_CSS }));
    shadow.appendChild(host);
    
    const main = el('div', { class: 'rbs-main' });
    const boardArea = el('div', { class: 'rbs-board-area' });
    const boardScroll = el('div', { class: 'rbs-board-scroll' });
    const boardHeader = el('div', { class: 'rbs-board-header' });
    const boardRows = el('div', { class: 'rbs-board-rows' });
    
    boardScroll.appendChild(boardHeader);
    boardScroll.appendChild(boardRows);
    boardArea.appendChild(boardScroll);
    main.appendChild(boardArea);
    host.appendChild(main);
    
    return {
      host,
      main,
      boardArea,
      boardHeader,
      boardScroll,
      boardRows,
    };
  }

  // ---- top bar -------------------------------------------------------------

  function buildDateChips(startDate, count) {
    const chips = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < count; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const chip = el('div', {
        class: 'rbs-date-chip',
        'data-date': formatDate(d),
      }, [
        el('div', { class: 'rbs-date-weekday', text: weekdays[d.getDay()] }),
        el('div', { class: 'rbs-date-label', text: formatDate(d) })
      ]);
      // Default to TOMORROW, not today: the current day legitimately returns no slots
      // for hours that have already passed, which reads as a half-empty board.
      const today = new Date();
      const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const isTomorrow = d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate();
      if (isTomorrow) chip.classList.add('rbs-selected');
      chips.push(chip);
    }
    return chips;
  }


  // Keep a requested time inside the drawn day window (07:00-22:30).
  function clampToDay(value, fallback) {
    const v = String(value == null ? '' : value).trim();
    if (!/^\d{1,2}:\d{2}$/.test(v)) return fallback;
    const [h, m] = v.split(':').map(Number);
    const mins = h * 60 + m;
    const lo = timeToMinutes(DAY_WINDOW.start);
    const hi = timeToMinutes(DAY_WINDOW.end);
    if (mins < lo) return DAY_WINDOW.start;
    if (mins > hi) return DAY_WINDOW.end;
    return v;
  }

  function buildTopBar(shellUI, roomTypes, windowOpts, attachListeners = true) {
    const useShoelace = hasShoelace();
    const topbar = el('div', { class: 'rbs-topbar' });
    
    // Brand
    const buildingName = readBuildingName() || 'RBS';
    const brand = el('div', { class: 'rbs-brand' }, [
      el('span', { class: 'rbs-brand-text', text: 'Lintel' }),
      el('span', { class: 'rbs-brand-building', text: buildingName })
    ]);
    topbar.appendChild(brand);
    
    // Building select - use sl-select with hoist to avoid clipping
    const buildingSelect = useShoelace 
      ? createControl('sl-select', { 
          size: 'small', 
          hoist: true,
          label: 'Building',
          placeholder: 'All buildings'
        }, [
          createControl('sl-option', { value: '', text: 'All buildings' })
        ], 'select')
      : el('select', {}, [
          el('option', { value: '', text: 'Building…' })
        ]);
    
    topbar.appendChild(el('div', { class: 'rbs-control-group' }, [buildingSelect]));
    
    // Room type select - use sl-select with hoist
    const typeSelect = useShoelace
      ? createControl('sl-select', {
          size: 'small',
          hoist: true,
          label: 'Room type'
        }, [
          createControl('sl-option', { value: '', text: 'All rooms' }),
          ...roomTypes.map(t => createControl('sl-option', { value: t, text: t }))
        ], 'select')
      : (() => {
          const select = el('select');
          select.appendChild(el('option', { value: '', text: 'All rooms' }));
          for (const t of roomTypes) {
            select.appendChild(el('option', { value: t, text: t }));
          }
          return select;
        })();
    
    topbar.appendChild(el('div', { class: 'rbs-control-group' }, [typeSelect]));
    
    // Capacity input - use sl-input type="number"
    const capInput = useShoelace
      ? createControl('sl-input', {
          type: 'number',
          size: 'small',
          placeholder: 'Min capacity',
          'aria-label': 'Minimum capacity',
          value: ''
        }, null, 'input')
      : el('input', {
          class: 'rbs-capacity-input',
          type: 'number',
          min: '0',
          placeholder: 'Min capacity',
          'aria-label': 'Minimum capacity',
          value: ''
        });
    
    topbar.appendChild(el('div', { class: 'rbs-control-group' }, [capInput]));
    
    // Search input - use sl-input type="search" with clearable
    const searchInput = useShoelace
      ? createControl('sl-input', {
          type: 'search',
          size: 'small',
          placeholder: 'Search room code',
          clearable: true
        }, null, 'input')
      : el('input', {
          class: 'rbs-search-input',
          type: 'search',
          placeholder: 'Search rooms'
        });
    
    topbar.appendChild(el('div', { class: 'rbs-control-group' }, [searchInput]));
    
    // Date chips (keep as custom, not Shoelace)
    const dateChips = el('div', { class: 'rbs-date-chips' });
    buildDateChips(new Date(), 14).forEach(chip => dateChips.appendChild(chip));
    topbar.appendChild(dateChips);
    
    // Window controls - use sl-select
    const windowControls = el('div', { class: 'rbs-window-controls' });
    
    const startSelect = useShoelace
      ? createControl('sl-select', { size: 'small' }, 
          windowOpts.from.map(t => createControl('sl-option', { value: t, text: t })),
          'select')
      : (() => {
          const select = el('select', { class: 'rbs-window-select' });
          for (const t of windowOpts.from) select.appendChild(el('option', { value: t, text: t }));
          return select;
        })();
    
    const endSelect = useShoelace
      ? createControl('sl-select', { size: 'small' },
          windowOpts.to.map(t => createControl('sl-option', { value: t, text: t })),
          'select')
      : (() => {
          const select = el('select', { class: 'rbs-window-select' });
          for (const t of windowOpts.to) select.appendChild(el('option', { value: t, text: t }));
          return select;
        })();
    
    // Set default values
    if (windowOpts.from.includes(DEFAULT_WINDOW.start)) {
      if (useShoelace) startSelect.value = DEFAULT_WINDOW.start;
      else startSelect.value = DEFAULT_WINDOW.start;
    }
    if (windowOpts.to.includes(DEFAULT_WINDOW.end)) {
      if (useShoelace) endSelect.value = DEFAULT_WINDOW.end;
      else endSelect.value = DEFAULT_WINDOW.end;
    }
    
    windowControls.appendChild(startSelect);
    windowControls.appendChild(el('span', { text: '-' }));
    windowControls.appendChild(endSelect);
    windowControls.setAttribute('title', 'Time range for the board');
    windowControls.setAttribute('aria-label', 'Time range');
    topbar.appendChild(windowControls);
    
    // Sort select - use sl-select
    const sortSelect = useShoelace
      ? createControl('sl-select', { size: 'small', label: 'Sort', value: 'name' }, [
          createControl('sl-option', { value: 'name', text: 'Name' }),
          createControl('sl-option', { value: 'capacity', text: 'Capacity' })
        ], 'select')
      : (() => {
          const select = el('select', { class: 'rbs-window-select' });
          select.appendChild(el('option', { value: 'name', text: 'Name' }));
          select.appendChild(el('option', { value: 'capacity', text: 'Capacity' }));
          return select;
        })();
    
    topbar.appendChild(el('div', { class: 'rbs-control-group' }, [sortSelect]));
    
    // Legend
    const legend = el('div', { class: 'rbs-legend' }, [
      el('span', { class: 'rbs-legend-swatch rbs-free-swatch' }),
      el('span', { text: 'Free' }),
      el('span', { class: 'rbs-legend-swatch rbs-taken-swatch', style: 'margin-left: 10px' }),
      el('span', { text: 'Booked' }),
      el('span', { class: 'rbs-legend-swatch rbs-closed-swatch', style: 'margin-left: 10px' }),
      el('span', { text: 'Not open' })
    ]);
    topbar.appendChild(legend);
    
    // Action buttons - use sl-button
    const actions = el('div', { class: 'rbs-topbar-actions' });
    
    const refreshBtn = useShoelace
      ? createControl('sl-button', {
          size: 'small',
          variant: 'default',
          text: 'Refresh'
        }, null, 'button')
      : el('button', {
          class: 'rbs-action-btn',
          text: 'Refresh'
        });
    
    const nativeBtn = useShoelace
      ? createControl('sl-button', {
          size: 'small',
          variant: 'default',
          text: 'Native page'
        }, null, 'button')
      : el('button', {
          class: 'rbs-action-btn',
          text: 'Native page'
        });
    
    // Book on native form button (for drawer)
    const bookBtn = useShoelace
      ? createControl('sl-button', {
          size: 'small',
          variant: 'primary',
          text: 'Book on native form'
        }, null, 'button')
      : el('button', {
          class: 'rbs-action-btn rbs-primary',
          text: 'Book on native form'
        });
    
    // Clear button (for drawer)
    const clearBtn = useShoelace
      ? createControl('sl-button', {
          size: 'small',
          variant: 'text',
          text: 'Clear'
        }, null, 'button')
      : el('button', {
          class: 'rbs-action-btn',
          text: 'Clear'
        });
    
    // Only attach listeners if requested (safer for initialization)
    if (attachListeners) {
      if (useShoelace) {
        refreshBtn.addEventListener('click', onLoadBoard);
        nativeBtn.addEventListener('click', () => {
          if (document.documentElement.classList.contains('rbsx-native-hidden')) {
            showNativeUI();
            nativeBtn.textContent = 'Show App';
          } else {
            hideNativeUI();
            nativeBtn.textContent = 'Native UI';
          }
        });
      } else {
        refreshBtn.addEventListener('click', onLoadBoard);
        nativeBtn.addEventListener('click', () => {
          if (document.documentElement.classList.contains('rbsx-native-hidden')) {
            showNativeUI();
            nativeBtn.textContent = 'Show App';
          } else {
            hideNativeUI();
            nativeBtn.textContent = 'Native UI';
          }
        });
      }
    }
    
    actions.appendChild(refreshBtn);
    actions.appendChild(nativeBtn);
    topbar.appendChild(actions);
    
    // Insert at beginning of host
    shellUI.host.insertBefore(topbar, shellUI.host.firstChild);
    
    // Return references
    return {
      topbar,
      buildingSelect,
      typeSelect,
      capInput,
      searchInput,
      dateChips,
      startSelect,
      endSelect,
      sortSelect,
      refreshBtn,
      nativeBtn,
      bookBtn,
      clearBtn,
      useShoelace
    };
  }
  
  function attachEventListeners(uiRefs) {
    if (!uiRefs) return;
    
    // Refresh button
    uiRefs.refreshBtn.addEventListener('click', () => requestReload('refresh'));
    
    // Native UI toggle button
    uiRefs.nativeBtn.addEventListener('click', () => {
      if (document.documentElement.classList.contains('rbsx-native-hidden')) {
        showNativeUI();
        uiRefs.nativeBtn.textContent = 'Show App';
      } else {
        hideNativeUI();
        uiRefs.nativeBtn.textContent = 'Native UI';
      }
    });
    
    // Date chips selection - write date to form and reload
    uiRefs.dateChips.querySelectorAll('.rbs-date-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        uiRefs.dateChips.querySelectorAll('.rbs-date-chip').forEach(c => 
          c.classList.remove('rbs-selected')
        );
        chip.classList.add('rbs-selected');
        requestReload('date');
      });
    });
    
    // Building select - immediate reload when changed
    const buildingEvent = uiRefs.useShoelace ? 'sl-change' : 'change';
    uiRefs.buildingSelect.addEventListener(buildingEvent, () => {
      // Update room types and window options based on new building
      updateTypeAndWindowSelects(uiRefs.typeSelect, uiRefs.startSelect, uiRefs.endSelect);
      requestReload('building');
    });
    
    // Room type select - immediate reload
    const typeEvent = uiRefs.useShoelace ? 'sl-change' : 'change';
    uiRefs.typeSelect.addEventListener(typeEvent, () => requestReload('type'));
    
    // Window start select - immediate reload
    const startEvent = uiRefs.useShoelace ? 'sl-change' : 'change';
    uiRefs.startSelect.addEventListener(startEvent, () => requestReload('window-start'));
    
    // Window end select - immediate reload
    const endEvent = uiRefs.useShoelace ? 'sl-change' : 'change';
    uiRefs.endSelect.addEventListener(endEvent, () => requestReload('window-end'));
    
    // Sort select - immediate reload
    const sortEvent = uiRefs.useShoelace ? 'sl-change' : 'change';
    uiRefs.sortSelect.addEventListener(sortEvent, () => requestReload('sort'));
    
    // Capacity input - debounced reload
    const debouncedCapacityReload = debounce(() => requestReload('capacity'), 300);
    const capacityEvent = uiRefs.useShoelace ? 'sl-input' : 'input';
    uiRefs.capInput.addEventListener(capacityEvent, debouncedCapacityReload);
    
    // Search input - debounced reload
    const debouncedSearchReload = debounce(() => requestReload('search'), 300);
    const searchEvent = uiRefs.useShoelace ? 'sl-input' : 'input';
    uiRefs.searchInput.addEventListener(searchEvent, debouncedSearchReload);
  }

  // ---- board ----------------------------------------------------------------


  // Grid template for the board: a fixed room column plus one track per axis slot.
  function roomColumnTemplate(axis) {
    const n = Array.isArray(axis) ? axis.length : 0;
    return `200px repeat(${n}, minmax(0, 1fr))`;
  }

  function buildHourAxis(axis) {
    const header = getUI().boardHeader;
    header.innerHTML = '';
    // The board grid is `roomColumn` + one track per axis slot; the room column is a
    // separate element outside that grid, so the header must lead with its own
    // "Room" cell and then place one cell per slot: 1 + axis.length cells.
    header.style.gridTemplateColumns = roomColumnTemplate(axis);
    header.appendChild(el('div', { class: 'rbs-room-label', text: 'Room' }));
    const cellInfo = buildAxisHeaderCells(axis);
    for (let i = 0; i < cellInfo.length; i++) {
      const { isHour, label } = cellInfo[i];
      const isLast = i === cellInfo.length - 1;
      header.appendChild(el('div', {
        class: 'rbs-room-label' + (isHour ? ' rbs-hour' : '') + (isLast ? ' rbs-hour-last' : ''),
        text: isHour || isLast ? label : '\u00b7',
        title: label
      }));
    }
  }

  function buildRoomRow(room) {
    const row = el('div', {
      class: 'rbs-board-row' + ((board.rowIndex++ % 2) ? ' rbs-row-odd' : ''),
      'data-rsrcid': room.id
    });
    
    // Set grid columns to match header
    row.style.gridTemplateColumns = roomColumnTemplate(board.axis);
    
    // Room info column
    const roomInfo = el('div', { class: 'rbs-room-info' }, [
      el('span', { class: 'rbs-room-code', text: room.name }),
      // Redundant while a specific room type is selected - that space belongs to the code.
      (board.form && board.form.roomType) ? null : el('span', { class: 'rbs-room-type', text: room.type || '', title: room.type || '' }),
      el('span', { class: 'rbs-room-cap', text: String(room.capacity), title: 'Capacity ' + room.capacity })
    ]);
    row.appendChild(roomInfo);
    
    // Slot cells (skeleton state)
    for (let i = 0; i < board.axis.length; i++) {
      const cell = el('div', { class: 'rbs-slot-cell rbs-skel' });
      // Add hour boundary class for cells before hour marks (odd indices)
      if (i % 2 === 1) {
        cell.classList.add('rbs-hour-boundary');
      }
      cell.addEventListener('click', (e) => onCellClick(room.id, i, e));
      row.appendChild(cell);
    }
    
    return row;
  }

  function renderBoardSkeleton(rooms) {
    board.rowIndex = 0;
    const currentUI = getUI();
    currentUI.boardRows.innerHTML = '';
    
    // Build hour axis based on current window
    const start = currentUI.startSelect.value || DEFAULT_WINDOW.start;
    const end = currentUI.endSelect.value || DEFAULT_WINDOW.end;
    board.axis = buildSlotAxis(start, end);
    buildHourAxis(board.axis);
    
    // Build room rows
    for (const room of rooms) {
      const row = buildRoomRow(room);
      currentUI.boardRows.appendChild(row);
      board.blocks.set(room.id, {
        rowEl: row,
        cells: Array.from(row.querySelectorAll('.rbs-slot-cell')),
        loaded: false,
        room
      });
    }
    
    board.rooms = rooms;
    board.totalCount = rooms.length;
    board.loadedCount = 0;
  }

  // ---- board state ----------------------------------------------------------

  const board = {
    form: null, // { roomType, date, window:{start,end}, minCapacity, sort }
    axis: [], // shared time labels
    rooms: [], // parseRooms output (filtered + sorted), current render order
    queue: null, // createSlotQueue instance
    cache: new Map(), // persists across renders; keyed rsrcId|date|window|status
    blocks: new Map(), // roomId -> { rowEl, cellsEl, cells, loaded, failed }
    observer: null, // IntersectionObserver for viewport prioritisation
    generation: 0,
    rowIndex: 0,
    loadedCount: 0,
    totalCount: 0,
    failedCount: 0,
  };

  // ---- live API layer (same-origin POSTs) -----------------------------------

  // Thrown for a non-OK HTTP status or unparseable JSON so the caller can show
  // "the RBS API returned an error (HTTP n)" and keep the previous board.
  function ApiError(message, httpStatus) {
    const e = new Error(message);
    e.httpStatus = httpStatus;
    return e;
  }

  async function postForm(endpoint, fields) {
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: encodeForm(fields),
      });
    } catch (e) {
      throw ApiError('network error contacting RBS', 0);
    }
    if (!resp.ok) {
      throw ApiError(`the RBS API returned an error (HTTP ${resp.status})`, resp.status);
    }
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      // A 200 with an HTML body means RBS answered with a page, not data — the
      // usual cause is an expired SIT session silently redirecting to /Home/ErrorPage.
      const looksLikeHtml = /^\s*<(!doctype|html)/i.test(text);
      throw ApiError(
        looksLikeHtml
          ? 'RBS returned a web page instead of data. Your SIT session has probably expired. Reload the page and sign in again.'
          : 'the RBS API returned an error (unparseable JSON)',
        resp.status
      );
    }
  }

  // Read the FRESH anti-forgery token before each request.
  function readToken() {
    const input = document.querySelector('input[name=__RequestVerificationToken]');
    return input ? input.value || '' : '';
  }

  // Fetch the room list for the chosen filters. Returns parseRooms() output.
  async function fetchRooms(form) {
    const fields = buildSearchPayload({
      token: readToken(),
      // 'between' with empty capacities returns every room; the native select can sit
      // on '<' or '>' from earlier page state, which makes the server return nothing.
      capacityOperator: 'between',
      campusID: readIdValue(RBS_CONTROL_IDS.campus),
      buildingID: readIdValue(RBS_CONTROL_IDS.building),
      // Must be literal 'facilities': an empty faciequip makes the endpoint return [].
      facilities: 'facilities',
      status: 'All',
      // The endpoint expects the option TEXT with spaces ("Discussion Room"); our
      // sl-option values use underscores ("Discussion_Room") for DOM safety.
      resourceType: form.roomType ? String(form.roomType).replace(/_/g, ' ') : '',
      date: form.date,
      // Always search the whole day at this stage: the server only returns rooms that
      // have slots inside the requested window, which silently drops rooms when the
      // native start/end pins are narrow.
      start: DAY_WINDOW.start,
      end: DAY_WINDOW.end,
    });
    const json = await postForm(RBS_ENDPOINTS.searchList, fields);
    return parseRooms(json);
  }

  // Fetch one room's slots. Returns parseSlots() output.
  async function fetchSlots(room, form) {
    // Pinned to the full day so the board always shows 07:00-22:30 and the chosen
    // window only dims cells (see paintBlock) instead of truncating the axis.
    const fields = buildSlotPayload(room, form.date, DAY_WINDOW, 'All', readToken());
    const json = await postForm(RBS_ENDPOINTS.slotList, fields);
    return parseSlots(json);
  }

  // ---- slot painting --------------------------------------------------------

  function paintBlock(roomId, slots) {
    const entry = board.blocks.get(roomId);
    if (!entry) return;
    entry.loaded = true;
    const aligned = alignSlots(board.axis, slots);
    const startMin = timeToMinutes(board.form.window.start);
    const endMin = timeToMinutes(board.form.window.end);
    for (let i = 0; i < entry.cells.length; i++) {
      const cell = entry.cells[i];
      const slot = aligned[i];
      const label = board.axis[i];
      cell.className = 'rbs-slot-cell';
      // Add hour boundary class for cells before hour marks (odd indices)
      if (i % 2 === 1) {
        cell.classList.add('rbs-hour-boundary');
      }
      // Dim cells whose START falls outside the chosen window (axis is stable).
      const mins = timeToMinutes(label);
      const outside = mins < startMin || mins >= endMin;
      if (!slot) {
        cell.classList.add('rbs-unknown');
        cell.title = `${label}: no data`;
      } else if (slot.state === 'free') {
        cell.classList.add('rbs-free');
        cell.title = `${label}: free`;
      } else if (slot.state === 'taken') {
        cell.classList.add('rbs-taken');
        cell.title = `${label}: booked`;
      } else if (slot.state === 'closed') {
        cell.classList.add('rbs-closed');
        cell.title = `${label}: not open for booking`;
      } else {
        cell.classList.add('rbs-unknown');
        cell.title = `${label}: unknown (status ${slot.status})`;
      }
      if (outside) cell.classList.add('rbs-outside');
    }
  }

  function markBlockFailed(roomId) {
    const entry = board.blocks.get(roomId);
    if (!entry) return;
    
    // Mark as failed
    entry.failed = true;
    
    // Update error text in status bar
    if (!ui) return;
    const errorEl = ui.errorIndicator?.querySelector('#rbs-error-text');
    if (errorEl) {
      errorEl.textContent = `Failed to load some rooms`;
      ui.errorIndicator.style.display = 'flex';
    }
  }

  // Count a room as reaching a terminal state (loaded or failed) exactly once.
  function accountRoom(roomId) {
    const entry = board.blocks.get(roomId);
    if (!entry || entry.accounted) return;
    entry.accounted = true;
    
    if (entry.failed) {
      board.failedCount += 1;
    } else {
      board.loadedCount += 1;
    }
  }

  // ---- queue setup ----------------------------------------------------------

  function setupObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
    board.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = e.target.getAttribute('data-rsrcid');
          const entry = id && board.blocks.get(id);
          if (entry && !entry.loaded) {
            board.queue.prioritize(id);
          }
        }
      },
      { root: getUI().boardScroll, threshold: 0.1 }
    );
    for (const entry of board.blocks.values()) {
      board.observer.observe(entry.rowEl);
    }
  }

  function updateProgress() {
    if (!ui) return;
    const statsEl = ui.stats?.querySelector('#rbs-stats-text');
    if (statsEl) {
      const inFlight = board.queue?.inFlight || 0;
      let statusText = queueStatus({
        loaded: board.loadedCount,
        total: board.totalCount,
        inFlight: inFlight,
        failed: board.failedCount
      });
      
      // Add warning for "All rooms" selection
      if (board.form && board.form.roomType === '' && board.totalCount >= 60) {
        statusText += ` (All rooms: ${board.totalCount} rooms, ~2.2 s each)`;
      }
      
      statsEl.textContent = statusText;
    }
  }

  function finalizeStatus() {
    if (board.observer) { board.observer.disconnect(); board.observer = null; }
    
    if (!ui) return;
    const statsEl = ui.stats?.querySelector('#rbs-stats-text');
    if (statsEl) {
      statsEl.textContent = queueStatus({
        loaded: board.loadedCount,
        total: board.totalCount,
        inFlight: 0,
        failed: board.failedCount
      });
    }
    
    // Clear any error text on successful completion
    const errorEl = ui.errorIndicator?.querySelector('#rbs-error-text');
    if (errorEl) {
      errorEl.textContent = '';
      ui.errorIndicator.style.display = 'none';
    }
  }

  // ---- selection & drawer -------------------------------------------------

  const FORBIDDEN_CLICK_IDS = [
    'btnBookingSave', 'btnConfirmBookingSave', 'btnBookingNext', 'btnBooking',
    'btnBookingMainClear', 'btnMultipleBookingConfirm', 'btnMultipleBookingConfirmSave',
  ];

  const SELECT_CONFIRM_MS = 2500;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let selectedRange = null; // { startCell, endCell, roomId }
  let drawer = null;

  function cssEscape(s) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
    return String(s).replace(/["\\]/g, '\\$&');
  }

  function findNativeCard(rsrcId) {
    const sel = `.cardinfoSingle[data-rsrcid="${cssEscape(rsrcId)}"]`;
    return document.querySelector(sel);
  }

  function detailPopupVisible() {
    const modal = document.getElementById('Modal-detailPopup');
    if (!modal) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(modal) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    return modal.offsetWidth > 0 || modal.offsetHeight > 0 || modal.classList.contains('show');
  }

  function selectionBadgeText() {
    const all = document.body ? document.body.textContent || '' : '';
    const m = /(\d+)\s+Facilit(?:y|ies)\s+Selected/i.exec(all);
    return m ? m[0] : null;
  }

  function scrollActionBarIntoView() {
    const anchor =
      document.getElementById('btnBooking') ||
      (() => {
        const candidates = Array.from(
          document.querySelectorAll('span, div, button, a, label')
        );
        return candidates.find((n) =>
          /\d+\s+Facilit(?:y|ies)\s+Selected/i.test((n.textContent || '').trim())
        );
      })();
    if (anchor && typeof anchor.scrollIntoView === 'function') {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }



  function rangeHasConflict(startIdx, endIdx, roomId) {
    const entry = board.blocks.get(roomId);
    if (!entry || !entry.loaded) return false;
    const s = Math.min(startIdx, endIdx);
    const e = Math.max(startIdx, endIdx);
    for (let i = s; i <= e; i++) {
      const cell = entry.cells[i];
      if (cell.classList.contains('rbs-taken')) return true;
    }
    return false;
  }

  async function bookRoom(room) {
    const card = findNativeCard(room.id);
    if (!card) return { ok: false, reason: 'card-not-found' };

    const forbidden = FORBIDDEN_CLICK_IDS.some((id) => card.id === id || card.closest('#' + id));
    if (forbidden) return { ok: false, reason: 'refused-forbidden-target' };

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.click();

    const deadline = Date.now() + SELECT_CONFIRM_MS;
    while (Date.now() < deadline) {
      await sleep(150);
      if (detailPopupVisible()) return { ok: true, signal: 'detail-popup' };
      const badge = selectionBadgeText();
      if (badge) {
        scrollActionBarIntoView();
        return { ok: true, signal: 'badge', badge };
      }
    }
    return { ok: false, reason: 'no-signal' };
  }

  function buildDrawer() {
    const drawerEl = el('div', { class: 'rbs-drawer' });
    const header = el('div', { class: 'rbs-drawer-header' }, [
      el('div', { class: 'rbs-drawer-title', text: 'Selected slots' }),
      el('button', { class: 'rbs-drawer-toggle', text: '×' })
    ]);
    const content = el('div', { class: 'rbs-drawer-content' });
    drawerEl.appendChild(header);
    drawerEl.appendChild(content);
    return { drawerEl, content };
  }

  function updateDrawer(room, range) {
    if (!drawer) {
      drawer = buildDrawer();
      getUI().main.appendChild(drawer.drawerEl);
    }
    
    const window = rangeToWindow(board.axis, range.startIdx, range.endIdx);
    const conflict = rangeHasConflict(range.startIdx, range.endIdx, room.id);
    
    drawer.content.innerHTML = '';
    
    const roomInfo = el('div', { class: 'rbs-selected-room' }, [
      el('div', { class: 'rbs-room-title', text: room.name }),
      el('div', { class: 'rbs-room-subtitle', text: room.type || '' }),
      el('div', { class: 'rbs-room-subtitle', text: `Capacity: ${room.capacity}` })
    ]);
    
    const windowInfo = el('div', { class: 'rbs-window-info' }, [
      el('div', { class: 'rbs-window-label', text: 'Selected window' }),
      el('div', { class: 'rbs-window-value', text: `${window.start} - ${window.end}` }),
      el('div', { class: 'rbs-slot-count', text: `${window.count} slot(s)` })
    ]);
    
    const actions = el('div', { class: 'rbs-drawer-actions' }, [
      el('button', { 
        class: 'rbs-drawer-btn rbs-primary',
        text: 'Book on native form'
      }),
      el('button', { 
        class: 'rbs-drawer-btn rbs-secondary',
        text: 'Clear'
      })
    ]);
    
    drawer.content.appendChild(roomInfo);
    drawer.content.appendChild(windowInfo);
    
    if (conflict) {
      const conflictNote = el('div', { class: 'rbs-conflict-note' }, [
        'Selected range contains taken slots'
      ]);
      drawer.content.appendChild(conflictNote);
    }
    
    drawer.content.appendChild(actions);
  }

  function clearSelection() {
    if (selectedRange) {
      // Clear visual selection
      const entry = board.blocks.get(selectedRange.roomId);
      if (entry) {
        for (let i = selectedRange.startIdx; i <= selectedRange.endIdx; i++) {
          entry.cells[i]?.classList.remove('rbs-selected');
        }
      }
      selectedRange = null;
    }
    if (drawer) {
      drawer.drawerEl.remove();
      drawer = null;
    }
  }

  // ---- cell click handling -------------------------------------------------

  function onCellClick(roomId, cellIdx, event) {
    const entry = board.blocks.get(roomId);
    if (!entry) return;
    
    if (event.shiftKey && selectedRange) {
      // Extend selection
      const newRange = {
        roomId,
        startIdx: Math.min(selectedRange.startIdx, cellIdx),
        endIdx: Math.max(selectedRange.endIdx, cellIdx)
      };
      
      // Clear old selection
      for (let i = selectedRange.startIdx; i <= selectedRange.endIdx; i++) {
        entry.cells[i]?.classList.remove('rbs-selected');
      }
      
      // Apply new selection
      for (let i = newRange.startIdx; i <= newRange.endIdx; i++) {
        entry.cells[i]?.classList.add('rbs-selected');
      }
      
      selectedRange = newRange;
      updateDrawer(entry.room, newRange);
    } else {
      // New selection
      clearSelection();
      
      entry.cells[cellIdx]?.classList.add('rbs-selected');
      selectedRange = { roomId, startIdx: cellIdx, endIdx: cellIdx };
      updateDrawer(entry.room, selectedRange);
    }
  }

  // ---- status bar ----------------------------------------------------------

  function buildStatusBar(hostElement) {
    const statusbar = el('div', { class: 'rbs-statusbar' });
    const stats = el('div', { class: 'rbs-stats' });
    const errorIndicator = el('div', { class: 'rbs-error-indicator' });
    errorIndicator.style.display = 'none';
    
    stats.appendChild(el('span', { id: 'rbs-stats-text', text: '0/0 rooms loaded · 0 requests in flight' }));
    errorIndicator.appendChild(el('span', { id: 'rbs-error-text' }));
    errorIndicator.appendChild(el('button', { class: 'rbs-retry-btn', text: 'retry' }));
    
    statusbar.appendChild(stats);
    statusbar.appendChild(errorIndicator);
    
    if (hostElement) {
      hostElement.appendChild(statusbar);
    }
    
    return { statusBar: statusbar, stats, errorIndicator };
  }

  // ---- hide/toggle native UI ------------------------------------------------

  function hideNativeUI() {
    try {
      // Add class to document element first
      document.documentElement.classList.add('rbsx-native-hidden');
      
      // Remove app hidden class to show the app
      if (ui && ui.host) {
        ui.host.classList.remove('rbs-app-hidden');
      }
      
      // Inject stylesheet to hide native UI elements
      const styleId = 'rbs-native-hide';
      let style = document.getElementById(styleId);
      if (!style) {
        style = el('style', { id: styleId });
        style.textContent = NATIVE_HIDE_SELECTORS.map(sel => `${sel} { display: none !important; }`).join('\n');
        document.head.appendChild(style);
      }
    } catch (err) {
      console.warn('Failed to hide native UI:', err);
    }
  }

  function showNativeUI() {
    const style = document.getElementById('rbs-native-hide');
    if (style) style.remove();
    document.documentElement.classList.remove('rbsx-native-hidden');
    
    // Add app hidden class to hide the app
    if (ui && ui.host) {
      ui.host.classList.add('rbs-app-hidden');
    }
  }

  // ---- keyboard shortcuts ---------------------------------------------------

  function keyToAction(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
      return null;
    }
    
    switch (event.key) {
      case '/':
        event.preventDefault();
        getUI().searchInput?.focus();
        return 'focus-search';
      case 'j':
      case 'ArrowDown':
        // TODO: navigate down
        return 'navigate-down';
      case 'k':
      case 'ArrowUp':
        // TODO: navigate up
        return 'navigate-up';
      case 'Enter':
        // TODO: open drawer/book
        return 'select';
      case 'd':
        // TODO: toggle drawer
        return 'toggle-drawer';
      case 'Escape':
        clearSelection();
        return 'clear';
      default:
        return null;
    }
  }

  // ---- fallback detection ---------------------------------------------------

  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  function shouldRevealNative() {
    return consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
  }

  function showFallbackBanner() {
    const banner = el('div', { class: 'rbs-fallback-banner' }, [
      el('span', { text: 'Lintel failed repeatedly. Showing native interface.' }),
      el('button', { class: 'rbs-fallback-close', text: '×' })
    ]);
    document.body.appendChild(banner);
    
    banner.querySelector('.rbs-fallback-close').addEventListener('click', () => {
      banner.remove();
    });
    
    return banner;
  }

  // ---- storage --------------------------------------------------------------

  function saveLast(form) {
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: form });
    } catch (e) { /* non-fatal */ }
  }

  function loadLast() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([STORAGE_KEY], (res) => resolve((res && res[STORAGE_KEY]) || null));
      } catch (e) { resolve(null); }
    });
  }

  function applyForm(form, roomTypes, windowOpts) {
    if (!form) return;
    const currentUI = getUI();
    
    if (form.roomType != null &&
        (form.roomType === '' || roomTypes.includes(form.roomType))) {
      currentUI.typeSelect.value = form.roomType;
    }
    if (form.date) {
      // Select date chip
      const chip = currentUI.dateChips.querySelector(`[data-date="${form.date}"]`);
      if (chip) {
        currentUI.dateChips.querySelectorAll('.rbs-date-chip').forEach(c => c.classList.remove('rbs-selected'));
        chip.classList.add('rbs-selected');
      }
    }
    if (form.window) {
      if (form.window.start && windowOpts.from.includes(form.window.start)) currentUI.startSelect.value = form.window.start;
      if (form.window.end && windowOpts.to.includes(form.window.end)) currentUI.endSelect.value = form.window.end;
    }
    if (form.minCapacity != null) currentUI.capInput.value = String(form.minCapacity);
    if (form.sort) currentUI.sortSelect.value = form.sort;
  }

  // ---- reload coordination -------------------------------------------------

  let reloadInProgress = false;
  let queuedReload = false;

  function requestReload(reason) {
    console.log('requestReload:', reason);
    
    // If a reload is already in progress, queue another one
    if (reloadInProgress) {
      queuedReload = true;
      return;
    }
    
    // Start reload
    reloadInProgress = true;
    
    // Disable controls during reload
    disableControls(true);
    
    // Show loading status
    updateStatusBarLoading();
    
    // Execute the load
    onLoadBoard().finally(() => {
      reloadInProgress = false;
      disableControls(false);
      
      // If another reload was queued while we were loading, run it now
      if (queuedReload) {
        queuedReload = false;
        setTimeout(() => requestReload('queued'), 50);
      }
    });
  }

  function disableControls(disabled) {
    if (!ui) return;
    
    const controls = [
      ui.buildingSelect,
      ui.typeSelect,
      ui.capInput,
      ui.searchInput,
      ui.startSelect,
      ui.endSelect,
      ui.sortSelect,
      ui.refreshBtn
    ];
    
    controls.forEach(control => {
      if (control) control.disabled = disabled;
    });
    
    // Also disable date chips
    if (ui.dateChips) {
      ui.dateChips.querySelectorAll('.rbs-date-chip').forEach(chip => {
        chip.style.pointerEvents = disabled ? 'none' : '';
        chip.style.opacity = disabled ? '0.5' : '';
      });
    }
  }

  function updateStatusBarLoading() {
    if (!ui || !ui.stats) return;
    
    const statsEl = ui.stats.querySelector('#rbs-stats-text');
    if (statsEl) {
      statsEl.textContent = 'Loading…';
    }
    
    // Clear any previous error
    const errorEl = ui.errorIndicator?.querySelector('#rbs-error-text');
    if (errorEl) {
      errorEl.textContent = '';
      ui.errorIndicator.style.display = 'none';
    }
  }

  function showError(message) {
    if (!ui || !ui.errorIndicator) return;
    
    const errorEl = ui.errorIndicator.querySelector('#rbs-error-text');
    if (errorEl) {
      errorEl.textContent = message;
      ui.errorIndicator.style.display = 'flex';
    }
    
    // Update stats to show error
    const statsEl = ui.stats?.querySelector('#rbs-stats-text');
    if (statsEl) {
      statsEl.textContent = 'Error';
    }
  }

  function showEmptyState(message) {
    if (!ui) return;
    
    // Clear the board
    if (ui.boardRows) {
      ui.boardRows.innerHTML = '';
    }
    
    // Show message in stats
    const statsEl = ui.stats?.querySelector('#rbs-stats-text');
    if (statsEl) {
      statsEl.textContent = message;
    }
    
    // Clear any error
    const errorEl = ui.errorIndicator?.querySelector('#rbs-error-text');
    if (errorEl) {
      errorEl.textContent = '';
      ui.errorIndicator.style.display = 'none';
    }
    
    // Update board state
    board.blocks = new Map();
    board.loadedCount = 0;
    board.totalCount = 0;
    board.failedCount = 0;
  }

  // ---- main Load board flow ------------------------------------------------

  async function onLoadBoard() {
    // Guard against null ui
    if (!ui) {
      renderFatal('Panel not initialized');
      return;
    }
    
    // Read form from UI
    const currentUI = getUI();
    const form = {
      roomType: currentUI.typeSelect.value,
      date: currentUI.dateChips.querySelector('.rbs-date-chip.rbs-selected')?.dataset.date || formatDate(new Date()),
      // Narrow windows are clamped into the day window: asking the server for a
      // window it no longer offers (e.g. an inherited 12:00 pin) returns slots that
      // start late and then align to nothing.
      // The board is pinned to the drawn day window; the user's window only dims
      // cells (see paintBlock). Never narrow the request itself.
      window: { start: DAY_WINDOW.start, end: DAY_WINDOW.end },
      minCapacity: Number(currentUI.capInput.value) || 0,
      sort: currentUI.sortSelect.value,
    };

    // Validate the window.
    const sMin = timeToMinutes(form.window.start);
    const eMin = timeToMinutes(form.window.end);
    if (isNaN(sMin) || isNaN(eMin) || eMin <= sMin) {
      showError('Invalid time window');
      return;
    }

    // A new load bumps the generation: any in-flight queue is abandoned.
    board.generation += 1;
    if (board.queue) board.queue.bumpGeneration();

    board.form = form;
    board.blocks = new Map();
    board.loadedCount = 0;
    board.totalCount = 0;
    board.failedCount = 0;
    if (board.observer) { board.observer.disconnect(); board.observer = null; }
    
    // Reset status bar
    updateProgress();

    let rooms;
    try {
      rooms = await fetchRooms(form);
    } catch (e) {
      showError(`Failed to load rooms: ${e.message}`);
      return;
    }

    const roomsFromSearch = rooms.length;
    
    // Filter equipment out of "All rooms"
    const roomTypesList = readRoomTypes(); // Read fresh each time
    const filtered = filterRooms(rooms, form.roomType, form.minCapacity, roomTypesList);
    
    const ordered = sortRooms(filtered, form.sort);
    
    if (ordered.length === 0) {
      showEmptyState('No rooms match these filters. Widen the room type or clear the min capacity.');
      return;
    }

    // Render skeleton
    renderBoardSkeleton(ordered);

    // Build the single-flight queue
    const myGen = board.generation;
    board.queue = createSlotQueue({
      fetcher: (room) => fetchSlots(room, form),
      date: form.date,
      // Must match what fetchSlots actually requests (DAY_WINDOW), or the cache key
      // is built from the user's window and every narrowed window refetches/ghosts.
      window: DAY_WINDOW,
      status: 'All',
      cache: board.cache,
      onLoaded: (roomId, slots) => {
        if (board.generation !== myGen) return; // stale: do not paint
        paintBlock(roomId, slots);
        accountRoom(roomId);
        updateProgress();
      },
      onError: (roomId, err) => {
        if (board.generation !== myGen) return;
        markBlockFailed(roomId);
        accountRoom(roomId);
        updateProgress();
      },
      onDone: () => {
        if (board.generation !== myGen) return;
        const freeCells = ui.boardRows ? ui.boardRows.querySelectorAll('.rbs-free').length : 0;
        const total = ui.boardRows ? ui.boardRows.querySelectorAll('.rbs-slot-cell').length : 0;
        if (total > 0 && freeCells === 0) {
          const statsEl = ui.stats && ui.stats.querySelector('#rbs-stats-text');
          if (statsEl) {
            statsEl.textContent = 'No bookable slots on this date: every slot is closed. Try the next day.';
          }
        }
      },
    });

    board.queue.enqueue(ordered);
    setupObserver();
    
    board.queue.run().then(() => {
      if (board.generation !== myGen) return;
      finalizeStatus();
    });
  }

  // ---- sorting --------------------------------------------------------------

  function sortRooms(rooms, sort) {
    const list = rooms.slice();
    if (sort === 'capacity') {
      list.sort((a, b) => b.capacity - a.capacity || a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }

  // ---- init -----------------------------------------------------------------

  async function initSearchPage() {
    // Single-init guard
    if (window.__rbsPanelInitialized) return;
    window.__rbsPanelInitialized = true;
    
    let localUI = null;
    try {
      const missing = missingControlIds();
      const hostEl = el('div', { id: 'sit-lintel-host' });
      document.body.appendChild(hostEl);
      const shadow = hostEl.attachShadow({ mode: 'open' });
      
      const shellUI = buildFullPageShell(shadow, missing);
      if (!shellUI) {
        renderFatal('Failed to build full page shell');
        return;
      }
      
      // Build top bar (Pass 2) - but DON'T attach listeners yet
      const roomTypes = readRoomTypes();
      const windowOpts = readWindowOptions();
      const topBar = buildTopBar(shellUI, roomTypes, windowOpts, false); // false = no listeners
      
      // Build status bar (Pass 5)
      const statusBar = buildStatusBar(shellUI.host);
      
      // Combine UI references into local object first
      localUI = { ...shellUI, ...topBar, ...statusBar };
      
      // Run self-check before assigning to global ui
      const check = selfCheck(localUI);
      if (shouldRevealNativeOnFailure(check)) {
        // Show native UI and render error
        showNativeUI();
        renderFatal('UI self-check failed: ' + check.missing.join(', '));
        return;
      }
      
      // Now attach event listeners safely
      attachEventListeners(localUI);
      
      // Only now assign to global ui
      ui = localUI;
      
      // Hide native UI only AFTER self-check passes and UI is assigned
      hideNativeUI();
      
      // Populate building select asynchronously, which will also update room types and window options
      populateBuildingSelect(ui.buildingSelect, ui.typeSelect, ui.startSelect, ui.endSelect).then(() => {
        // After building select is populated and room types/window options are updated,
        // Apply default form (first concrete room type + native building)
        const nativeState = {
          // readRoomTypes() also returns the native placeholder ("Resource Type");
          // feeding that to defaultForm picks it as the first concrete type.
          roomTypes: (function () {
            const fromSelect = readControlOptions(ui.typeSelect)
              .map(o => (o.textContent || '').trim())
              .filter(t => t && !/^Resource Type$/i.test(t));
            return fromSelect.length ? fromSelect : readRoomTypes();
          })(),
          building: readIdValue(RBS_CONTROL_IDS.building),
          buildingName: readBuildingName()
        };
        const defaultFormValues = defaultForm(nativeState);
        // Shoelace option values are DOM-safe (spaced values become underscores), so
        // the option's value may be "Discussion_Room" where the default says
        // "Discussion Room". Resolve by option text, then by normalised value.
        const resolveValue = (control, wanted) => {
          if (!control || !wanted) return null;
          const norm = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
          const opts = readControlOptions(control);
          const byValue = opts.find(o => (o.value || o.getAttribute('value') || '') === wanted);
          if (byValue) return byValue.value || byValue.getAttribute('value');
          const byText = opts.find(o => (o.textContent || '').trim() === wanted);
          if (byText) return byText.value || byText.getAttribute('value');
          const byNorm = opts.find(o => norm(o.value || o.getAttribute('value') || '') === norm(wanted) || norm(o.textContent || '') === norm(wanted));
          return byNorm ? (byNorm.value || byNorm.getAttribute('value')) : null;
        };
        const wantedType = resolveValue(ui.typeSelect, defaultFormValues.roomType);
        if (wantedType) ui.typeSelect.value = wantedType;
        const wantedBuilding = resolveValue(ui.buildingSelect, defaultFormValues.building);
        if (wantedBuilding && !ui.buildingSelect.disabled) ui.buildingSelect.value = wantedBuilding;
        
        // Override room type with first concrete type
        if (defaultFormValues.roomType && ui.typeSelect) {
          // Check if this room type exists in the select
          const roomTypeExists = readControlOptions(ui.typeSelect)
            .some(opt => (opt.value || opt.getAttribute('value') || '') === defaultFormValues.roomType);
          
          if (roomTypeExists) {
            ui.typeSelect.value = defaultFormValues.roomType;
          }
        }
        
        // Set building if available
        if (defaultFormValues.building && ui.buildingSelect && !ui.buildingSelect.disabled) {
          // Check if building exists in select
          const buildingExists = readControlOptions(ui.buildingSelect)
            .some(opt => (opt.value || opt.getAttribute('value') || '') === defaultFormValues.building);
          
          if (buildingExists) {
            ui.buildingSelect.value = defaultFormValues.building;
          }
        }
        
        // Trigger initial load if all required fields are available
        if (ui.buildingSelect.disabled === false) {
          // Check if we have valid form values
          const hasBuilding = ui.buildingSelect.value !== '';
          const hasDate = ui.dateChips.querySelector('.rbs-date-chip.rbs-selected') !== null;
          const hasStart = ui.startSelect.value && ui.startSelect.options.length > 0;
          const hasEnd = ui.endSelect.value && ui.endSelect.options.length > 0;
          
          if (hasBuilding || hasDate || (hasStart && hasEnd)) {
            // Wait for a concrete room type to land before the first search: reading
            // #resourceType too early yields only the placeholder, and an empty type
            // means "All rooms" = ~60 rooms at ~2.2 s per serialised slot call.
            const startInitialLoad = (attempt) => {
              let currentType = ui.typeSelect.value;
              if (!currentType) {
                // Selects used to be built with spaced values ("Discussion Room");
                // they now carry underscored ones ("Discussion_Room"). Pick the first
                // concrete type ourselves rather than trusting ui.typeSelect.value.
                const concrete = readControlOptions(ui.typeSelect)
                  .find(o => {
                    const v = o.value || o.getAttribute('value') || '';
                    return v && !/^Resource_?Type$/i.test(v);
                  });
                if (concrete) {
                  ui.typeSelect.value = concrete.value || concrete.getAttribute('value');
                  currentType = ui.typeSelect.value;
                }
              }
              if (!currentType && attempt < 6) {
                setTimeout(() => startInitialLoad(attempt + 1), 500);
                return;
              }
              if (!currentType) {
                // Still nothing usable after ~3 s: fall back to the loaded state we have.
                ui.typeSelect.value = '';
              }
              requestReload('initial');
            };
            setTimeout(() => startInitialLoad(0), 100);
          }
        }
      }).catch(err => {
        console.warn('Failed to populate building select:', err);
      });
      
      // Add keyboard listeners
      document.addEventListener('keydown', (e) => {
        const action = keyToAction(e);
        if (action) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      
      // Restore last search (but don't auto-run) - but override with defaults
      const last = await loadLast();
      if (last) applyForm(last, roomTypes, windowOpts);
      
      return ui;
    } catch (error) {
      // Show native UI on any init failure
      showNativeUI();
      renderFatal(`Init failed: ${error.message}`);
      return null;
    }
  }

  function initLauncher() {
    const host = el('div', { id: 'rbs-room-finder-launcher-host' });
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.appendChild(el('style', { text: PANEL_CSS }));
    const link = el('a', { href: SEARCH_PATH, text: '\uD83D\uDD0D Open Lintel' });
    shadow.appendChild(el('div', { class: 'rbs-launcher' }, [link]));
  }

  // Publish a snapshot for the popup (storage-only, no extra permission).
  function publishProbe() {
    try {
      chrome.storage.local.set({
        rbsProbe: {
          url: location.href,
          path: location.pathname,
          isSearchPage: isSearchPage(),
          missing: missingControlIds(),
          roomTypes: isSearchPage() ? readRoomTypes() : [],
          at: Date.now(),
        },
      });
    } catch (e) { /* non-fatal */ }
  }

  // ---- lintel bridge ----------------------------------------------------------
  //
  // ONE narrow, namespaced seam so the Lintel (React/shadcn) skin can drive this
  // panel's real search engine without reaching into its private closure or
  // touching content/native.js. Everything here is additive: the old panel
  // keeps working exactly as before whether or not Lintel ever calls the bridge.
  //
  //   window.__rbsBridge.readState()          -> live native page state
  //   window.__rbsBridge.applyForm(form)      -> push a form into the engine
  //   window.__rbsBridge.requestReload(reason)-> run the engine (single-flight)
  //   window.__rbsBridge.subscribe(fn)         -> notified on native changes
  //
  // The bridge is installed on every page load (below), BEFORE lintel.bundle.js
  // mounts, so the skin can rely on it existing the moment it renders.

  const BRIDGE_EVENT = 'rbs:native-change';
  const bridgeListeners = new Set();

  // Resolve a wanted room-type (option TEXT like "Discussion Room", a value
  // like "Discussion_Room", or '') against a panel select's options. Returns
  // the option's own value so panel's fetchRooms (which maps _ -> space) is fed
  // exactly what it expects. '' always maps to "All rooms".
  function resolveTypeValue(control, wanted) {
    if (!control) return '';
    if (wanted === '' || wanted == null) return '';
    const norm = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
    const opts = readControlOptions(control);
    const val = (o) => o.value || o.getAttribute('value') || '';
    const byValue = opts.find((o) => val(o) === wanted);
    if (byValue) return val(byValue);
    const byText = opts.find((o) => (o.textContent || '').trim() === wanted);
    if (byText) return val(byText);
    const byNorm = opts.find((o) => norm(val(o)) === norm(wanted) || norm(o.textContent || '') === norm(wanted));
    return byNorm ? val(byNorm) : '';
  }

  // Read the live native page state the skin needs to render reactively. Pure
  // reads of the native DOM — never mutates anything.
  function bridgeReadState() {
    const buildingSel = document.getElementById(RBS_CONTROL_IDS.building);
    const buildings = buildingSel
      ? Array.from(buildingSel.options)
          .map((o) => ({ value: o.value || '', text: (o.textContent || '').trim() }))
          .filter((o) => o.text && !/^-+$/.test(o.text) && !/please select/i.test(o.text))
      : [];
    return {
      roomTypes: readRoomTypes(),
      windowOptions: readWindowOptions(),
      buildings,
      building: readIdValue(RBS_CONTROL_IDS.building),
      buildingName: readBuildingName(),
      date: (ui && ui.dateChips &&
        ui.dateChips.querySelector('.rbs-date-chip.rbs-selected')?.dataset.date) || formatDate(new Date()),
    };
  }

  // Notify every bridge subscriber (the skin) that native state moved.
  function notifyBridge(reason) {
    const state = bridgeReadState();
    for (const fn of bridgeListeners) {
      try { fn({ reason, state }); } catch (e) { /* subscriber error is non-fatal */ }
    }
    try {
      window.dispatchEvent(new CustomEvent(BRIDGE_EVENT, { detail: { reason, state } }));
    } catch (e) { /* CustomEvent unsupported: listeners still ran */ }
  }

  // Push a Lintel form into the panel engine's own controls so onLoadBoard reads
  // exactly these values. Building changes drive the native cascade so room
  // types / window options repopulate just like the native select would.
  function bridgeApplyForm(form) {
    if (!ui || !form) return;

    // Building: set the panel's own select AND the native select, then fire the
    // native change so RBS repopulates #resourceType / #SearchHoursFrom/To.
    if (form.building != null) {
      const nativeBuilding = document.getElementById(RBS_CONTROL_IDS.building);
      if (nativeBuilding && nativeBuilding.value !== form.building) {
        const exists = Array.from(nativeBuilding.options).some((o) => o.value === form.building);
        if (exists || form.building === '') {
          nativeBuilding.value = form.building;
          nativeBuilding.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      if (ui.buildingSelect && !ui.buildingSelect.disabled) {
        const bOpts = readControlOptions(ui.buildingSelect).map((o) => o.value || o.getAttribute('value') || '');
        if (bOpts.includes(form.building)) ui.buildingSelect.value = form.building;
      }
      // Rebuild the dependent panel selects from the refreshed native cascade.
      updateTypeAndWindowSelects(ui.typeSelect, ui.startSelect, ui.endSelect);
    }

    // Room type: resolve against the panel select's own options.
    if (form.roomType != null && ui.typeSelect) {
      ui.typeSelect.value = resolveTypeValue(ui.typeSelect, form.roomType);
    }

    // Capacity.
    if (form.minCapacity != null && ui.capInput) {
      ui.capInput.value = String(form.minCapacity);
    }

    // Free-text search.
    if (form.search != null && ui.searchInput) {
      ui.searchInput.value = String(form.search);
    }

    // Date: select the matching chip (panel reads the selected chip's data-date).
    if (form.date && ui.dateChips) {
      const chip = ui.dateChips.querySelector(`[data-date="${form.date}"]`);
      if (chip) {
        ui.dateChips.querySelectorAll('.rbs-date-chip').forEach((c) => c.classList.remove('rbs-selected'));
        chip.classList.add('rbs-selected');
      }
    }

    // Window start/end (dims cells; the request stays pinned to DAY_WINDOW).
    if (form.window && ui.startSelect && ui.endSelect) {
      const wo = readWindowOptions();
      if (form.window.start && wo.from.includes(form.window.start)) ui.startSelect.value = form.window.start;
      if (form.window.end && wo.to.includes(form.window.end)) ui.endSelect.value = form.window.end;
    }

    // Sort.
    if (form.sort && ui.sortSelect) {
      ui.sortSelect.value = form.sort;
    }
  }

  // Wire native control changes through to bridge subscribers so the skin can
  // mirror live page state instead of a one-time mount snapshot.
  function wireNativeChangeBridge() {
    const ids = [
      RBS_CONTROL_IDS.campus,
      RBS_CONTROL_IDS.building,
      RBS_CONTROL_IDS.resourceType,
      RBS_CONTROL_IDS.start,
      RBS_CONTROL_IDS.end,
    ];
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) {
        node.addEventListener('change', () => notifyBridge(id));
      }
    }
  }

  function installBridge() {
    if (window.__rbsBridge) return; // never clobber an existing bridge
    window.__rbsBridge = Object.freeze({
      version: 1,
      readState: bridgeReadState,
      applyForm: bridgeApplyForm,
      requestReload: (reason) => requestReload(reason || 'lintel'),
      subscribe: (fn) => {
        if (typeof fn !== 'function') return () => {};
        bridgeListeners.add(fn);
        return () => bridgeListeners.delete(fn);
      },
      eventName: BRIDGE_EVENT,
    });
  }

  // Full-site takeover: Lintel is now the DEFAULT skin on EVERY path of the RBS
  // origin, not just the search page. This mirrors the exact decision in
  // src/main.tsx (lintelDefaultOn): Lintel owns the whole origin unless the
  // `?lintel=0` escape hatch is present. When Lintel owns the page, the old panel
  // (board OR launcher) stands down entirely so the two UIs never race, never
  // double-fetch, and the launcher never appears on top of the Lintel shell. The
  // old path only runs under `?lintel=0` (board on the search page, launcher
  // elsewhere), reaching the untouched native page.
  function lintelDefaultOn() {
    try {
      if (/(?:^|[?&])lintel=0(?:&|$)/.test(location.search)) return false; // escape hatch
      return true; // own every path on the origin
    } catch (e) {
      return false;
    }
  }

  function init() {
    if (!document.body) {
      window.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }
    // Install the bridge on every load, before Lintel mounts, so the skin always
    // finds it. It reads ui/board lazily, so it is safe to install before init.
    installBridge();
    publishProbe();
    if (document.getElementById('sit-lintel-host') ||
        document.getElementById('rbs-room-finder-launcher-host')) {
      return;
    }
    // Lintel owns every page by default. Do NOT build the old board or the
    // launcher (either would double up on the Lintel shell / double-fetch). Only
    // the `?lintel=0` escape hatch falls through to the old panel UI.
    if (lintelDefaultOn()) return;
    if (isSearchPage()) {
      initSearchPage();
      wireNativeChangeBridge();
    } else {
      initLauncher();
    }
  }

  init();
})();

/* --- content/lintel.bundle.js (the Lintel React app) --- */

"use strict";(()=>{var sT=Object.create;var rv=Object.defineProperty;var uT=Object.getOwnPropertyDescriptor;var dT=Object.getOwnPropertyNames;var cT=Object.getPrototypeOf,fT=Object.prototype.hasOwnProperty;var Fa=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var pT=(e,t,o,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of dT(t))!fT.call(e,r)&&r!==o&&rv(e,r,{get:()=>t[r],enumerable:!(a=uT(t,r))||a.enumerable});return e};var k=(e,t,o)=>(o=e!=null?sT(cT(e)):{},pT(t||!e||!e.__esModule?rv(o,"default",{value:e,enumerable:!0}):o,e));var js=(()=>{for(var e=new Uint8Array(128),t=0;t<64;t++)e[t<26?t+65:t<52?t+71:t<62?t-4:t*4-205]=t;return o=>{for(var a=o.length,r=new Uint8Array((a-(o[a-1]=="=")-(o[a-2]=="="))*3/4|0),n=0,l=0;n<a;){var i=e[o.charCodeAt(n++)],s=e[o.charCodeAt(n++)],u=e[o.charCodeAt(n++)],d=e[o.charCodeAt(n++)];r[l++]=i<<2|s>>4,r[l++]=s<<4|u>>2,r[l++]=u<<6|d}return r}})();var hv=Fa(xe=>{"use strict";var si=Symbol.for("react.element"),mT=Symbol.for("react.portal"),gT=Symbol.for("react.fragment"),hT=Symbol.for("react.strict_mode"),vT=Symbol.for("react.profiler"),xT=Symbol.for("react.provider"),wT=Symbol.for("react.context"),yT=Symbol.for("react.forward_ref"),bT=Symbol.for("react.suspense"),ST=Symbol.for("react.memo"),CT=Symbol.for("react.lazy"),nv=Symbol.iterator;function LT(e){return e===null||typeof e!="object"?null:(e=nv&&e[nv]||e["@@iterator"],typeof e=="function"?e:null)}var sv={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},uv=Object.assign,dv={};function Un(e,t,o){this.props=e,this.context=t,this.refs=dv,this.updater=o||sv}Un.prototype.isReactComponent={};Un.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Un.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function cv(){}cv.prototype=Un.prototype;function Xc(e,t,o){this.props=e,this.context=t,this.refs=dv,this.updater=o||sv}var Yc=Xc.prototype=new cv;Yc.constructor=Xc;uv(Yc,Un.prototype);Yc.isPureReactComponent=!0;var lv=Array.isArray,fv=Object.prototype.hasOwnProperty,Qc={current:null},pv={key:!0,ref:!0,__self:!0,__source:!0};function mv(e,t,o){var a,r={},n=null,l=null;if(t!=null)for(a in t.ref!==void 0&&(l=t.ref),t.key!==void 0&&(n=""+t.key),t)fv.call(t,a)&&!pv.hasOwnProperty(a)&&(r[a]=t[a]);var i=arguments.length-2;if(i===1)r.children=o;else if(1<i){for(var s=Array(i),u=0;u<i;u++)s[u]=arguments[u+2];r.children=s}if(e&&e.defaultProps)for(a in i=e.defaultProps,i)r[a]===void 0&&(r[a]=i[a]);return{$$typeof:si,type:e,key:n,ref:l,props:r,_owner:Qc.current}}function kT(e,t){return{$$typeof:si,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Zc(e){return typeof e=="object"&&e!==null&&e.$$typeof===si}function IT(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(o){return t[o]})}var iv=/\/+/g;function Kc(e,t){return typeof e=="object"&&e!==null&&e.key!=null?IT(""+e.key):t.toString(36)}function Xs(e,t,o,a,r){var n=typeof e;(n==="undefined"||n==="boolean")&&(e=null);var l=!1;if(e===null)l=!0;else switch(n){case"string":case"number":l=!0;break;case"object":switch(e.$$typeof){case si:case mT:l=!0}}if(l)return l=e,r=r(l),e=a===""?"."+Kc(l,0):a,lv(r)?(o="",e!=null&&(o=e.replace(iv,"$&/")+"/"),Xs(r,t,o,"",function(u){return u})):r!=null&&(Zc(r)&&(r=kT(r,o+(!r.key||l&&l.key===r.key?"":(""+r.key).replace(iv,"$&/")+"/")+e)),t.push(r)),1;if(l=0,a=a===""?".":a+":",lv(e))for(var i=0;i<e.length;i++){n=e[i];var s=a+Kc(n,i);l+=Xs(n,t,o,s,r)}else if(s=LT(e),typeof s=="function")for(e=s.call(e),i=0;!(n=e.next()).done;)n=n.value,s=a+Kc(n,i++),l+=Xs(n,t,o,s,r);else if(n==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return l}function Ks(e,t,o){if(e==null)return e;var a=[],r=0;return Xs(e,a,"","",function(n){return t.call(o,n,r++)}),a}function RT(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(o){(e._status===0||e._status===-1)&&(e._status=1,e._result=o)},function(o){(e._status===0||e._status===-1)&&(e._status=2,e._result=o)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var Kt={current:null},Ys={transition:null},TT={ReactCurrentDispatcher:Kt,ReactCurrentBatchConfig:Ys,ReactCurrentOwner:Qc};function gv(){throw Error("act(...) is not supported in production builds of React.")}xe.Children={map:Ks,forEach:function(e,t,o){Ks(e,function(){t.apply(this,arguments)},o)},count:function(e){var t=0;return Ks(e,function(){t++}),t},toArray:function(e){return Ks(e,function(t){return t})||[]},only:function(e){if(!Zc(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};xe.Component=Un;xe.Fragment=gT;xe.Profiler=vT;xe.PureComponent=Xc;xe.StrictMode=hT;xe.Suspense=bT;xe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=TT;xe.act=gv;xe.cloneElement=function(e,t,o){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var a=uv({},e.props),r=e.key,n=e.ref,l=e._owner;if(t!=null){if(t.ref!==void 0&&(n=t.ref,l=Qc.current),t.key!==void 0&&(r=""+t.key),e.type&&e.type.defaultProps)var i=e.type.defaultProps;for(s in t)fv.call(t,s)&&!pv.hasOwnProperty(s)&&(a[s]=t[s]===void 0&&i!==void 0?i[s]:t[s])}var s=arguments.length-2;if(s===1)a.children=o;else if(1<s){i=Array(s);for(var u=0;u<s;u++)i[u]=arguments[u+2];a.children=i}return{$$typeof:si,type:e.type,key:r,ref:n,props:a,_owner:l}};xe.createContext=function(e){return e={$$typeof:wT,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:xT,_context:e},e.Consumer=e};xe.createElement=mv;xe.createFactory=function(e){var t=mv.bind(null,e);return t.type=e,t};xe.createRef=function(){return{current:null}};xe.forwardRef=function(e){return{$$typeof:yT,render:e}};xe.isValidElement=Zc;xe.lazy=function(e){return{$$typeof:CT,_payload:{_status:-1,_result:e},_init:RT}};xe.memo=function(e,t){return{$$typeof:ST,type:e,compare:t===void 0?null:t}};xe.startTransition=function(e){var t=Ys.transition;Ys.transition={};try{e()}finally{Ys.transition=t}};xe.unstable_act=gv;xe.useCallback=function(e,t){return Kt.current.useCallback(e,t)};xe.useContext=function(e){return Kt.current.useContext(e)};xe.useDebugValue=function(){};xe.useDeferredValue=function(e){return Kt.current.useDeferredValue(e)};xe.useEffect=function(e,t){return Kt.current.useEffect(e,t)};xe.useId=function(){return Kt.current.useId()};xe.useImperativeHandle=function(e,t,o){return Kt.current.useImperativeHandle(e,t,o)};xe.useInsertionEffect=function(e,t){return Kt.current.useInsertionEffect(e,t)};xe.useLayoutEffect=function(e,t){return Kt.current.useLayoutEffect(e,t)};xe.useMemo=function(e,t){return Kt.current.useMemo(e,t)};xe.useReducer=function(e,t,o){return Kt.current.useReducer(e,t,o)};xe.useRef=function(e){return Kt.current.useRef(e)};xe.useState=function(e){return Kt.current.useState(e)};xe.useSyncExternalStore=function(e,t,o){return Kt.current.useSyncExternalStore(e,t,o)};xe.useTransition=function(){return Kt.current.useTransition()};xe.version="18.3.1"});var z=Fa((uB,vv)=>{"use strict";vv.exports=hv()});var Rv=Fa(ze=>{"use strict";function of(e,t){var o=e.length;e.push(t);e:for(;0<o;){var a=o-1>>>1,r=e[a];if(0<Qs(r,t))e[a]=t,e[o]=r,o=a;else break e}}function $o(e){return e.length===0?null:e[0]}function Js(e){if(e.length===0)return null;var t=e[0],o=e.pop();if(o!==t){e[0]=o;e:for(var a=0,r=e.length,n=r>>>1;a<n;){var l=2*(a+1)-1,i=e[l],s=l+1,u=e[s];if(0>Qs(i,o))s<r&&0>Qs(u,i)?(e[a]=u,e[s]=o,a=s):(e[a]=i,e[l]=o,a=l);else if(s<r&&0>Qs(u,o))e[a]=u,e[s]=o,a=s;else break e}}return t}function Qs(e,t){var o=e.sortIndex-t.sortIndex;return o!==0?o:e.id-t.id}typeof performance=="object"&&typeof performance.now=="function"?(xv=performance,ze.unstable_now=function(){return xv.now()}):(Jc=Date,wv=Jc.now(),ze.unstable_now=function(){return Jc.now()-wv});var xv,Jc,wv,ua=[],ir=[],PT=1,Eo=null,Ht=3,eu=!1,tn=!1,di=!1,Sv=typeof setTimeout=="function"?setTimeout:null,Cv=typeof clearTimeout=="function"?clearTimeout:null,yv=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function af(e){for(var t=$o(ir);t!==null;){if(t.callback===null)Js(ir);else if(t.startTime<=e)Js(ir),t.sortIndex=t.expirationTime,of(ua,t);else break;t=$o(ir)}}function rf(e){if(di=!1,af(e),!tn)if($o(ua)!==null)tn=!0,lf(nf);else{var t=$o(ir);t!==null&&sf(rf,t.startTime-e)}}function nf(e,t){tn=!1,di&&(di=!1,Cv(ci),ci=-1),eu=!0;var o=Ht;try{for(af(t),Eo=$o(ua);Eo!==null&&(!(Eo.expirationTime>t)||e&&!Iv());){var a=Eo.callback;if(typeof a=="function"){Eo.callback=null,Ht=Eo.priorityLevel;var r=a(Eo.expirationTime<=t);t=ze.unstable_now(),typeof r=="function"?Eo.callback=r:Eo===$o(ua)&&Js(ua),af(t)}else Js(ua);Eo=$o(ua)}if(Eo!==null)var n=!0;else{var l=$o(ir);l!==null&&sf(rf,l.startTime-t),n=!1}return n}finally{Eo=null,Ht=o,eu=!1}}var tu=!1,Zs=null,ci=-1,Lv=5,kv=-1;function Iv(){return!(ze.unstable_now()-kv<Lv)}function ef(){if(Zs!==null){var e=ze.unstable_now();kv=e;var t=!0;try{t=Zs(!0,e)}finally{t?ui():(tu=!1,Zs=null)}}else tu=!1}var ui;typeof yv=="function"?ui=function(){yv(ef)}:typeof MessageChannel<"u"?(tf=new MessageChannel,bv=tf.port2,tf.port1.onmessage=ef,ui=function(){bv.postMessage(null)}):ui=function(){Sv(ef,0)};var tf,bv;function lf(e){Zs=e,tu||(tu=!0,ui())}function sf(e,t){ci=Sv(function(){e(ze.unstable_now())},t)}ze.unstable_IdlePriority=5;ze.unstable_ImmediatePriority=1;ze.unstable_LowPriority=4;ze.unstable_NormalPriority=3;ze.unstable_Profiling=null;ze.unstable_UserBlockingPriority=2;ze.unstable_cancelCallback=function(e){e.callback=null};ze.unstable_continueExecution=function(){tn||eu||(tn=!0,lf(nf))};ze.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):Lv=0<e?Math.floor(1e3/e):5};ze.unstable_getCurrentPriorityLevel=function(){return Ht};ze.unstable_getFirstCallbackNode=function(){return $o(ua)};ze.unstable_next=function(e){switch(Ht){case 1:case 2:case 3:var t=3;break;default:t=Ht}var o=Ht;Ht=t;try{return e()}finally{Ht=o}};ze.unstable_pauseExecution=function(){};ze.unstable_requestPaint=function(){};ze.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var o=Ht;Ht=e;try{return t()}finally{Ht=o}};ze.unstable_scheduleCallback=function(e,t,o){var a=ze.unstable_now();switch(typeof o=="object"&&o!==null?(o=o.delay,o=typeof o=="number"&&0<o?a+o:a):o=a,e){case 1:var r=-1;break;case 2:r=250;break;case 5:r=1073741823;break;case 4:r=1e4;break;default:r=5e3}return r=o+r,e={id:PT++,callback:t,priorityLevel:e,startTime:o,expirationTime:r,sortIndex:-1},o>a?(e.sortIndex=o,of(ir,e),$o(ua)===null&&e===$o(ir)&&(di?(Cv(ci),ci=-1):di=!0,sf(rf,o-a))):(e.sortIndex=r,of(ua,e),tn||eu||(tn=!0,lf(nf))),e};ze.unstable_shouldYield=Iv;ze.unstable_wrapCallback=function(e){var t=Ht;return function(){var o=Ht;Ht=t;try{return e.apply(this,arguments)}finally{Ht=o}}}});var Pv=Fa((cB,Tv)=>{"use strict";Tv.exports=Rv()});var Ny=Fa(So=>{"use strict";var ET=z(),yo=Pv();function F(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,o=1;o<arguments.length;o++)t+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Ox=new Set,Ni={};function gn(e,t){sl(e,t),sl(e+"Capture",t)}function sl(e,t){for(Ni[e]=t,e=0;e<t.length;e++)Ox.add(t[e])}var Va=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Af=Object.prototype.hasOwnProperty,AT=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Ev={},Av={};function DT(e){return Af.call(Av,e)?!0:Af.call(Ev,e)?!1:AT.test(e)?Av[e]=!0:(Ev[e]=!0,!1)}function NT(e,t,o,a){if(o!==null&&o.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return a?!1:o!==null?!o.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function MT(e,t,o,a){if(t===null||typeof t>"u"||NT(e,t,o,a))return!0;if(a)return!1;if(o!==null)switch(o.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function Qt(e,t,o,a,r,n,l){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=a,this.attributeNamespace=r,this.mustUseProperty=o,this.propertyName=e,this.type=t,this.sanitizeURL=n,this.removeEmptyString=l}var Bt={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){Bt[e]=new Qt(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];Bt[t]=new Qt(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){Bt[e]=new Qt(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){Bt[e]=new Qt(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){Bt[e]=new Qt(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){Bt[e]=new Qt(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){Bt[e]=new Qt(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){Bt[e]=new Qt(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){Bt[e]=new Qt(e,5,!1,e.toLowerCase(),null,!1,!1)});var Cp=/[\-:]([a-z])/g;function Lp(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(Cp,Lp);Bt[t]=new Qt(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(Cp,Lp);Bt[t]=new Qt(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(Cp,Lp);Bt[t]=new Qt(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){Bt[e]=new Qt(e,1,!1,e.toLowerCase(),null,!1,!1)});Bt.xlinkHref=new Qt("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){Bt[e]=new Qt(e,1,!1,e.toLowerCase(),null,!0,!0)});function kp(e,t,o,a){var r=Bt.hasOwnProperty(t)?Bt[t]:null;(r!==null?r.type!==0:a||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(MT(t,o,r,a)&&(o=null),a||r===null?DT(t)&&(o===null?e.removeAttribute(t):e.setAttribute(t,""+o)):r.mustUseProperty?e[r.propertyName]=o===null?r.type===3?!1:"":o:(t=r.attributeName,a=r.attributeNamespace,o===null?e.removeAttribute(t):(r=r.type,o=r===3||r===4&&o===!0?"":""+o,a?e.setAttributeNS(a,t,o):e.setAttribute(t,o))))}var ja=ET.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,ou=Symbol.for("react.element"),Wn=Symbol.for("react.portal"),$n=Symbol.for("react.fragment"),Ip=Symbol.for("react.strict_mode"),Df=Symbol.for("react.profiler"),Fx=Symbol.for("react.provider"),_x=Symbol.for("react.context"),Rp=Symbol.for("react.forward_ref"),Nf=Symbol.for("react.suspense"),Mf=Symbol.for("react.suspense_list"),Tp=Symbol.for("react.memo"),ur=Symbol.for("react.lazy");Symbol.for("react.scope");Symbol.for("react.debug_trace_mode");var Hx=Symbol.for("react.offscreen");Symbol.for("react.legacy_hidden");Symbol.for("react.cache");Symbol.for("react.tracing_marker");var Dv=Symbol.iterator;function fi(e){return e===null||typeof e!="object"?null:(e=Dv&&e[Dv]||e["@@iterator"],typeof e=="function"?e:null)}var nt=Object.assign,uf;function yi(e){if(uf===void 0)try{throw Error()}catch(o){var t=o.stack.trim().match(/\n( *(at )?)/);uf=t&&t[1]||""}return`
`+uf+e}var df=!1;function cf(e,t){if(!e||df)return"";df=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(u){var a=u}Reflect.construct(e,[],t)}else{try{t.call()}catch(u){a=u}e.call(t.prototype)}else{try{throw Error()}catch(u){a=u}e()}}catch(u){if(u&&a&&typeof u.stack=="string"){for(var r=u.stack.split(`
`),n=a.stack.split(`
`),l=r.length-1,i=n.length-1;1<=l&&0<=i&&r[l]!==n[i];)i--;for(;1<=l&&0<=i;l--,i--)if(r[l]!==n[i]){if(l!==1||i!==1)do if(l--,i--,0>i||r[l]!==n[i]){var s=`
`+r[l].replace(" at new "," at ");return e.displayName&&s.includes("<anonymous>")&&(s=s.replace("<anonymous>",e.displayName)),s}while(1<=l&&0<=i);break}}}finally{df=!1,Error.prepareStackTrace=o}return(e=e?e.displayName||e.name:"")?yi(e):""}function BT(e){switch(e.tag){case 5:return yi(e.type);case 16:return yi("Lazy");case 13:return yi("Suspense");case 19:return yi("SuspenseList");case 0:case 2:case 15:return e=cf(e.type,!1),e;case 11:return e=cf(e.type.render,!1),e;case 1:return e=cf(e.type,!0),e;default:return""}}function Bf(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case $n:return"Fragment";case Wn:return"Portal";case Df:return"Profiler";case Ip:return"StrictMode";case Nf:return"Suspense";case Mf:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case _x:return(e.displayName||"Context")+".Consumer";case Fx:return(e._context.displayName||"Context")+".Provider";case Rp:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case Tp:return t=e.displayName||null,t!==null?t:Bf(e.type)||"Memo";case ur:t=e._payload,e=e._init;try{return Bf(e(t))}catch{}}return null}function OT(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Bf(t);case 8:return t===Ip?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Cr(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function qx(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function FT(e){var t=qx(e)?"checked":"value",o=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),a=""+e[t];if(!e.hasOwnProperty(t)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var r=o.get,n=o.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return r.call(this)},set:function(l){a=""+l,n.call(this,l)}}),Object.defineProperty(e,t,{enumerable:o.enumerable}),{getValue:function(){return a},setValue:function(l){a=""+l},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function au(e){e._valueTracker||(e._valueTracker=FT(e))}function Ux(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var o=t.getValue(),a="";return e&&(a=qx(e)?e.checked?"true":"false":e.value),e=a,e!==o?(t.setValue(e),!0):!1}function Au(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function Of(e,t){var o=t.checked;return nt({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??e._wrapperState.initialChecked})}function Nv(e,t){var o=t.defaultValue==null?"":t.defaultValue,a=t.checked!=null?t.checked:t.defaultChecked;o=Cr(t.value!=null?t.value:o),e._wrapperState={initialChecked:a,initialValue:o,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function zx(e,t){t=t.checked,t!=null&&kp(e,"checked",t,!1)}function Ff(e,t){zx(e,t);var o=Cr(t.value),a=t.type;if(o!=null)a==="number"?(o===0&&e.value===""||e.value!=o)&&(e.value=""+o):e.value!==""+o&&(e.value=""+o);else if(a==="submit"||a==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?_f(e,t.type,o):t.hasOwnProperty("defaultValue")&&_f(e,t.type,Cr(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function Mv(e,t,o){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var a=t.type;if(!(a!=="submit"&&a!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,o||t===e.value||(e.value=t),e.defaultValue=t}o=e.name,o!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,o!==""&&(e.name=o)}function _f(e,t,o){(t!=="number"||Au(e.ownerDocument)!==e)&&(o==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+o&&(e.defaultValue=""+o))}var bi=Array.isArray;function ol(e,t,o,a){if(e=e.options,t){t={};for(var r=0;r<o.length;r++)t["$"+o[r]]=!0;for(o=0;o<e.length;o++)r=t.hasOwnProperty("$"+e[o].value),e[o].selected!==r&&(e[o].selected=r),r&&a&&(e[o].defaultSelected=!0)}else{for(o=""+Cr(o),t=null,r=0;r<e.length;r++){if(e[r].value===o){e[r].selected=!0,a&&(e[r].defaultSelected=!0);return}t!==null||e[r].disabled||(t=e[r])}t!==null&&(t.selected=!0)}}function Hf(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(F(91));return nt({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function Bv(e,t){var o=t.value;if(o==null){if(o=t.children,t=t.defaultValue,o!=null){if(t!=null)throw Error(F(92));if(bi(o)){if(1<o.length)throw Error(F(93));o=o[0]}t=o}t==null&&(t=""),o=t}e._wrapperState={initialValue:Cr(o)}}function Vx(e,t){var o=Cr(t.value),a=Cr(t.defaultValue);o!=null&&(o=""+o,o!==e.value&&(e.value=o),t.defaultValue==null&&e.defaultValue!==o&&(e.defaultValue=o)),a!=null&&(e.defaultValue=""+a)}function Ov(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function Wx(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function qf(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?Wx(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var ru,$x=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,o,a,r){MSApp.execUnsafeLocalFunction(function(){return e(t,o,a,r)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(ru=ru||document.createElement("div"),ru.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=ru.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function Mi(e,t){if(t){var o=e.firstChild;if(o&&o===e.lastChild&&o.nodeType===3){o.nodeValue=t;return}}e.textContent=t}var Li={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},_T=["Webkit","ms","Moz","O"];Object.keys(Li).forEach(function(e){_T.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Li[t]=Li[e]})});function Gx(e,t,o){return t==null||typeof t=="boolean"||t===""?"":o||typeof t!="number"||t===0||Li.hasOwnProperty(e)&&Li[e]?(""+t).trim():t+"px"}function jx(e,t){e=e.style;for(var o in t)if(t.hasOwnProperty(o)){var a=o.indexOf("--")===0,r=Gx(o,t[o],a);o==="float"&&(o="cssFloat"),a?e.setProperty(o,r):e[o]=r}}var HT=nt({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Uf(e,t){if(t){if(HT[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(F(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(F(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(F(61))}if(t.style!=null&&typeof t.style!="object")throw Error(F(62))}}function zf(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Vf=null;function Pp(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Wf=null,al=null,rl=null;function Fv(e){if(e=Zi(e)){if(typeof Wf!="function")throw Error(F(280));var t=e.stateNode;t&&(t=nd(t),Wf(e.stateNode,e.type,t))}}function Kx(e){al?rl?rl.push(e):rl=[e]:al=e}function Xx(){if(al){var e=al,t=rl;if(rl=al=null,Fv(e),t)for(e=0;e<t.length;e++)Fv(t[e])}}function Yx(e,t){return e(t)}function Qx(){}var ff=!1;function Zx(e,t,o){if(ff)return e(t,o);ff=!0;try{return Yx(e,t,o)}finally{ff=!1,(al!==null||rl!==null)&&(Qx(),Xx())}}function Bi(e,t){var o=e.stateNode;if(o===null)return null;var a=nd(o);if(a===null)return null;o=a[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(a=!a.disabled)||(e=e.type,a=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!a;break e;default:e=!1}if(e)return null;if(o&&typeof o!="function")throw Error(F(231,t,typeof o));return o}var $f=!1;if(Va)try{zn={},Object.defineProperty(zn,"passive",{get:function(){$f=!0}}),window.addEventListener("test",zn,zn),window.removeEventListener("test",zn,zn)}catch{$f=!1}var zn;function qT(e,t,o,a,r,n,l,i,s){var u=Array.prototype.slice.call(arguments,3);try{t.apply(o,u)}catch(d){this.onError(d)}}var ki=!1,Du=null,Nu=!1,Gf=null,UT={onError:function(e){ki=!0,Du=e}};function zT(e,t,o,a,r,n,l,i,s){ki=!1,Du=null,qT.apply(UT,arguments)}function VT(e,t,o,a,r,n,l,i,s){if(zT.apply(this,arguments),ki){if(ki){var u=Du;ki=!1,Du=null}else throw Error(F(198));Nu||(Nu=!0,Gf=u)}}function hn(e){var t=e,o=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(o=t.return),e=t.return;while(e)}return t.tag===3?o:null}function Jx(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function _v(e){if(hn(e)!==e)throw Error(F(188))}function WT(e){var t=e.alternate;if(!t){if(t=hn(e),t===null)throw Error(F(188));return t!==e?null:e}for(var o=e,a=t;;){var r=o.return;if(r===null)break;var n=r.alternate;if(n===null){if(a=r.return,a!==null){o=a;continue}break}if(r.child===n.child){for(n=r.child;n;){if(n===o)return _v(r),e;if(n===a)return _v(r),t;n=n.sibling}throw Error(F(188))}if(o.return!==a.return)o=r,a=n;else{for(var l=!1,i=r.child;i;){if(i===o){l=!0,o=r,a=n;break}if(i===a){l=!0,a=r,o=n;break}i=i.sibling}if(!l){for(i=n.child;i;){if(i===o){l=!0,o=n,a=r;break}if(i===a){l=!0,a=n,o=r;break}i=i.sibling}if(!l)throw Error(F(189))}}if(o.alternate!==a)throw Error(F(190))}if(o.tag!==3)throw Error(F(188));return o.stateNode.current===o?e:t}function ew(e){return e=WT(e),e!==null?tw(e):null}function tw(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=tw(e);if(t!==null)return t;e=e.sibling}return null}var ow=yo.unstable_scheduleCallback,Hv=yo.unstable_cancelCallback,$T=yo.unstable_shouldYield,GT=yo.unstable_requestPaint,ft=yo.unstable_now,jT=yo.unstable_getCurrentPriorityLevel,Ep=yo.unstable_ImmediatePriority,aw=yo.unstable_UserBlockingPriority,Mu=yo.unstable_NormalPriority,KT=yo.unstable_LowPriority,rw=yo.unstable_IdlePriority,td=null,pa=null;function XT(e){if(pa&&typeof pa.onCommitFiberRoot=="function")try{pa.onCommitFiberRoot(td,e,void 0,(e.current.flags&128)===128)}catch{}}var Yo=Math.clz32?Math.clz32:ZT,YT=Math.log,QT=Math.LN2;function ZT(e){return e>>>=0,e===0?32:31-(YT(e)/QT|0)|0}var nu=64,lu=4194304;function Si(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Bu(e,t){var o=e.pendingLanes;if(o===0)return 0;var a=0,r=e.suspendedLanes,n=e.pingedLanes,l=o&268435455;if(l!==0){var i=l&~r;i!==0?a=Si(i):(n&=l,n!==0&&(a=Si(n)))}else l=o&~r,l!==0?a=Si(l):n!==0&&(a=Si(n));if(a===0)return 0;if(t!==0&&t!==a&&!(t&r)&&(r=a&-a,n=t&-t,r>=n||r===16&&(n&4194240)!==0))return t;if(a&4&&(a|=o&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=a;0<t;)o=31-Yo(t),r=1<<o,a|=e[o],t&=~r;return a}function JT(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function eP(e,t){for(var o=e.suspendedLanes,a=e.pingedLanes,r=e.expirationTimes,n=e.pendingLanes;0<n;){var l=31-Yo(n),i=1<<l,s=r[l];s===-1?(!(i&o)||i&a)&&(r[l]=JT(i,t)):s<=t&&(e.expiredLanes|=i),n&=~i}}function jf(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function nw(){var e=nu;return nu<<=1,!(nu&4194240)&&(nu=64),e}function pf(e){for(var t=[],o=0;31>o;o++)t.push(e);return t}function Yi(e,t,o){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Yo(t),e[t]=o}function tP(e,t){var o=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var a=e.eventTimes;for(e=e.expirationTimes;0<o;){var r=31-Yo(o),n=1<<r;t[r]=0,a[r]=-1,e[r]=-1,o&=~n}}function Ap(e,t){var o=e.entangledLanes|=t;for(e=e.entanglements;o;){var a=31-Yo(o),r=1<<a;r&t|e[a]&t&&(e[a]|=t),o&=~r}}var Oe=0;function lw(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var iw,Dp,sw,uw,dw,Kf=!1,iu=[],gr=null,hr=null,vr=null,Oi=new Map,Fi=new Map,cr=[],oP="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function qv(e,t){switch(e){case"focusin":case"focusout":gr=null;break;case"dragenter":case"dragleave":hr=null;break;case"mouseover":case"mouseout":vr=null;break;case"pointerover":case"pointerout":Oi.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Fi.delete(t.pointerId)}}function pi(e,t,o,a,r,n){return e===null||e.nativeEvent!==n?(e={blockedOn:t,domEventName:o,eventSystemFlags:a,nativeEvent:n,targetContainers:[r]},t!==null&&(t=Zi(t),t!==null&&Dp(t)),e):(e.eventSystemFlags|=a,t=e.targetContainers,r!==null&&t.indexOf(r)===-1&&t.push(r),e)}function aP(e,t,o,a,r){switch(t){case"focusin":return gr=pi(gr,e,t,o,a,r),!0;case"dragenter":return hr=pi(hr,e,t,o,a,r),!0;case"mouseover":return vr=pi(vr,e,t,o,a,r),!0;case"pointerover":var n=r.pointerId;return Oi.set(n,pi(Oi.get(n)||null,e,t,o,a,r)),!0;case"gotpointercapture":return n=r.pointerId,Fi.set(n,pi(Fi.get(n)||null,e,t,o,a,r)),!0}return!1}function cw(e){var t=rn(e.target);if(t!==null){var o=hn(t);if(o!==null){if(t=o.tag,t===13){if(t=Jx(o),t!==null){e.blockedOn=t,dw(e.priority,function(){sw(o)});return}}else if(t===3&&o.stateNode.current.memoizedState.isDehydrated){e.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}e.blockedOn=null}function bu(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var o=Xf(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(o===null){o=e.nativeEvent;var a=new o.constructor(o.type,o);Vf=a,o.target.dispatchEvent(a),Vf=null}else return t=Zi(o),t!==null&&Dp(t),e.blockedOn=o,!1;t.shift()}return!0}function Uv(e,t,o){bu(e)&&o.delete(t)}function rP(){Kf=!1,gr!==null&&bu(gr)&&(gr=null),hr!==null&&bu(hr)&&(hr=null),vr!==null&&bu(vr)&&(vr=null),Oi.forEach(Uv),Fi.forEach(Uv)}function mi(e,t){e.blockedOn===t&&(e.blockedOn=null,Kf||(Kf=!0,yo.unstable_scheduleCallback(yo.unstable_NormalPriority,rP)))}function _i(e){function t(r){return mi(r,e)}if(0<iu.length){mi(iu[0],e);for(var o=1;o<iu.length;o++){var a=iu[o];a.blockedOn===e&&(a.blockedOn=null)}}for(gr!==null&&mi(gr,e),hr!==null&&mi(hr,e),vr!==null&&mi(vr,e),Oi.forEach(t),Fi.forEach(t),o=0;o<cr.length;o++)a=cr[o],a.blockedOn===e&&(a.blockedOn=null);for(;0<cr.length&&(o=cr[0],o.blockedOn===null);)cw(o),o.blockedOn===null&&cr.shift()}var nl=ja.ReactCurrentBatchConfig,Ou=!0;function nP(e,t,o,a){var r=Oe,n=nl.transition;nl.transition=null;try{Oe=1,Np(e,t,o,a)}finally{Oe=r,nl.transition=n}}function lP(e,t,o,a){var r=Oe,n=nl.transition;nl.transition=null;try{Oe=4,Np(e,t,o,a)}finally{Oe=r,nl.transition=n}}function Np(e,t,o,a){if(Ou){var r=Xf(e,t,o,a);if(r===null)yf(e,t,a,Fu,o),qv(e,a);else if(aP(r,e,t,o,a))a.stopPropagation();else if(qv(e,a),t&4&&-1<oP.indexOf(e)){for(;r!==null;){var n=Zi(r);if(n!==null&&iw(n),n=Xf(e,t,o,a),n===null&&yf(e,t,a,Fu,o),n===r)break;r=n}r!==null&&a.stopPropagation()}else yf(e,t,a,null,o)}}var Fu=null;function Xf(e,t,o,a){if(Fu=null,e=Pp(a),e=rn(e),e!==null)if(t=hn(e),t===null)e=null;else if(o=t.tag,o===13){if(e=Jx(t),e!==null)return e;e=null}else if(o===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Fu=e,null}function fw(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(jT()){case Ep:return 1;case aw:return 4;case Mu:case KT:return 16;case rw:return 536870912;default:return 16}default:return 16}}var pr=null,Mp=null,Su=null;function pw(){if(Su)return Su;var e,t=Mp,o=t.length,a,r="value"in pr?pr.value:pr.textContent,n=r.length;for(e=0;e<o&&t[e]===r[e];e++);var l=o-e;for(a=1;a<=l&&t[o-a]===r[n-a];a++);return Su=r.slice(e,1<a?1-a:void 0)}function Cu(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function su(){return!0}function zv(){return!1}function bo(e){function t(o,a,r,n,l){this._reactName=o,this._targetInst=r,this.type=a,this.nativeEvent=n,this.target=l,this.currentTarget=null;for(var i in e)e.hasOwnProperty(i)&&(o=e[i],this[i]=o?o(n):n[i]);return this.isDefaultPrevented=(n.defaultPrevented!=null?n.defaultPrevented:n.returnValue===!1)?su:zv,this.isPropagationStopped=zv,this}return nt(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=su)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=su)},persist:function(){},isPersistent:su}),t}var gl={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Bp=bo(gl),Qi=nt({},gl,{view:0,detail:0}),iP=bo(Qi),mf,gf,gi,od=nt({},Qi,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Op,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==gi&&(gi&&e.type==="mousemove"?(mf=e.screenX-gi.screenX,gf=e.screenY-gi.screenY):gf=mf=0,gi=e),mf)},movementY:function(e){return"movementY"in e?e.movementY:gf}}),Vv=bo(od),sP=nt({},od,{dataTransfer:0}),uP=bo(sP),dP=nt({},Qi,{relatedTarget:0}),hf=bo(dP),cP=nt({},gl,{animationName:0,elapsedTime:0,pseudoElement:0}),fP=bo(cP),pP=nt({},gl,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),mP=bo(pP),gP=nt({},gl,{data:0}),Wv=bo(gP),hP={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},vP={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},xP={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function wP(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=xP[e])?!!t[e]:!1}function Op(){return wP}var yP=nt({},Qi,{key:function(e){if(e.key){var t=hP[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=Cu(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?vP[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Op,charCode:function(e){return e.type==="keypress"?Cu(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Cu(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),bP=bo(yP),SP=nt({},od,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),$v=bo(SP),CP=nt({},Qi,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Op}),LP=bo(CP),kP=nt({},gl,{propertyName:0,elapsedTime:0,pseudoElement:0}),IP=bo(kP),RP=nt({},od,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),TP=bo(RP),PP=[9,13,27,32],Fp=Va&&"CompositionEvent"in window,Ii=null;Va&&"documentMode"in document&&(Ii=document.documentMode);var EP=Va&&"TextEvent"in window&&!Ii,mw=Va&&(!Fp||Ii&&8<Ii&&11>=Ii),Gv=" ",jv=!1;function gw(e,t){switch(e){case"keyup":return PP.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function hw(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var Gn=!1;function AP(e,t){switch(e){case"compositionend":return hw(t);case"keypress":return t.which!==32?null:(jv=!0,Gv);case"textInput":return e=t.data,e===Gv&&jv?null:e;default:return null}}function DP(e,t){if(Gn)return e==="compositionend"||!Fp&&gw(e,t)?(e=pw(),Su=Mp=pr=null,Gn=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return mw&&t.locale!=="ko"?null:t.data;default:return null}}var NP={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Kv(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!NP[e.type]:t==="textarea"}function vw(e,t,o,a){Kx(a),t=_u(t,"onChange"),0<t.length&&(o=new Bp("onChange","change",null,o,a),e.push({event:o,listeners:t}))}var Ri=null,Hi=null;function MP(e){Tw(e,0)}function ad(e){var t=Xn(e);if(Ux(t))return e}function BP(e,t){if(e==="change")return t}var xw=!1;Va&&(Va?(du="oninput"in document,du||(vf=document.createElement("div"),vf.setAttribute("oninput","return;"),du=typeof vf.oninput=="function"),uu=du):uu=!1,xw=uu&&(!document.documentMode||9<document.documentMode));var uu,du,vf;function Xv(){Ri&&(Ri.detachEvent("onpropertychange",ww),Hi=Ri=null)}function ww(e){if(e.propertyName==="value"&&ad(Hi)){var t=[];vw(t,Hi,e,Pp(e)),Zx(MP,t)}}function OP(e,t,o){e==="focusin"?(Xv(),Ri=t,Hi=o,Ri.attachEvent("onpropertychange",ww)):e==="focusout"&&Xv()}function FP(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return ad(Hi)}function _P(e,t){if(e==="click")return ad(t)}function HP(e,t){if(e==="input"||e==="change")return ad(t)}function qP(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Zo=typeof Object.is=="function"?Object.is:qP;function qi(e,t){if(Zo(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var o=Object.keys(e),a=Object.keys(t);if(o.length!==a.length)return!1;for(a=0;a<o.length;a++){var r=o[a];if(!Af.call(t,r)||!Zo(e[r],t[r]))return!1}return!0}function Yv(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function Qv(e,t){var o=Yv(e);e=0;for(var a;o;){if(o.nodeType===3){if(a=e+o.textContent.length,e<=t&&a>=t)return{node:o,offset:t-e};e=a}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=Yv(o)}}function yw(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?yw(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function bw(){for(var e=window,t=Au();t instanceof e.HTMLIFrameElement;){try{var o=typeof t.contentWindow.location.href=="string"}catch{o=!1}if(o)e=t.contentWindow;else break;t=Au(e.document)}return t}function _p(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function UP(e){var t=bw(),o=e.focusedElem,a=e.selectionRange;if(t!==o&&o&&o.ownerDocument&&yw(o.ownerDocument.documentElement,o)){if(a!==null&&_p(o)){if(t=a.start,e=a.end,e===void 0&&(e=t),"selectionStart"in o)o.selectionStart=t,o.selectionEnd=Math.min(e,o.value.length);else if(e=(t=o.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var r=o.textContent.length,n=Math.min(a.start,r);a=a.end===void 0?n:Math.min(a.end,r),!e.extend&&n>a&&(r=a,a=n,n=r),r=Qv(o,n);var l=Qv(o,a);r&&l&&(e.rangeCount!==1||e.anchorNode!==r.node||e.anchorOffset!==r.offset||e.focusNode!==l.node||e.focusOffset!==l.offset)&&(t=t.createRange(),t.setStart(r.node,r.offset),e.removeAllRanges(),n>a?(e.addRange(t),e.extend(l.node,l.offset)):(t.setEnd(l.node,l.offset),e.addRange(t)))}}for(t=[],e=o;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<t.length;o++)e=t[o],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var zP=Va&&"documentMode"in document&&11>=document.documentMode,jn=null,Yf=null,Ti=null,Qf=!1;function Zv(e,t,o){var a=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Qf||jn==null||jn!==Au(a)||(a=jn,"selectionStart"in a&&_p(a)?a={start:a.selectionStart,end:a.selectionEnd}:(a=(a.ownerDocument&&a.ownerDocument.defaultView||window).getSelection(),a={anchorNode:a.anchorNode,anchorOffset:a.anchorOffset,focusNode:a.focusNode,focusOffset:a.focusOffset}),Ti&&qi(Ti,a)||(Ti=a,a=_u(Yf,"onSelect"),0<a.length&&(t=new Bp("onSelect","select",null,t,o),e.push({event:t,listeners:a}),t.target=jn)))}function cu(e,t){var o={};return o[e.toLowerCase()]=t.toLowerCase(),o["Webkit"+e]="webkit"+t,o["Moz"+e]="moz"+t,o}var Kn={animationend:cu("Animation","AnimationEnd"),animationiteration:cu("Animation","AnimationIteration"),animationstart:cu("Animation","AnimationStart"),transitionend:cu("Transition","TransitionEnd")},xf={},Sw={};Va&&(Sw=document.createElement("div").style,"AnimationEvent"in window||(delete Kn.animationend.animation,delete Kn.animationiteration.animation,delete Kn.animationstart.animation),"TransitionEvent"in window||delete Kn.transitionend.transition);function rd(e){if(xf[e])return xf[e];if(!Kn[e])return e;var t=Kn[e],o;for(o in t)if(t.hasOwnProperty(o)&&o in Sw)return xf[e]=t[o];return e}var Cw=rd("animationend"),Lw=rd("animationiteration"),kw=rd("animationstart"),Iw=rd("transitionend"),Rw=new Map,Jv="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function kr(e,t){Rw.set(e,t),gn(t,[e])}for(fu=0;fu<Jv.length;fu++)pu=Jv[fu],ex=pu.toLowerCase(),tx=pu[0].toUpperCase()+pu.slice(1),kr(ex,"on"+tx);var pu,ex,tx,fu;kr(Cw,"onAnimationEnd");kr(Lw,"onAnimationIteration");kr(kw,"onAnimationStart");kr("dblclick","onDoubleClick");kr("focusin","onFocus");kr("focusout","onBlur");kr(Iw,"onTransitionEnd");sl("onMouseEnter",["mouseout","mouseover"]);sl("onMouseLeave",["mouseout","mouseover"]);sl("onPointerEnter",["pointerout","pointerover"]);sl("onPointerLeave",["pointerout","pointerover"]);gn("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));gn("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));gn("onBeforeInput",["compositionend","keypress","textInput","paste"]);gn("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));gn("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));gn("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Ci="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),VP=new Set("cancel close invalid load scroll toggle".split(" ").concat(Ci));function ox(e,t,o){var a=e.type||"unknown-event";e.currentTarget=o,VT(a,t,void 0,e),e.currentTarget=null}function Tw(e,t){t=(t&4)!==0;for(var o=0;o<e.length;o++){var a=e[o],r=a.event;a=a.listeners;e:{var n=void 0;if(t)for(var l=a.length-1;0<=l;l--){var i=a[l],s=i.instance,u=i.currentTarget;if(i=i.listener,s!==n&&r.isPropagationStopped())break e;ox(r,i,u),n=s}else for(l=0;l<a.length;l++){if(i=a[l],s=i.instance,u=i.currentTarget,i=i.listener,s!==n&&r.isPropagationStopped())break e;ox(r,i,u),n=s}}}if(Nu)throw e=Gf,Nu=!1,Gf=null,e}function Ge(e,t){var o=t[op];o===void 0&&(o=t[op]=new Set);var a=e+"__bubble";o.has(a)||(Pw(t,e,2,!1),o.add(a))}function wf(e,t,o){var a=0;t&&(a|=4),Pw(o,e,a,t)}var mu="_reactListening"+Math.random().toString(36).slice(2);function Ui(e){if(!e[mu]){e[mu]=!0,Ox.forEach(function(o){o!=="selectionchange"&&(VP.has(o)||wf(o,!1,e),wf(o,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[mu]||(t[mu]=!0,wf("selectionchange",!1,t))}}function Pw(e,t,o,a){switch(fw(t)){case 1:var r=nP;break;case 4:r=lP;break;default:r=Np}o=r.bind(null,t,o,e),r=void 0,!$f||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(r=!0),a?r!==void 0?e.addEventListener(t,o,{capture:!0,passive:r}):e.addEventListener(t,o,!0):r!==void 0?e.addEventListener(t,o,{passive:r}):e.addEventListener(t,o,!1)}function yf(e,t,o,a,r){var n=a;if(!(t&1)&&!(t&2)&&a!==null)e:for(;;){if(a===null)return;var l=a.tag;if(l===3||l===4){var i=a.stateNode.containerInfo;if(i===r||i.nodeType===8&&i.parentNode===r)break;if(l===4)for(l=a.return;l!==null;){var s=l.tag;if((s===3||s===4)&&(s=l.stateNode.containerInfo,s===r||s.nodeType===8&&s.parentNode===r))return;l=l.return}for(;i!==null;){if(l=rn(i),l===null)return;if(s=l.tag,s===5||s===6){a=n=l;continue e}i=i.parentNode}}a=a.return}Zx(function(){var u=n,d=Pp(o),f=[];e:{var m=Rw.get(e);if(m!==void 0){var h=Bp,y=e;switch(e){case"keypress":if(Cu(o)===0)break e;case"keydown":case"keyup":h=bP;break;case"focusin":y="focus",h=hf;break;case"focusout":y="blur",h=hf;break;case"beforeblur":case"afterblur":h=hf;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":h=Vv;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":h=uP;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":h=LP;break;case Cw:case Lw:case kw:h=fP;break;case Iw:h=IP;break;case"scroll":h=iP;break;case"wheel":h=TP;break;case"copy":case"cut":case"paste":h=mP;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":h=$v}var g=(t&4)!==0,x=!g&&e==="scroll",p=g?m!==null?m+"Capture":null:m;g=[];for(var c=u,v;c!==null;){v=c;var w=v.stateNode;if(v.tag===5&&w!==null&&(v=w,p!==null&&(w=Bi(c,p),w!=null&&g.push(zi(c,w,v)))),x)break;c=c.return}0<g.length&&(m=new h(m,y,null,o,d),f.push({event:m,listeners:g}))}}if(!(t&7)){e:{if(m=e==="mouseover"||e==="pointerover",h=e==="mouseout"||e==="pointerout",m&&o!==Vf&&(y=o.relatedTarget||o.fromElement)&&(rn(y)||y[Wa]))break e;if((h||m)&&(m=d.window===d?d:(m=d.ownerDocument)?m.defaultView||m.parentWindow:window,h?(y=o.relatedTarget||o.toElement,h=u,y=y?rn(y):null,y!==null&&(x=hn(y),y!==x||y.tag!==5&&y.tag!==6)&&(y=null)):(h=null,y=u),h!==y)){if(g=Vv,w="onMouseLeave",p="onMouseEnter",c="mouse",(e==="pointerout"||e==="pointerover")&&(g=$v,w="onPointerLeave",p="onPointerEnter",c="pointer"),x=h==null?m:Xn(h),v=y==null?m:Xn(y),m=new g(w,c+"leave",h,o,d),m.target=x,m.relatedTarget=v,w=null,rn(d)===u&&(g=new g(p,c+"enter",y,o,d),g.target=v,g.relatedTarget=x,w=g),x=w,h&&y)t:{for(g=h,p=y,c=0,v=g;v;v=Vn(v))c++;for(v=0,w=p;w;w=Vn(w))v++;for(;0<c-v;)g=Vn(g),c--;for(;0<v-c;)p=Vn(p),v--;for(;c--;){if(g===p||p!==null&&g===p.alternate)break t;g=Vn(g),p=Vn(p)}g=null}else g=null;h!==null&&ax(f,m,h,g,!1),y!==null&&x!==null&&ax(f,x,y,g,!0)}}e:{if(m=u?Xn(u):window,h=m.nodeName&&m.nodeName.toLowerCase(),h==="select"||h==="input"&&m.type==="file")var b=BP;else if(Kv(m))if(xw)b=HP;else{b=FP;var L=OP}else(h=m.nodeName)&&h.toLowerCase()==="input"&&(m.type==="checkbox"||m.type==="radio")&&(b=_P);if(b&&(b=b(e,u))){vw(f,b,o,d);break e}L&&L(e,m,u),e==="focusout"&&(L=m._wrapperState)&&L.controlled&&m.type==="number"&&_f(m,"number",m.value)}switch(L=u?Xn(u):window,e){case"focusin":(Kv(L)||L.contentEditable==="true")&&(jn=L,Yf=u,Ti=null);break;case"focusout":Ti=Yf=jn=null;break;case"mousedown":Qf=!0;break;case"contextmenu":case"mouseup":case"dragend":Qf=!1,Zv(f,o,d);break;case"selectionchange":if(zP)break;case"keydown":case"keyup":Zv(f,o,d)}var C;if(Fp)e:{switch(e){case"compositionstart":var S="onCompositionStart";break e;case"compositionend":S="onCompositionEnd";break e;case"compositionupdate":S="onCompositionUpdate";break e}S=void 0}else Gn?gw(e,o)&&(S="onCompositionEnd"):e==="keydown"&&o.keyCode===229&&(S="onCompositionStart");S&&(mw&&o.locale!=="ko"&&(Gn||S!=="onCompositionStart"?S==="onCompositionEnd"&&Gn&&(C=pw()):(pr=d,Mp="value"in pr?pr.value:pr.textContent,Gn=!0)),L=_u(u,S),0<L.length&&(S=new Wv(S,e,null,o,d),f.push({event:S,listeners:L}),C?S.data=C:(C=hw(o),C!==null&&(S.data=C)))),(C=EP?AP(e,o):DP(e,o))&&(u=_u(u,"onBeforeInput"),0<u.length&&(d=new Wv("onBeforeInput","beforeinput",null,o,d),f.push({event:d,listeners:u}),d.data=C))}Tw(f,t)})}function zi(e,t,o){return{instance:e,listener:t,currentTarget:o}}function _u(e,t){for(var o=t+"Capture",a=[];e!==null;){var r=e,n=r.stateNode;r.tag===5&&n!==null&&(r=n,n=Bi(e,o),n!=null&&a.unshift(zi(e,n,r)),n=Bi(e,t),n!=null&&a.push(zi(e,n,r))),e=e.return}return a}function Vn(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function ax(e,t,o,a,r){for(var n=t._reactName,l=[];o!==null&&o!==a;){var i=o,s=i.alternate,u=i.stateNode;if(s!==null&&s===a)break;i.tag===5&&u!==null&&(i=u,r?(s=Bi(o,n),s!=null&&l.unshift(zi(o,s,i))):r||(s=Bi(o,n),s!=null&&l.push(zi(o,s,i)))),o=o.return}l.length!==0&&e.push({event:t,listeners:l})}var WP=/\r\n?/g,$P=/\u0000|\uFFFD/g;function rx(e){return(typeof e=="string"?e:""+e).replace(WP,`
`).replace($P,"")}function gu(e,t,o){if(t=rx(t),rx(e)!==t&&o)throw Error(F(425))}function Hu(){}var Zf=null,Jf=null;function ep(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var tp=typeof setTimeout=="function"?setTimeout:void 0,GP=typeof clearTimeout=="function"?clearTimeout:void 0,nx=typeof Promise=="function"?Promise:void 0,jP=typeof queueMicrotask=="function"?queueMicrotask:typeof nx<"u"?function(e){return nx.resolve(null).then(e).catch(KP)}:tp;function KP(e){setTimeout(function(){throw e})}function bf(e,t){var o=t,a=0;do{var r=o.nextSibling;if(e.removeChild(o),r&&r.nodeType===8)if(o=r.data,o==="/$"){if(a===0){e.removeChild(r),_i(t);return}a--}else o!=="$"&&o!=="$?"&&o!=="$!"||a++;o=r}while(o);_i(t)}function xr(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function lx(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var o=e.data;if(o==="$"||o==="$!"||o==="$?"){if(t===0)return e;t--}else o==="/$"&&t++}e=e.previousSibling}return null}var hl=Math.random().toString(36).slice(2),fa="__reactFiber$"+hl,Vi="__reactProps$"+hl,Wa="__reactContainer$"+hl,op="__reactEvents$"+hl,XP="__reactListeners$"+hl,YP="__reactHandles$"+hl;function rn(e){var t=e[fa];if(t)return t;for(var o=e.parentNode;o;){if(t=o[Wa]||o[fa]){if(o=t.alternate,t.child!==null||o!==null&&o.child!==null)for(e=lx(e);e!==null;){if(o=e[fa])return o;e=lx(e)}return t}e=o,o=e.parentNode}return null}function Zi(e){return e=e[fa]||e[Wa],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function Xn(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(F(33))}function nd(e){return e[Vi]||null}var ap=[],Yn=-1;function Ir(e){return{current:e}}function je(e){0>Yn||(e.current=ap[Yn],ap[Yn]=null,Yn--)}function Ve(e,t){Yn++,ap[Yn]=e.current,e.current=t}var Lr={},Vt=Ir(Lr),no=Ir(!1),dn=Lr;function ul(e,t){var o=e.type.contextTypes;if(!o)return Lr;var a=e.stateNode;if(a&&a.__reactInternalMemoizedUnmaskedChildContext===t)return a.__reactInternalMemoizedMaskedChildContext;var r={},n;for(n in o)r[n]=t[n];return a&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=r),r}function lo(e){return e=e.childContextTypes,e!=null}function qu(){je(no),je(Vt)}function ix(e,t,o){if(Vt.current!==Lr)throw Error(F(168));Ve(Vt,t),Ve(no,o)}function Ew(e,t,o){var a=e.stateNode;if(t=t.childContextTypes,typeof a.getChildContext!="function")return o;a=a.getChildContext();for(var r in a)if(!(r in t))throw Error(F(108,OT(e)||"Unknown",r));return nt({},o,a)}function Uu(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||Lr,dn=Vt.current,Ve(Vt,e),Ve(no,no.current),!0}function sx(e,t,o){var a=e.stateNode;if(!a)throw Error(F(169));o?(e=Ew(e,t,dn),a.__reactInternalMemoizedMergedChildContext=e,je(no),je(Vt),Ve(Vt,e)):je(no),Ve(no,o)}var Ha=null,ld=!1,Sf=!1;function Aw(e){Ha===null?Ha=[e]:Ha.push(e)}function QP(e){ld=!0,Aw(e)}function Rr(){if(!Sf&&Ha!==null){Sf=!0;var e=0,t=Oe;try{var o=Ha;for(Oe=1;e<o.length;e++){var a=o[e];do a=a(!0);while(a!==null)}Ha=null,ld=!1}catch(r){throw Ha!==null&&(Ha=Ha.slice(e+1)),ow(Ep,Rr),r}finally{Oe=t,Sf=!1}}return null}var Qn=[],Zn=0,zu=null,Vu=0,Ao=[],Do=0,cn=null,qa=1,Ua="";function on(e,t){Qn[Zn++]=Vu,Qn[Zn++]=zu,zu=e,Vu=t}function Dw(e,t,o){Ao[Do++]=qa,Ao[Do++]=Ua,Ao[Do++]=cn,cn=e;var a=qa;e=Ua;var r=32-Yo(a)-1;a&=~(1<<r),o+=1;var n=32-Yo(t)+r;if(30<n){var l=r-r%5;n=(a&(1<<l)-1).toString(32),a>>=l,r-=l,qa=1<<32-Yo(t)+r|o<<r|a,Ua=n+e}else qa=1<<n|o<<r|a,Ua=e}function Hp(e){e.return!==null&&(on(e,1),Dw(e,1,0))}function qp(e){for(;e===zu;)zu=Qn[--Zn],Qn[Zn]=null,Vu=Qn[--Zn],Qn[Zn]=null;for(;e===cn;)cn=Ao[--Do],Ao[Do]=null,Ua=Ao[--Do],Ao[Do]=null,qa=Ao[--Do],Ao[Do]=null}var wo=null,xo=null,Je=!1,Xo=null;function Nw(e,t){var o=No(5,null,null,0);o.elementType="DELETED",o.stateNode=t,o.return=e,t=e.deletions,t===null?(e.deletions=[o],e.flags|=16):t.push(o)}function ux(e,t){switch(e.tag){case 5:var o=e.type;return t=t.nodeType!==1||o.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,wo=e,xo=xr(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,wo=e,xo=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(o=cn!==null?{id:qa,overflow:Ua}:null,e.memoizedState={dehydrated:t,treeContext:o,retryLane:1073741824},o=No(18,null,null,0),o.stateNode=t,o.return=e,e.child=o,wo=e,xo=null,!0):!1;default:return!1}}function rp(e){return(e.mode&1)!==0&&(e.flags&128)===0}function np(e){if(Je){var t=xo;if(t){var o=t;if(!ux(e,t)){if(rp(e))throw Error(F(418));t=xr(o.nextSibling);var a=wo;t&&ux(e,t)?Nw(a,o):(e.flags=e.flags&-4097|2,Je=!1,wo=e)}}else{if(rp(e))throw Error(F(418));e.flags=e.flags&-4097|2,Je=!1,wo=e}}}function dx(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;wo=e}function hu(e){if(e!==wo)return!1;if(!Je)return dx(e),Je=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!ep(e.type,e.memoizedProps)),t&&(t=xo)){if(rp(e))throw Mw(),Error(F(418));for(;t;)Nw(e,t),t=xr(t.nextSibling)}if(dx(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(F(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var o=e.data;if(o==="/$"){if(t===0){xo=xr(e.nextSibling);break e}t--}else o!=="$"&&o!=="$!"&&o!=="$?"||t++}e=e.nextSibling}xo=null}}else xo=wo?xr(e.stateNode.nextSibling):null;return!0}function Mw(){for(var e=xo;e;)e=xr(e.nextSibling)}function dl(){xo=wo=null,Je=!1}function Up(e){Xo===null?Xo=[e]:Xo.push(e)}var ZP=ja.ReactCurrentBatchConfig;function hi(e,t,o){if(e=o.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(F(309));var a=o.stateNode}if(!a)throw Error(F(147,e));var r=a,n=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===n?t.ref:(t=function(l){var i=r.refs;l===null?delete i[n]:i[n]=l},t._stringRef=n,t)}if(typeof e!="string")throw Error(F(284));if(!o._owner)throw Error(F(290,e))}return e}function vu(e,t){throw e=Object.prototype.toString.call(t),Error(F(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function cx(e){var t=e._init;return t(e._payload)}function Bw(e){function t(p,c){if(e){var v=p.deletions;v===null?(p.deletions=[c],p.flags|=16):v.push(c)}}function o(p,c){if(!e)return null;for(;c!==null;)t(p,c),c=c.sibling;return null}function a(p,c){for(p=new Map;c!==null;)c.key!==null?p.set(c.key,c):p.set(c.index,c),c=c.sibling;return p}function r(p,c){return p=Sr(p,c),p.index=0,p.sibling=null,p}function n(p,c,v){return p.index=v,e?(v=p.alternate,v!==null?(v=v.index,v<c?(p.flags|=2,c):v):(p.flags|=2,c)):(p.flags|=1048576,c)}function l(p){return e&&p.alternate===null&&(p.flags|=2),p}function i(p,c,v,w){return c===null||c.tag!==6?(c=Pf(v,p.mode,w),c.return=p,c):(c=r(c,v),c.return=p,c)}function s(p,c,v,w){var b=v.type;return b===$n?d(p,c,v.props.children,w,v.key):c!==null&&(c.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===ur&&cx(b)===c.type)?(w=r(c,v.props),w.ref=hi(p,c,v),w.return=p,w):(w=Eu(v.type,v.key,v.props,null,p.mode,w),w.ref=hi(p,c,v),w.return=p,w)}function u(p,c,v,w){return c===null||c.tag!==4||c.stateNode.containerInfo!==v.containerInfo||c.stateNode.implementation!==v.implementation?(c=Ef(v,p.mode,w),c.return=p,c):(c=r(c,v.children||[]),c.return=p,c)}function d(p,c,v,w,b){return c===null||c.tag!==7?(c=un(v,p.mode,w,b),c.return=p,c):(c=r(c,v),c.return=p,c)}function f(p,c,v){if(typeof c=="string"&&c!==""||typeof c=="number")return c=Pf(""+c,p.mode,v),c.return=p,c;if(typeof c=="object"&&c!==null){switch(c.$$typeof){case ou:return v=Eu(c.type,c.key,c.props,null,p.mode,v),v.ref=hi(p,null,c),v.return=p,v;case Wn:return c=Ef(c,p.mode,v),c.return=p,c;case ur:var w=c._init;return f(p,w(c._payload),v)}if(bi(c)||fi(c))return c=un(c,p.mode,v,null),c.return=p,c;vu(p,c)}return null}function m(p,c,v,w){var b=c!==null?c.key:null;if(typeof v=="string"&&v!==""||typeof v=="number")return b!==null?null:i(p,c,""+v,w);if(typeof v=="object"&&v!==null){switch(v.$$typeof){case ou:return v.key===b?s(p,c,v,w):null;case Wn:return v.key===b?u(p,c,v,w):null;case ur:return b=v._init,m(p,c,b(v._payload),w)}if(bi(v)||fi(v))return b!==null?null:d(p,c,v,w,null);vu(p,v)}return null}function h(p,c,v,w,b){if(typeof w=="string"&&w!==""||typeof w=="number")return p=p.get(v)||null,i(c,p,""+w,b);if(typeof w=="object"&&w!==null){switch(w.$$typeof){case ou:return p=p.get(w.key===null?v:w.key)||null,s(c,p,w,b);case Wn:return p=p.get(w.key===null?v:w.key)||null,u(c,p,w,b);case ur:var L=w._init;return h(p,c,v,L(w._payload),b)}if(bi(w)||fi(w))return p=p.get(v)||null,d(c,p,w,b,null);vu(c,w)}return null}function y(p,c,v,w){for(var b=null,L=null,C=c,S=c=0,T=null;C!==null&&S<v.length;S++){C.index>S?(T=C,C=null):T=C.sibling;var P=m(p,C,v[S],w);if(P===null){C===null&&(C=T);break}e&&C&&P.alternate===null&&t(p,C),c=n(P,c,S),L===null?b=P:L.sibling=P,L=P,C=T}if(S===v.length)return o(p,C),Je&&on(p,S),b;if(C===null){for(;S<v.length;S++)C=f(p,v[S],w),C!==null&&(c=n(C,c,S),L===null?b=C:L.sibling=C,L=C);return Je&&on(p,S),b}for(C=a(p,C);S<v.length;S++)T=h(C,p,S,v[S],w),T!==null&&(e&&T.alternate!==null&&C.delete(T.key===null?S:T.key),c=n(T,c,S),L===null?b=T:L.sibling=T,L=T);return e&&C.forEach(function(q){return t(p,q)}),Je&&on(p,S),b}function g(p,c,v,w){var b=fi(v);if(typeof b!="function")throw Error(F(150));if(v=b.call(v),v==null)throw Error(F(151));for(var L=b=null,C=c,S=c=0,T=null,P=v.next();C!==null&&!P.done;S++,P=v.next()){C.index>S?(T=C,C=null):T=C.sibling;var q=m(p,C,P.value,w);if(q===null){C===null&&(C=T);break}e&&C&&q.alternate===null&&t(p,C),c=n(q,c,S),L===null?b=q:L.sibling=q,L=q,C=T}if(P.done)return o(p,C),Je&&on(p,S),b;if(C===null){for(;!P.done;S++,P=v.next())P=f(p,P.value,w),P!==null&&(c=n(P,c,S),L===null?b=P:L.sibling=P,L=P);return Je&&on(p,S),b}for(C=a(p,C);!P.done;S++,P=v.next())P=h(C,p,S,P.value,w),P!==null&&(e&&P.alternate!==null&&C.delete(P.key===null?S:P.key),c=n(P,c,S),L===null?b=P:L.sibling=P,L=P);return e&&C.forEach(function(M){return t(p,M)}),Je&&on(p,S),b}function x(p,c,v,w){if(typeof v=="object"&&v!==null&&v.type===$n&&v.key===null&&(v=v.props.children),typeof v=="object"&&v!==null){switch(v.$$typeof){case ou:e:{for(var b=v.key,L=c;L!==null;){if(L.key===b){if(b=v.type,b===$n){if(L.tag===7){o(p,L.sibling),c=r(L,v.props.children),c.return=p,p=c;break e}}else if(L.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===ur&&cx(b)===L.type){o(p,L.sibling),c=r(L,v.props),c.ref=hi(p,L,v),c.return=p,p=c;break e}o(p,L);break}else t(p,L);L=L.sibling}v.type===$n?(c=un(v.props.children,p.mode,w,v.key),c.return=p,p=c):(w=Eu(v.type,v.key,v.props,null,p.mode,w),w.ref=hi(p,c,v),w.return=p,p=w)}return l(p);case Wn:e:{for(L=v.key;c!==null;){if(c.key===L)if(c.tag===4&&c.stateNode.containerInfo===v.containerInfo&&c.stateNode.implementation===v.implementation){o(p,c.sibling),c=r(c,v.children||[]),c.return=p,p=c;break e}else{o(p,c);break}else t(p,c);c=c.sibling}c=Ef(v,p.mode,w),c.return=p,p=c}return l(p);case ur:return L=v._init,x(p,c,L(v._payload),w)}if(bi(v))return y(p,c,v,w);if(fi(v))return g(p,c,v,w);vu(p,v)}return typeof v=="string"&&v!==""||typeof v=="number"?(v=""+v,c!==null&&c.tag===6?(o(p,c.sibling),c=r(c,v),c.return=p,p=c):(o(p,c),c=Pf(v,p.mode,w),c.return=p,p=c),l(p)):o(p,c)}return x}var cl=Bw(!0),Ow=Bw(!1),Wu=Ir(null),$u=null,Jn=null,zp=null;function Vp(){zp=Jn=$u=null}function Wp(e){var t=Wu.current;je(Wu),e._currentValue=t}function lp(e,t,o){for(;e!==null;){var a=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,a!==null&&(a.childLanes|=t)):a!==null&&(a.childLanes&t)!==t&&(a.childLanes|=t),e===o)break;e=e.return}}function ll(e,t){$u=e,zp=Jn=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(ro=!0),e.firstContext=null)}function Bo(e){var t=e._currentValue;if(zp!==e)if(e={context:e,memoizedValue:t,next:null},Jn===null){if($u===null)throw Error(F(308));Jn=e,$u.dependencies={lanes:0,firstContext:e}}else Jn=Jn.next=e;return t}var nn=null;function $p(e){nn===null?nn=[e]:nn.push(e)}function Fw(e,t,o,a){var r=t.interleaved;return r===null?(o.next=o,$p(t)):(o.next=r.next,r.next=o),t.interleaved=o,$a(e,a)}function $a(e,t){e.lanes|=t;var o=e.alternate;for(o!==null&&(o.lanes|=t),o=e,e=e.return;e!==null;)e.childLanes|=t,o=e.alternate,o!==null&&(o.childLanes|=t),o=e,e=e.return;return o.tag===3?o.stateNode:null}var dr=!1;function Gp(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function _w(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function za(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function wr(e,t,o){var a=e.updateQueue;if(a===null)return null;if(a=a.shared,Ie&2){var r=a.pending;return r===null?t.next=t:(t.next=r.next,r.next=t),a.pending=t,$a(e,o)}return r=a.interleaved,r===null?(t.next=t,$p(a)):(t.next=r.next,r.next=t),a.interleaved=t,$a(e,o)}function Lu(e,t,o){if(t=t.updateQueue,t!==null&&(t=t.shared,(o&4194240)!==0)){var a=t.lanes;a&=e.pendingLanes,o|=a,t.lanes=o,Ap(e,o)}}function fx(e,t){var o=e.updateQueue,a=e.alternate;if(a!==null&&(a=a.updateQueue,o===a)){var r=null,n=null;if(o=o.firstBaseUpdate,o!==null){do{var l={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};n===null?r=n=l:n=n.next=l,o=o.next}while(o!==null);n===null?r=n=t:n=n.next=t}else r=n=t;o={baseState:a.baseState,firstBaseUpdate:r,lastBaseUpdate:n,shared:a.shared,effects:a.effects},e.updateQueue=o;return}e=o.lastBaseUpdate,e===null?o.firstBaseUpdate=t:e.next=t,o.lastBaseUpdate=t}function Gu(e,t,o,a){var r=e.updateQueue;dr=!1;var n=r.firstBaseUpdate,l=r.lastBaseUpdate,i=r.shared.pending;if(i!==null){r.shared.pending=null;var s=i,u=s.next;s.next=null,l===null?n=u:l.next=u,l=s;var d=e.alternate;d!==null&&(d=d.updateQueue,i=d.lastBaseUpdate,i!==l&&(i===null?d.firstBaseUpdate=u:i.next=u,d.lastBaseUpdate=s))}if(n!==null){var f=r.baseState;l=0,d=u=s=null,i=n;do{var m=i.lane,h=i.eventTime;if((a&m)===m){d!==null&&(d=d.next={eventTime:h,lane:0,tag:i.tag,payload:i.payload,callback:i.callback,next:null});e:{var y=e,g=i;switch(m=t,h=o,g.tag){case 1:if(y=g.payload,typeof y=="function"){f=y.call(h,f,m);break e}f=y;break e;case 3:y.flags=y.flags&-65537|128;case 0:if(y=g.payload,m=typeof y=="function"?y.call(h,f,m):y,m==null)break e;f=nt({},f,m);break e;case 2:dr=!0}}i.callback!==null&&i.lane!==0&&(e.flags|=64,m=r.effects,m===null?r.effects=[i]:m.push(i))}else h={eventTime:h,lane:m,tag:i.tag,payload:i.payload,callback:i.callback,next:null},d===null?(u=d=h,s=f):d=d.next=h,l|=m;if(i=i.next,i===null){if(i=r.shared.pending,i===null)break;m=i,i=m.next,m.next=null,r.lastBaseUpdate=m,r.shared.pending=null}}while(!0);if(d===null&&(s=f),r.baseState=s,r.firstBaseUpdate=u,r.lastBaseUpdate=d,t=r.shared.interleaved,t!==null){r=t;do l|=r.lane,r=r.next;while(r!==t)}else n===null&&(r.shared.lanes=0);pn|=l,e.lanes=l,e.memoizedState=f}}function px(e,t,o){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var a=e[t],r=a.callback;if(r!==null){if(a.callback=null,a=o,typeof r!="function")throw Error(F(191,r));r.call(a)}}}var Ji={},ma=Ir(Ji),Wi=Ir(Ji),$i=Ir(Ji);function ln(e){if(e===Ji)throw Error(F(174));return e}function jp(e,t){switch(Ve($i,t),Ve(Wi,e),Ve(ma,Ji),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:qf(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=qf(t,e)}je(ma),Ve(ma,t)}function fl(){je(ma),je(Wi),je($i)}function Hw(e){ln($i.current);var t=ln(ma.current),o=qf(t,e.type);t!==o&&(Ve(Wi,e),Ve(ma,o))}function Kp(e){Wi.current===e&&(je(ma),je(Wi))}var at=Ir(0);function ju(e){for(var t=e;t!==null;){if(t.tag===13){var o=t.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var Cf=[];function Xp(){for(var e=0;e<Cf.length;e++)Cf[e]._workInProgressVersionPrimary=null;Cf.length=0}var ku=ja.ReactCurrentDispatcher,Lf=ja.ReactCurrentBatchConfig,fn=0,rt=null,St=null,Rt=null,Ku=!1,Pi=!1,Gi=0,JP=0;function qt(){throw Error(F(321))}function Yp(e,t){if(t===null)return!1;for(var o=0;o<t.length&&o<e.length;o++)if(!Zo(e[o],t[o]))return!1;return!0}function Qp(e,t,o,a,r,n){if(fn=n,rt=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,ku.current=e===null||e.memoizedState===null?a1:r1,e=o(a,r),Pi){n=0;do{if(Pi=!1,Gi=0,25<=n)throw Error(F(301));n+=1,Rt=St=null,t.updateQueue=null,ku.current=n1,e=o(a,r)}while(Pi)}if(ku.current=Xu,t=St!==null&&St.next!==null,fn=0,Rt=St=rt=null,Ku=!1,t)throw Error(F(300));return e}function Zp(){var e=Gi!==0;return Gi=0,e}function ca(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Rt===null?rt.memoizedState=Rt=e:Rt=Rt.next=e,Rt}function Oo(){if(St===null){var e=rt.alternate;e=e!==null?e.memoizedState:null}else e=St.next;var t=Rt===null?rt.memoizedState:Rt.next;if(t!==null)Rt=t,St=e;else{if(e===null)throw Error(F(310));St=e,e={memoizedState:St.memoizedState,baseState:St.baseState,baseQueue:St.baseQueue,queue:St.queue,next:null},Rt===null?rt.memoizedState=Rt=e:Rt=Rt.next=e}return Rt}function ji(e,t){return typeof t=="function"?t(e):t}function kf(e){var t=Oo(),o=t.queue;if(o===null)throw Error(F(311));o.lastRenderedReducer=e;var a=St,r=a.baseQueue,n=o.pending;if(n!==null){if(r!==null){var l=r.next;r.next=n.next,n.next=l}a.baseQueue=r=n,o.pending=null}if(r!==null){n=r.next,a=a.baseState;var i=l=null,s=null,u=n;do{var d=u.lane;if((fn&d)===d)s!==null&&(s=s.next={lane:0,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null}),a=u.hasEagerState?u.eagerState:e(a,u.action);else{var f={lane:d,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null};s===null?(i=s=f,l=a):s=s.next=f,rt.lanes|=d,pn|=d}u=u.next}while(u!==null&&u!==n);s===null?l=a:s.next=i,Zo(a,t.memoizedState)||(ro=!0),t.memoizedState=a,t.baseState=l,t.baseQueue=s,o.lastRenderedState=a}if(e=o.interleaved,e!==null){r=e;do n=r.lane,rt.lanes|=n,pn|=n,r=r.next;while(r!==e)}else r===null&&(o.lanes=0);return[t.memoizedState,o.dispatch]}function If(e){var t=Oo(),o=t.queue;if(o===null)throw Error(F(311));o.lastRenderedReducer=e;var a=o.dispatch,r=o.pending,n=t.memoizedState;if(r!==null){o.pending=null;var l=r=r.next;do n=e(n,l.action),l=l.next;while(l!==r);Zo(n,t.memoizedState)||(ro=!0),t.memoizedState=n,t.baseQueue===null&&(t.baseState=n),o.lastRenderedState=n}return[n,a]}function qw(){}function Uw(e,t){var o=rt,a=Oo(),r=t(),n=!Zo(a.memoizedState,r);if(n&&(a.memoizedState=r,ro=!0),a=a.queue,Jp(Ww.bind(null,o,a,e),[e]),a.getSnapshot!==t||n||Rt!==null&&Rt.memoizedState.tag&1){if(o.flags|=2048,Ki(9,Vw.bind(null,o,a,r,t),void 0,null),Tt===null)throw Error(F(349));fn&30||zw(o,t,r)}return r}function zw(e,t,o){e.flags|=16384,e={getSnapshot:t,value:o},t=rt.updateQueue,t===null?(t={lastEffect:null,stores:null},rt.updateQueue=t,t.stores=[e]):(o=t.stores,o===null?t.stores=[e]:o.push(e))}function Vw(e,t,o,a){t.value=o,t.getSnapshot=a,$w(t)&&Gw(e)}function Ww(e,t,o){return o(function(){$w(t)&&Gw(e)})}function $w(e){var t=e.getSnapshot;e=e.value;try{var o=t();return!Zo(e,o)}catch{return!0}}function Gw(e){var t=$a(e,1);t!==null&&Qo(t,e,1,-1)}function mx(e){var t=ca();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:ji,lastRenderedState:e},t.queue=e,e=e.dispatch=o1.bind(null,rt,e),[t.memoizedState,e]}function Ki(e,t,o,a){return e={tag:e,create:t,destroy:o,deps:a,next:null},t=rt.updateQueue,t===null?(t={lastEffect:null,stores:null},rt.updateQueue=t,t.lastEffect=e.next=e):(o=t.lastEffect,o===null?t.lastEffect=e.next=e:(a=o.next,o.next=e,e.next=a,t.lastEffect=e)),e}function jw(){return Oo().memoizedState}function Iu(e,t,o,a){var r=ca();rt.flags|=e,r.memoizedState=Ki(1|t,o,void 0,a===void 0?null:a)}function id(e,t,o,a){var r=Oo();a=a===void 0?null:a;var n=void 0;if(St!==null){var l=St.memoizedState;if(n=l.destroy,a!==null&&Yp(a,l.deps)){r.memoizedState=Ki(t,o,n,a);return}}rt.flags|=e,r.memoizedState=Ki(1|t,o,n,a)}function gx(e,t){return Iu(8390656,8,e,t)}function Jp(e,t){return id(2048,8,e,t)}function Kw(e,t){return id(4,2,e,t)}function Xw(e,t){return id(4,4,e,t)}function Yw(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function Qw(e,t,o){return o=o!=null?o.concat([e]):null,id(4,4,Yw.bind(null,t,e),o)}function em(){}function Zw(e,t){var o=Oo();t=t===void 0?null:t;var a=o.memoizedState;return a!==null&&t!==null&&Yp(t,a[1])?a[0]:(o.memoizedState=[e,t],e)}function Jw(e,t){var o=Oo();t=t===void 0?null:t;var a=o.memoizedState;return a!==null&&t!==null&&Yp(t,a[1])?a[0]:(e=e(),o.memoizedState=[e,t],e)}function ey(e,t,o){return fn&21?(Zo(o,t)||(o=nw(),rt.lanes|=o,pn|=o,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,ro=!0),e.memoizedState=o)}function e1(e,t){var o=Oe;Oe=o!==0&&4>o?o:4,e(!0);var a=Lf.transition;Lf.transition={};try{e(!1),t()}finally{Oe=o,Lf.transition=a}}function ty(){return Oo().memoizedState}function t1(e,t,o){var a=br(e);if(o={lane:a,action:o,hasEagerState:!1,eagerState:null,next:null},oy(e))ay(t,o);else if(o=Fw(e,t,o,a),o!==null){var r=Yt();Qo(o,e,a,r),ry(o,t,a)}}function o1(e,t,o){var a=br(e),r={lane:a,action:o,hasEagerState:!1,eagerState:null,next:null};if(oy(e))ay(t,r);else{var n=e.alternate;if(e.lanes===0&&(n===null||n.lanes===0)&&(n=t.lastRenderedReducer,n!==null))try{var l=t.lastRenderedState,i=n(l,o);if(r.hasEagerState=!0,r.eagerState=i,Zo(i,l)){var s=t.interleaved;s===null?(r.next=r,$p(t)):(r.next=s.next,s.next=r),t.interleaved=r;return}}catch{}finally{}o=Fw(e,t,r,a),o!==null&&(r=Yt(),Qo(o,e,a,r),ry(o,t,a))}}function oy(e){var t=e.alternate;return e===rt||t!==null&&t===rt}function ay(e,t){Pi=Ku=!0;var o=e.pending;o===null?t.next=t:(t.next=o.next,o.next=t),e.pending=t}function ry(e,t,o){if(o&4194240){var a=t.lanes;a&=e.pendingLanes,o|=a,t.lanes=o,Ap(e,o)}}var Xu={readContext:Bo,useCallback:qt,useContext:qt,useEffect:qt,useImperativeHandle:qt,useInsertionEffect:qt,useLayoutEffect:qt,useMemo:qt,useReducer:qt,useRef:qt,useState:qt,useDebugValue:qt,useDeferredValue:qt,useTransition:qt,useMutableSource:qt,useSyncExternalStore:qt,useId:qt,unstable_isNewReconciler:!1},a1={readContext:Bo,useCallback:function(e,t){return ca().memoizedState=[e,t===void 0?null:t],e},useContext:Bo,useEffect:gx,useImperativeHandle:function(e,t,o){return o=o!=null?o.concat([e]):null,Iu(4194308,4,Yw.bind(null,t,e),o)},useLayoutEffect:function(e,t){return Iu(4194308,4,e,t)},useInsertionEffect:function(e,t){return Iu(4,2,e,t)},useMemo:function(e,t){var o=ca();return t=t===void 0?null:t,e=e(),o.memoizedState=[e,t],e},useReducer:function(e,t,o){var a=ca();return t=o!==void 0?o(t):t,a.memoizedState=a.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},a.queue=e,e=e.dispatch=t1.bind(null,rt,e),[a.memoizedState,e]},useRef:function(e){var t=ca();return e={current:e},t.memoizedState=e},useState:mx,useDebugValue:em,useDeferredValue:function(e){return ca().memoizedState=e},useTransition:function(){var e=mx(!1),t=e[0];return e=e1.bind(null,e[1]),ca().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,o){var a=rt,r=ca();if(Je){if(o===void 0)throw Error(F(407));o=o()}else{if(o=t(),Tt===null)throw Error(F(349));fn&30||zw(a,t,o)}r.memoizedState=o;var n={value:o,getSnapshot:t};return r.queue=n,gx(Ww.bind(null,a,n,e),[e]),a.flags|=2048,Ki(9,Vw.bind(null,a,n,o,t),void 0,null),o},useId:function(){var e=ca(),t=Tt.identifierPrefix;if(Je){var o=Ua,a=qa;o=(a&~(1<<32-Yo(a)-1)).toString(32)+o,t=":"+t+"R"+o,o=Gi++,0<o&&(t+="H"+o.toString(32)),t+=":"}else o=JP++,t=":"+t+"r"+o.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},r1={readContext:Bo,useCallback:Zw,useContext:Bo,useEffect:Jp,useImperativeHandle:Qw,useInsertionEffect:Kw,useLayoutEffect:Xw,useMemo:Jw,useReducer:kf,useRef:jw,useState:function(){return kf(ji)},useDebugValue:em,useDeferredValue:function(e){var t=Oo();return ey(t,St.memoizedState,e)},useTransition:function(){var e=kf(ji)[0],t=Oo().memoizedState;return[e,t]},useMutableSource:qw,useSyncExternalStore:Uw,useId:ty,unstable_isNewReconciler:!1},n1={readContext:Bo,useCallback:Zw,useContext:Bo,useEffect:Jp,useImperativeHandle:Qw,useInsertionEffect:Kw,useLayoutEffect:Xw,useMemo:Jw,useReducer:If,useRef:jw,useState:function(){return If(ji)},useDebugValue:em,useDeferredValue:function(e){var t=Oo();return St===null?t.memoizedState=e:ey(t,St.memoizedState,e)},useTransition:function(){var e=If(ji)[0],t=Oo().memoizedState;return[e,t]},useMutableSource:qw,useSyncExternalStore:Uw,useId:ty,unstable_isNewReconciler:!1};function jo(e,t){if(e&&e.defaultProps){t=nt({},t),e=e.defaultProps;for(var o in e)t[o]===void 0&&(t[o]=e[o]);return t}return t}function ip(e,t,o,a){t=e.memoizedState,o=o(a,t),o=o==null?t:nt({},t,o),e.memoizedState=o,e.lanes===0&&(e.updateQueue.baseState=o)}var sd={isMounted:function(e){return(e=e._reactInternals)?hn(e)===e:!1},enqueueSetState:function(e,t,o){e=e._reactInternals;var a=Yt(),r=br(e),n=za(a,r);n.payload=t,o!=null&&(n.callback=o),t=wr(e,n,r),t!==null&&(Qo(t,e,r,a),Lu(t,e,r))},enqueueReplaceState:function(e,t,o){e=e._reactInternals;var a=Yt(),r=br(e),n=za(a,r);n.tag=1,n.payload=t,o!=null&&(n.callback=o),t=wr(e,n,r),t!==null&&(Qo(t,e,r,a),Lu(t,e,r))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var o=Yt(),a=br(e),r=za(o,a);r.tag=2,t!=null&&(r.callback=t),t=wr(e,r,a),t!==null&&(Qo(t,e,a,o),Lu(t,e,a))}};function hx(e,t,o,a,r,n,l){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(a,n,l):t.prototype&&t.prototype.isPureReactComponent?!qi(o,a)||!qi(r,n):!0}function ny(e,t,o){var a=!1,r=Lr,n=t.contextType;return typeof n=="object"&&n!==null?n=Bo(n):(r=lo(t)?dn:Vt.current,a=t.contextTypes,n=(a=a!=null)?ul(e,r):Lr),t=new t(o,n),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=sd,e.stateNode=t,t._reactInternals=e,a&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=r,e.__reactInternalMemoizedMaskedChildContext=n),t}function vx(e,t,o,a){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(o,a),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(o,a),t.state!==e&&sd.enqueueReplaceState(t,t.state,null)}function sp(e,t,o,a){var r=e.stateNode;r.props=o,r.state=e.memoizedState,r.refs={},Gp(e);var n=t.contextType;typeof n=="object"&&n!==null?r.context=Bo(n):(n=lo(t)?dn:Vt.current,r.context=ul(e,n)),r.state=e.memoizedState,n=t.getDerivedStateFromProps,typeof n=="function"&&(ip(e,t,n,o),r.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof r.getSnapshotBeforeUpdate=="function"||typeof r.UNSAFE_componentWillMount!="function"&&typeof r.componentWillMount!="function"||(t=r.state,typeof r.componentWillMount=="function"&&r.componentWillMount(),typeof r.UNSAFE_componentWillMount=="function"&&r.UNSAFE_componentWillMount(),t!==r.state&&sd.enqueueReplaceState(r,r.state,null),Gu(e,o,r,a),r.state=e.memoizedState),typeof r.componentDidMount=="function"&&(e.flags|=4194308)}function pl(e,t){try{var o="",a=t;do o+=BT(a),a=a.return;while(a);var r=o}catch(n){r=`
Error generating stack: `+n.message+`
`+n.stack}return{value:e,source:t,stack:r,digest:null}}function Rf(e,t,o){return{value:e,source:null,stack:o??null,digest:t??null}}function up(e,t){try{console.error(t.value)}catch(o){setTimeout(function(){throw o})}}var l1=typeof WeakMap=="function"?WeakMap:Map;function ly(e,t,o){o=za(-1,o),o.tag=3,o.payload={element:null};var a=t.value;return o.callback=function(){Qu||(Qu=!0,wp=a),up(e,t)},o}function iy(e,t,o){o=za(-1,o),o.tag=3;var a=e.type.getDerivedStateFromError;if(typeof a=="function"){var r=t.value;o.payload=function(){return a(r)},o.callback=function(){up(e,t)}}var n=e.stateNode;return n!==null&&typeof n.componentDidCatch=="function"&&(o.callback=function(){up(e,t),typeof a!="function"&&(yr===null?yr=new Set([this]):yr.add(this));var l=t.stack;this.componentDidCatch(t.value,{componentStack:l!==null?l:""})}),o}function xx(e,t,o){var a=e.pingCache;if(a===null){a=e.pingCache=new l1;var r=new Set;a.set(t,r)}else r=a.get(t),r===void 0&&(r=new Set,a.set(t,r));r.has(o)||(r.add(o),e=y1.bind(null,e,t,o),t.then(e,e))}function wx(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function yx(e,t,o,a,r){return e.mode&1?(e.flags|=65536,e.lanes=r,e):(e===t?e.flags|=65536:(e.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(t=za(-1,1),t.tag=2,wr(o,t,1))),o.lanes|=1),e)}var i1=ja.ReactCurrentOwner,ro=!1;function Xt(e,t,o,a){t.child=e===null?Ow(t,null,o,a):cl(t,e.child,o,a)}function bx(e,t,o,a,r){o=o.render;var n=t.ref;return ll(t,r),a=Qp(e,t,o,a,n,r),o=Zp(),e!==null&&!ro?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~r,Ga(e,t,r)):(Je&&o&&Hp(t),t.flags|=1,Xt(e,t,a,r),t.child)}function Sx(e,t,o,a,r){if(e===null){var n=o.type;return typeof n=="function"&&!sm(n)&&n.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(t.tag=15,t.type=n,sy(e,t,n,a,r)):(e=Eu(o.type,null,a,t,t.mode,r),e.ref=t.ref,e.return=t,t.child=e)}if(n=e.child,!(e.lanes&r)){var l=n.memoizedProps;if(o=o.compare,o=o!==null?o:qi,o(l,a)&&e.ref===t.ref)return Ga(e,t,r)}return t.flags|=1,e=Sr(n,a),e.ref=t.ref,e.return=t,t.child=e}function sy(e,t,o,a,r){if(e!==null){var n=e.memoizedProps;if(qi(n,a)&&e.ref===t.ref)if(ro=!1,t.pendingProps=a=n,(e.lanes&r)!==0)e.flags&131072&&(ro=!0);else return t.lanes=e.lanes,Ga(e,t,r)}return dp(e,t,o,a,r)}function uy(e,t,o){var a=t.pendingProps,r=a.children,n=e!==null?e.memoizedState:null;if(a.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},Ve(tl,vo),vo|=o;else{if(!(o&1073741824))return e=n!==null?n.baseLanes|o:o,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,Ve(tl,vo),vo|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},a=n!==null?n.baseLanes:o,Ve(tl,vo),vo|=a}else n!==null?(a=n.baseLanes|o,t.memoizedState=null):a=o,Ve(tl,vo),vo|=a;return Xt(e,t,r,o),t.child}function dy(e,t){var o=t.ref;(e===null&&o!==null||e!==null&&e.ref!==o)&&(t.flags|=512,t.flags|=2097152)}function dp(e,t,o,a,r){var n=lo(o)?dn:Vt.current;return n=ul(t,n),ll(t,r),o=Qp(e,t,o,a,n,r),a=Zp(),e!==null&&!ro?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~r,Ga(e,t,r)):(Je&&a&&Hp(t),t.flags|=1,Xt(e,t,o,r),t.child)}function Cx(e,t,o,a,r){if(lo(o)){var n=!0;Uu(t)}else n=!1;if(ll(t,r),t.stateNode===null)Ru(e,t),ny(t,o,a),sp(t,o,a,r),a=!0;else if(e===null){var l=t.stateNode,i=t.memoizedProps;l.props=i;var s=l.context,u=o.contextType;typeof u=="object"&&u!==null?u=Bo(u):(u=lo(o)?dn:Vt.current,u=ul(t,u));var d=o.getDerivedStateFromProps,f=typeof d=="function"||typeof l.getSnapshotBeforeUpdate=="function";f||typeof l.UNSAFE_componentWillReceiveProps!="function"&&typeof l.componentWillReceiveProps!="function"||(i!==a||s!==u)&&vx(t,l,a,u),dr=!1;var m=t.memoizedState;l.state=m,Gu(t,a,l,r),s=t.memoizedState,i!==a||m!==s||no.current||dr?(typeof d=="function"&&(ip(t,o,d,a),s=t.memoizedState),(i=dr||hx(t,o,i,a,m,s,u))?(f||typeof l.UNSAFE_componentWillMount!="function"&&typeof l.componentWillMount!="function"||(typeof l.componentWillMount=="function"&&l.componentWillMount(),typeof l.UNSAFE_componentWillMount=="function"&&l.UNSAFE_componentWillMount()),typeof l.componentDidMount=="function"&&(t.flags|=4194308)):(typeof l.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=a,t.memoizedState=s),l.props=a,l.state=s,l.context=u,a=i):(typeof l.componentDidMount=="function"&&(t.flags|=4194308),a=!1)}else{l=t.stateNode,_w(e,t),i=t.memoizedProps,u=t.type===t.elementType?i:jo(t.type,i),l.props=u,f=t.pendingProps,m=l.context,s=o.contextType,typeof s=="object"&&s!==null?s=Bo(s):(s=lo(o)?dn:Vt.current,s=ul(t,s));var h=o.getDerivedStateFromProps;(d=typeof h=="function"||typeof l.getSnapshotBeforeUpdate=="function")||typeof l.UNSAFE_componentWillReceiveProps!="function"&&typeof l.componentWillReceiveProps!="function"||(i!==f||m!==s)&&vx(t,l,a,s),dr=!1,m=t.memoizedState,l.state=m,Gu(t,a,l,r);var y=t.memoizedState;i!==f||m!==y||no.current||dr?(typeof h=="function"&&(ip(t,o,h,a),y=t.memoizedState),(u=dr||hx(t,o,u,a,m,y,s)||!1)?(d||typeof l.UNSAFE_componentWillUpdate!="function"&&typeof l.componentWillUpdate!="function"||(typeof l.componentWillUpdate=="function"&&l.componentWillUpdate(a,y,s),typeof l.UNSAFE_componentWillUpdate=="function"&&l.UNSAFE_componentWillUpdate(a,y,s)),typeof l.componentDidUpdate=="function"&&(t.flags|=4),typeof l.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof l.componentDidUpdate!="function"||i===e.memoizedProps&&m===e.memoizedState||(t.flags|=4),typeof l.getSnapshotBeforeUpdate!="function"||i===e.memoizedProps&&m===e.memoizedState||(t.flags|=1024),t.memoizedProps=a,t.memoizedState=y),l.props=a,l.state=y,l.context=s,a=u):(typeof l.componentDidUpdate!="function"||i===e.memoizedProps&&m===e.memoizedState||(t.flags|=4),typeof l.getSnapshotBeforeUpdate!="function"||i===e.memoizedProps&&m===e.memoizedState||(t.flags|=1024),a=!1)}return cp(e,t,o,a,n,r)}function cp(e,t,o,a,r,n){dy(e,t);var l=(t.flags&128)!==0;if(!a&&!l)return r&&sx(t,o,!1),Ga(e,t,n);a=t.stateNode,i1.current=t;var i=l&&typeof o.getDerivedStateFromError!="function"?null:a.render();return t.flags|=1,e!==null&&l?(t.child=cl(t,e.child,null,n),t.child=cl(t,null,i,n)):Xt(e,t,i,n),t.memoizedState=a.state,r&&sx(t,o,!0),t.child}function cy(e){var t=e.stateNode;t.pendingContext?ix(e,t.pendingContext,t.pendingContext!==t.context):t.context&&ix(e,t.context,!1),jp(e,t.containerInfo)}function Lx(e,t,o,a,r){return dl(),Up(r),t.flags|=256,Xt(e,t,o,a),t.child}var fp={dehydrated:null,treeContext:null,retryLane:0};function pp(e){return{baseLanes:e,cachePool:null,transitions:null}}function fy(e,t,o){var a=t.pendingProps,r=at.current,n=!1,l=(t.flags&128)!==0,i;if((i=l)||(i=e!==null&&e.memoizedState===null?!1:(r&2)!==0),i?(n=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(r|=1),Ve(at,r&1),e===null)return np(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(l=a.children,e=a.fallback,n?(a=t.mode,n=t.child,l={mode:"hidden",children:l},!(a&1)&&n!==null?(n.childLanes=0,n.pendingProps=l):n=cd(l,a,0,null),e=un(e,a,o,null),n.return=t,e.return=t,n.sibling=e,t.child=n,t.child.memoizedState=pp(o),t.memoizedState=fp,e):tm(t,l));if(r=e.memoizedState,r!==null&&(i=r.dehydrated,i!==null))return s1(e,t,l,a,i,r,o);if(n){n=a.fallback,l=t.mode,r=e.child,i=r.sibling;var s={mode:"hidden",children:a.children};return!(l&1)&&t.child!==r?(a=t.child,a.childLanes=0,a.pendingProps=s,t.deletions=null):(a=Sr(r,s),a.subtreeFlags=r.subtreeFlags&14680064),i!==null?n=Sr(i,n):(n=un(n,l,o,null),n.flags|=2),n.return=t,a.return=t,a.sibling=n,t.child=a,a=n,n=t.child,l=e.child.memoizedState,l=l===null?pp(o):{baseLanes:l.baseLanes|o,cachePool:null,transitions:l.transitions},n.memoizedState=l,n.childLanes=e.childLanes&~o,t.memoizedState=fp,a}return n=e.child,e=n.sibling,a=Sr(n,{mode:"visible",children:a.children}),!(t.mode&1)&&(a.lanes=o),a.return=t,a.sibling=null,e!==null&&(o=t.deletions,o===null?(t.deletions=[e],t.flags|=16):o.push(e)),t.child=a,t.memoizedState=null,a}function tm(e,t){return t=cd({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function xu(e,t,o,a){return a!==null&&Up(a),cl(t,e.child,null,o),e=tm(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function s1(e,t,o,a,r,n,l){if(o)return t.flags&256?(t.flags&=-257,a=Rf(Error(F(422))),xu(e,t,l,a)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(n=a.fallback,r=t.mode,a=cd({mode:"visible",children:a.children},r,0,null),n=un(n,r,l,null),n.flags|=2,a.return=t,n.return=t,a.sibling=n,t.child=a,t.mode&1&&cl(t,e.child,null,l),t.child.memoizedState=pp(l),t.memoizedState=fp,n);if(!(t.mode&1))return xu(e,t,l,null);if(r.data==="$!"){if(a=r.nextSibling&&r.nextSibling.dataset,a)var i=a.dgst;return a=i,n=Error(F(419)),a=Rf(n,a,void 0),xu(e,t,l,a)}if(i=(l&e.childLanes)!==0,ro||i){if(a=Tt,a!==null){switch(l&-l){case 4:r=2;break;case 16:r=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:r=32;break;case 536870912:r=268435456;break;default:r=0}r=r&(a.suspendedLanes|l)?0:r,r!==0&&r!==n.retryLane&&(n.retryLane=r,$a(e,r),Qo(a,e,r,-1))}return im(),a=Rf(Error(F(421))),xu(e,t,l,a)}return r.data==="$?"?(t.flags|=128,t.child=e.child,t=b1.bind(null,e),r._reactRetry=t,null):(e=n.treeContext,xo=xr(r.nextSibling),wo=t,Je=!0,Xo=null,e!==null&&(Ao[Do++]=qa,Ao[Do++]=Ua,Ao[Do++]=cn,qa=e.id,Ua=e.overflow,cn=t),t=tm(t,a.children),t.flags|=4096,t)}function kx(e,t,o){e.lanes|=t;var a=e.alternate;a!==null&&(a.lanes|=t),lp(e.return,t,o)}function Tf(e,t,o,a,r){var n=e.memoizedState;n===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:a,tail:o,tailMode:r}:(n.isBackwards=t,n.rendering=null,n.renderingStartTime=0,n.last=a,n.tail=o,n.tailMode=r)}function py(e,t,o){var a=t.pendingProps,r=a.revealOrder,n=a.tail;if(Xt(e,t,a.children,o),a=at.current,a&2)a=a&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&kx(e,o,t);else if(e.tag===19)kx(e,o,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}a&=1}if(Ve(at,a),!(t.mode&1))t.memoizedState=null;else switch(r){case"forwards":for(o=t.child,r=null;o!==null;)e=o.alternate,e!==null&&ju(e)===null&&(r=o),o=o.sibling;o=r,o===null?(r=t.child,t.child=null):(r=o.sibling,o.sibling=null),Tf(t,!1,r,o,n);break;case"backwards":for(o=null,r=t.child,t.child=null;r!==null;){if(e=r.alternate,e!==null&&ju(e)===null){t.child=r;break}e=r.sibling,r.sibling=o,o=r,r=e}Tf(t,!0,o,null,n);break;case"together":Tf(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function Ru(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Ga(e,t,o){if(e!==null&&(t.dependencies=e.dependencies),pn|=t.lanes,!(o&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(F(153));if(t.child!==null){for(e=t.child,o=Sr(e,e.pendingProps),t.child=o,o.return=t;e.sibling!==null;)e=e.sibling,o=o.sibling=Sr(e,e.pendingProps),o.return=t;o.sibling=null}return t.child}function u1(e,t,o){switch(t.tag){case 3:cy(t),dl();break;case 5:Hw(t);break;case 1:lo(t.type)&&Uu(t);break;case 4:jp(t,t.stateNode.containerInfo);break;case 10:var a=t.type._context,r=t.memoizedProps.value;Ve(Wu,a._currentValue),a._currentValue=r;break;case 13:if(a=t.memoizedState,a!==null)return a.dehydrated!==null?(Ve(at,at.current&1),t.flags|=128,null):o&t.child.childLanes?fy(e,t,o):(Ve(at,at.current&1),e=Ga(e,t,o),e!==null?e.sibling:null);Ve(at,at.current&1);break;case 19:if(a=(o&t.childLanes)!==0,e.flags&128){if(a)return py(e,t,o);t.flags|=128}if(r=t.memoizedState,r!==null&&(r.rendering=null,r.tail=null,r.lastEffect=null),Ve(at,at.current),a)break;return null;case 22:case 23:return t.lanes=0,uy(e,t,o)}return Ga(e,t,o)}var my,mp,gy,hy;my=function(e,t){for(var o=t.child;o!==null;){if(o.tag===5||o.tag===6)e.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===t)break;for(;o.sibling===null;){if(o.return===null||o.return===t)return;o=o.return}o.sibling.return=o.return,o=o.sibling}};mp=function(){};gy=function(e,t,o,a){var r=e.memoizedProps;if(r!==a){e=t.stateNode,ln(ma.current);var n=null;switch(o){case"input":r=Of(e,r),a=Of(e,a),n=[];break;case"select":r=nt({},r,{value:void 0}),a=nt({},a,{value:void 0}),n=[];break;case"textarea":r=Hf(e,r),a=Hf(e,a),n=[];break;default:typeof r.onClick!="function"&&typeof a.onClick=="function"&&(e.onclick=Hu)}Uf(o,a);var l;o=null;for(u in r)if(!a.hasOwnProperty(u)&&r.hasOwnProperty(u)&&r[u]!=null)if(u==="style"){var i=r[u];for(l in i)i.hasOwnProperty(l)&&(o||(o={}),o[l]="")}else u!=="dangerouslySetInnerHTML"&&u!=="children"&&u!=="suppressContentEditableWarning"&&u!=="suppressHydrationWarning"&&u!=="autoFocus"&&(Ni.hasOwnProperty(u)?n||(n=[]):(n=n||[]).push(u,null));for(u in a){var s=a[u];if(i=r?.[u],a.hasOwnProperty(u)&&s!==i&&(s!=null||i!=null))if(u==="style")if(i){for(l in i)!i.hasOwnProperty(l)||s&&s.hasOwnProperty(l)||(o||(o={}),o[l]="");for(l in s)s.hasOwnProperty(l)&&i[l]!==s[l]&&(o||(o={}),o[l]=s[l])}else o||(n||(n=[]),n.push(u,o)),o=s;else u==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,i=i?i.__html:void 0,s!=null&&i!==s&&(n=n||[]).push(u,s)):u==="children"?typeof s!="string"&&typeof s!="number"||(n=n||[]).push(u,""+s):u!=="suppressContentEditableWarning"&&u!=="suppressHydrationWarning"&&(Ni.hasOwnProperty(u)?(s!=null&&u==="onScroll"&&Ge("scroll",e),n||i===s||(n=[])):(n=n||[]).push(u,s))}o&&(n=n||[]).push("style",o);var u=n;(t.updateQueue=u)&&(t.flags|=4)}};hy=function(e,t,o,a){o!==a&&(t.flags|=4)};function vi(e,t){if(!Je)switch(e.tailMode){case"hidden":t=e.tail;for(var o=null;t!==null;)t.alternate!==null&&(o=t),t=t.sibling;o===null?e.tail=null:o.sibling=null;break;case"collapsed":o=e.tail;for(var a=null;o!==null;)o.alternate!==null&&(a=o),o=o.sibling;a===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:a.sibling=null}}function Ut(e){var t=e.alternate!==null&&e.alternate.child===e.child,o=0,a=0;if(t)for(var r=e.child;r!==null;)o|=r.lanes|r.childLanes,a|=r.subtreeFlags&14680064,a|=r.flags&14680064,r.return=e,r=r.sibling;else for(r=e.child;r!==null;)o|=r.lanes|r.childLanes,a|=r.subtreeFlags,a|=r.flags,r.return=e,r=r.sibling;return e.subtreeFlags|=a,e.childLanes=o,t}function d1(e,t,o){var a=t.pendingProps;switch(qp(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Ut(t),null;case 1:return lo(t.type)&&qu(),Ut(t),null;case 3:return a=t.stateNode,fl(),je(no),je(Vt),Xp(),a.pendingContext&&(a.context=a.pendingContext,a.pendingContext=null),(e===null||e.child===null)&&(hu(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,Xo!==null&&(Sp(Xo),Xo=null))),mp(e,t),Ut(t),null;case 5:Kp(t);var r=ln($i.current);if(o=t.type,e!==null&&t.stateNode!=null)gy(e,t,o,a,r),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!a){if(t.stateNode===null)throw Error(F(166));return Ut(t),null}if(e=ln(ma.current),hu(t)){a=t.stateNode,o=t.type;var n=t.memoizedProps;switch(a[fa]=t,a[Vi]=n,e=(t.mode&1)!==0,o){case"dialog":Ge("cancel",a),Ge("close",a);break;case"iframe":case"object":case"embed":Ge("load",a);break;case"video":case"audio":for(r=0;r<Ci.length;r++)Ge(Ci[r],a);break;case"source":Ge("error",a);break;case"img":case"image":case"link":Ge("error",a),Ge("load",a);break;case"details":Ge("toggle",a);break;case"input":Nv(a,n),Ge("invalid",a);break;case"select":a._wrapperState={wasMultiple:!!n.multiple},Ge("invalid",a);break;case"textarea":Bv(a,n),Ge("invalid",a)}Uf(o,n),r=null;for(var l in n)if(n.hasOwnProperty(l)){var i=n[l];l==="children"?typeof i=="string"?a.textContent!==i&&(n.suppressHydrationWarning!==!0&&gu(a.textContent,i,e),r=["children",i]):typeof i=="number"&&a.textContent!==""+i&&(n.suppressHydrationWarning!==!0&&gu(a.textContent,i,e),r=["children",""+i]):Ni.hasOwnProperty(l)&&i!=null&&l==="onScroll"&&Ge("scroll",a)}switch(o){case"input":au(a),Mv(a,n,!0);break;case"textarea":au(a),Ov(a);break;case"select":case"option":break;default:typeof n.onClick=="function"&&(a.onclick=Hu)}a=r,t.updateQueue=a,a!==null&&(t.flags|=4)}else{l=r.nodeType===9?r:r.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=Wx(o)),e==="http://www.w3.org/1999/xhtml"?o==="script"?(e=l.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof a.is=="string"?e=l.createElement(o,{is:a.is}):(e=l.createElement(o),o==="select"&&(l=e,a.multiple?l.multiple=!0:a.size&&(l.size=a.size))):e=l.createElementNS(e,o),e[fa]=t,e[Vi]=a,my(e,t,!1,!1),t.stateNode=e;e:{switch(l=zf(o,a),o){case"dialog":Ge("cancel",e),Ge("close",e),r=a;break;case"iframe":case"object":case"embed":Ge("load",e),r=a;break;case"video":case"audio":for(r=0;r<Ci.length;r++)Ge(Ci[r],e);r=a;break;case"source":Ge("error",e),r=a;break;case"img":case"image":case"link":Ge("error",e),Ge("load",e),r=a;break;case"details":Ge("toggle",e),r=a;break;case"input":Nv(e,a),r=Of(e,a),Ge("invalid",e);break;case"option":r=a;break;case"select":e._wrapperState={wasMultiple:!!a.multiple},r=nt({},a,{value:void 0}),Ge("invalid",e);break;case"textarea":Bv(e,a),r=Hf(e,a),Ge("invalid",e);break;default:r=a}Uf(o,r),i=r;for(n in i)if(i.hasOwnProperty(n)){var s=i[n];n==="style"?jx(e,s):n==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,s!=null&&$x(e,s)):n==="children"?typeof s=="string"?(o!=="textarea"||s!=="")&&Mi(e,s):typeof s=="number"&&Mi(e,""+s):n!=="suppressContentEditableWarning"&&n!=="suppressHydrationWarning"&&n!=="autoFocus"&&(Ni.hasOwnProperty(n)?s!=null&&n==="onScroll"&&Ge("scroll",e):s!=null&&kp(e,n,s,l))}switch(o){case"input":au(e),Mv(e,a,!1);break;case"textarea":au(e),Ov(e);break;case"option":a.value!=null&&e.setAttribute("value",""+Cr(a.value));break;case"select":e.multiple=!!a.multiple,n=a.value,n!=null?ol(e,!!a.multiple,n,!1):a.defaultValue!=null&&ol(e,!!a.multiple,a.defaultValue,!0);break;default:typeof r.onClick=="function"&&(e.onclick=Hu)}switch(o){case"button":case"input":case"select":case"textarea":a=!!a.autoFocus;break e;case"img":a=!0;break e;default:a=!1}}a&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return Ut(t),null;case 6:if(e&&t.stateNode!=null)hy(e,t,e.memoizedProps,a);else{if(typeof a!="string"&&t.stateNode===null)throw Error(F(166));if(o=ln($i.current),ln(ma.current),hu(t)){if(a=t.stateNode,o=t.memoizedProps,a[fa]=t,(n=a.nodeValue!==o)&&(e=wo,e!==null))switch(e.tag){case 3:gu(a.nodeValue,o,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&gu(a.nodeValue,o,(e.mode&1)!==0)}n&&(t.flags|=4)}else a=(o.nodeType===9?o:o.ownerDocument).createTextNode(a),a[fa]=t,t.stateNode=a}return Ut(t),null;case 13:if(je(at),a=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(Je&&xo!==null&&t.mode&1&&!(t.flags&128))Mw(),dl(),t.flags|=98560,n=!1;else if(n=hu(t),a!==null&&a.dehydrated!==null){if(e===null){if(!n)throw Error(F(318));if(n=t.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(F(317));n[fa]=t}else dl(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;Ut(t),n=!1}else Xo!==null&&(Sp(Xo),Xo=null),n=!0;if(!n)return t.flags&65536?t:null}return t.flags&128?(t.lanes=o,t):(a=a!==null,a!==(e!==null&&e.memoizedState!==null)&&a&&(t.child.flags|=8192,t.mode&1&&(e===null||at.current&1?Ct===0&&(Ct=3):im())),t.updateQueue!==null&&(t.flags|=4),Ut(t),null);case 4:return fl(),mp(e,t),e===null&&Ui(t.stateNode.containerInfo),Ut(t),null;case 10:return Wp(t.type._context),Ut(t),null;case 17:return lo(t.type)&&qu(),Ut(t),null;case 19:if(je(at),n=t.memoizedState,n===null)return Ut(t),null;if(a=(t.flags&128)!==0,l=n.rendering,l===null)if(a)vi(n,!1);else{if(Ct!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(l=ju(e),l!==null){for(t.flags|=128,vi(n,!1),a=l.updateQueue,a!==null&&(t.updateQueue=a,t.flags|=4),t.subtreeFlags=0,a=o,o=t.child;o!==null;)n=o,e=a,n.flags&=14680066,l=n.alternate,l===null?(n.childLanes=0,n.lanes=e,n.child=null,n.subtreeFlags=0,n.memoizedProps=null,n.memoizedState=null,n.updateQueue=null,n.dependencies=null,n.stateNode=null):(n.childLanes=l.childLanes,n.lanes=l.lanes,n.child=l.child,n.subtreeFlags=0,n.deletions=null,n.memoizedProps=l.memoizedProps,n.memoizedState=l.memoizedState,n.updateQueue=l.updateQueue,n.type=l.type,e=l.dependencies,n.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),o=o.sibling;return Ve(at,at.current&1|2),t.child}e=e.sibling}n.tail!==null&&ft()>ml&&(t.flags|=128,a=!0,vi(n,!1),t.lanes=4194304)}else{if(!a)if(e=ju(l),e!==null){if(t.flags|=128,a=!0,o=e.updateQueue,o!==null&&(t.updateQueue=o,t.flags|=4),vi(n,!0),n.tail===null&&n.tailMode==="hidden"&&!l.alternate&&!Je)return Ut(t),null}else 2*ft()-n.renderingStartTime>ml&&o!==1073741824&&(t.flags|=128,a=!0,vi(n,!1),t.lanes=4194304);n.isBackwards?(l.sibling=t.child,t.child=l):(o=n.last,o!==null?o.sibling=l:t.child=l,n.last=l)}return n.tail!==null?(t=n.tail,n.rendering=t,n.tail=t.sibling,n.renderingStartTime=ft(),t.sibling=null,o=at.current,Ve(at,a?o&1|2:o&1),t):(Ut(t),null);case 22:case 23:return lm(),a=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==a&&(t.flags|=8192),a&&t.mode&1?vo&1073741824&&(Ut(t),t.subtreeFlags&6&&(t.flags|=8192)):Ut(t),null;case 24:return null;case 25:return null}throw Error(F(156,t.tag))}function c1(e,t){switch(qp(t),t.tag){case 1:return lo(t.type)&&qu(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return fl(),je(no),je(Vt),Xp(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return Kp(t),null;case 13:if(je(at),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(F(340));dl()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return je(at),null;case 4:return fl(),null;case 10:return Wp(t.type._context),null;case 22:case 23:return lm(),null;case 24:return null;default:return null}}var wu=!1,zt=!1,f1=typeof WeakSet=="function"?WeakSet:Set,Z=null;function el(e,t){var o=e.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(a){ut(e,t,a)}else o.current=null}function gp(e,t,o){try{o()}catch(a){ut(e,t,a)}}var Ix=!1;function p1(e,t){if(Zf=Ou,e=bw(),_p(e)){if("selectionStart"in e)var o={start:e.selectionStart,end:e.selectionEnd};else e:{o=(o=e.ownerDocument)&&o.defaultView||window;var a=o.getSelection&&o.getSelection();if(a&&a.rangeCount!==0){o=a.anchorNode;var r=a.anchorOffset,n=a.focusNode;a=a.focusOffset;try{o.nodeType,n.nodeType}catch{o=null;break e}var l=0,i=-1,s=-1,u=0,d=0,f=e,m=null;t:for(;;){for(var h;f!==o||r!==0&&f.nodeType!==3||(i=l+r),f!==n||a!==0&&f.nodeType!==3||(s=l+a),f.nodeType===3&&(l+=f.nodeValue.length),(h=f.firstChild)!==null;)m=f,f=h;for(;;){if(f===e)break t;if(m===o&&++u===r&&(i=l),m===n&&++d===a&&(s=l),(h=f.nextSibling)!==null)break;f=m,m=f.parentNode}f=h}o=i===-1||s===-1?null:{start:i,end:s}}else o=null}o=o||{start:0,end:0}}else o=null;for(Jf={focusedElem:e,selectionRange:o},Ou=!1,Z=t;Z!==null;)if(t=Z,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,Z=e;else for(;Z!==null;){t=Z;try{var y=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(y!==null){var g=y.memoizedProps,x=y.memoizedState,p=t.stateNode,c=p.getSnapshotBeforeUpdate(t.elementType===t.type?g:jo(t.type,g),x);p.__reactInternalSnapshotBeforeUpdate=c}break;case 3:var v=t.stateNode.containerInfo;v.nodeType===1?v.textContent="":v.nodeType===9&&v.documentElement&&v.removeChild(v.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(F(163))}}catch(w){ut(t,t.return,w)}if(e=t.sibling,e!==null){e.return=t.return,Z=e;break}Z=t.return}return y=Ix,Ix=!1,y}function Ei(e,t,o){var a=t.updateQueue;if(a=a!==null?a.lastEffect:null,a!==null){var r=a=a.next;do{if((r.tag&e)===e){var n=r.destroy;r.destroy=void 0,n!==void 0&&gp(t,o,n)}r=r.next}while(r!==a)}}function ud(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var o=t=t.next;do{if((o.tag&e)===e){var a=o.create;o.destroy=a()}o=o.next}while(o!==t)}}function hp(e){var t=e.ref;if(t!==null){var o=e.stateNode;switch(e.tag){case 5:e=o;break;default:e=o}typeof t=="function"?t(e):t.current=e}}function vy(e){var t=e.alternate;t!==null&&(e.alternate=null,vy(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[fa],delete t[Vi],delete t[op],delete t[XP],delete t[YP])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function xy(e){return e.tag===5||e.tag===3||e.tag===4}function Rx(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||xy(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function vp(e,t,o){var a=e.tag;if(a===5||a===6)e=e.stateNode,t?o.nodeType===8?o.parentNode.insertBefore(e,t):o.insertBefore(e,t):(o.nodeType===8?(t=o.parentNode,t.insertBefore(e,o)):(t=o,t.appendChild(e)),o=o._reactRootContainer,o!=null||t.onclick!==null||(t.onclick=Hu));else if(a!==4&&(e=e.child,e!==null))for(vp(e,t,o),e=e.sibling;e!==null;)vp(e,t,o),e=e.sibling}function xp(e,t,o){var a=e.tag;if(a===5||a===6)e=e.stateNode,t?o.insertBefore(e,t):o.appendChild(e);else if(a!==4&&(e=e.child,e!==null))for(xp(e,t,o),e=e.sibling;e!==null;)xp(e,t,o),e=e.sibling}var Nt=null,Ko=!1;function sr(e,t,o){for(o=o.child;o!==null;)wy(e,t,o),o=o.sibling}function wy(e,t,o){if(pa&&typeof pa.onCommitFiberUnmount=="function")try{pa.onCommitFiberUnmount(td,o)}catch{}switch(o.tag){case 5:zt||el(o,t);case 6:var a=Nt,r=Ko;Nt=null,sr(e,t,o),Nt=a,Ko=r,Nt!==null&&(Ko?(e=Nt,o=o.stateNode,e.nodeType===8?e.parentNode.removeChild(o):e.removeChild(o)):Nt.removeChild(o.stateNode));break;case 18:Nt!==null&&(Ko?(e=Nt,o=o.stateNode,e.nodeType===8?bf(e.parentNode,o):e.nodeType===1&&bf(e,o),_i(e)):bf(Nt,o.stateNode));break;case 4:a=Nt,r=Ko,Nt=o.stateNode.containerInfo,Ko=!0,sr(e,t,o),Nt=a,Ko=r;break;case 0:case 11:case 14:case 15:if(!zt&&(a=o.updateQueue,a!==null&&(a=a.lastEffect,a!==null))){r=a=a.next;do{var n=r,l=n.destroy;n=n.tag,l!==void 0&&(n&2||n&4)&&gp(o,t,l),r=r.next}while(r!==a)}sr(e,t,o);break;case 1:if(!zt&&(el(o,t),a=o.stateNode,typeof a.componentWillUnmount=="function"))try{a.props=o.memoizedProps,a.state=o.memoizedState,a.componentWillUnmount()}catch(i){ut(o,t,i)}sr(e,t,o);break;case 21:sr(e,t,o);break;case 22:o.mode&1?(zt=(a=zt)||o.memoizedState!==null,sr(e,t,o),zt=a):sr(e,t,o);break;default:sr(e,t,o)}}function Tx(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var o=e.stateNode;o===null&&(o=e.stateNode=new f1),t.forEach(function(a){var r=S1.bind(null,e,a);o.has(a)||(o.add(a),a.then(r,r))})}}function Go(e,t){var o=t.deletions;if(o!==null)for(var a=0;a<o.length;a++){var r=o[a];try{var n=e,l=t,i=l;e:for(;i!==null;){switch(i.tag){case 5:Nt=i.stateNode,Ko=!1;break e;case 3:Nt=i.stateNode.containerInfo,Ko=!0;break e;case 4:Nt=i.stateNode.containerInfo,Ko=!0;break e}i=i.return}if(Nt===null)throw Error(F(160));wy(n,l,r),Nt=null,Ko=!1;var s=r.alternate;s!==null&&(s.return=null),r.return=null}catch(u){ut(r,t,u)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)yy(t,e),t=t.sibling}function yy(e,t){var o=e.alternate,a=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(Go(t,e),da(e),a&4){try{Ei(3,e,e.return),ud(3,e)}catch(g){ut(e,e.return,g)}try{Ei(5,e,e.return)}catch(g){ut(e,e.return,g)}}break;case 1:Go(t,e),da(e),a&512&&o!==null&&el(o,o.return);break;case 5:if(Go(t,e),da(e),a&512&&o!==null&&el(o,o.return),e.flags&32){var r=e.stateNode;try{Mi(r,"")}catch(g){ut(e,e.return,g)}}if(a&4&&(r=e.stateNode,r!=null)){var n=e.memoizedProps,l=o!==null?o.memoizedProps:n,i=e.type,s=e.updateQueue;if(e.updateQueue=null,s!==null)try{i==="input"&&n.type==="radio"&&n.name!=null&&zx(r,n),zf(i,l);var u=zf(i,n);for(l=0;l<s.length;l+=2){var d=s[l],f=s[l+1];d==="style"?jx(r,f):d==="dangerouslySetInnerHTML"?$x(r,f):d==="children"?Mi(r,f):kp(r,d,f,u)}switch(i){case"input":Ff(r,n);break;case"textarea":Vx(r,n);break;case"select":var m=r._wrapperState.wasMultiple;r._wrapperState.wasMultiple=!!n.multiple;var h=n.value;h!=null?ol(r,!!n.multiple,h,!1):m!==!!n.multiple&&(n.defaultValue!=null?ol(r,!!n.multiple,n.defaultValue,!0):ol(r,!!n.multiple,n.multiple?[]:"",!1))}r[Vi]=n}catch(g){ut(e,e.return,g)}}break;case 6:if(Go(t,e),da(e),a&4){if(e.stateNode===null)throw Error(F(162));r=e.stateNode,n=e.memoizedProps;try{r.nodeValue=n}catch(g){ut(e,e.return,g)}}break;case 3:if(Go(t,e),da(e),a&4&&o!==null&&o.memoizedState.isDehydrated)try{_i(t.containerInfo)}catch(g){ut(e,e.return,g)}break;case 4:Go(t,e),da(e);break;case 13:Go(t,e),da(e),r=e.child,r.flags&8192&&(n=r.memoizedState!==null,r.stateNode.isHidden=n,!n||r.alternate!==null&&r.alternate.memoizedState!==null||(rm=ft())),a&4&&Tx(e);break;case 22:if(d=o!==null&&o.memoizedState!==null,e.mode&1?(zt=(u=zt)||d,Go(t,e),zt=u):Go(t,e),da(e),a&8192){if(u=e.memoizedState!==null,(e.stateNode.isHidden=u)&&!d&&e.mode&1)for(Z=e,d=e.child;d!==null;){for(f=Z=d;Z!==null;){switch(m=Z,h=m.child,m.tag){case 0:case 11:case 14:case 15:Ei(4,m,m.return);break;case 1:el(m,m.return);var y=m.stateNode;if(typeof y.componentWillUnmount=="function"){a=m,o=m.return;try{t=a,y.props=t.memoizedProps,y.state=t.memoizedState,y.componentWillUnmount()}catch(g){ut(a,o,g)}}break;case 5:el(m,m.return);break;case 22:if(m.memoizedState!==null){Ex(f);continue}}h!==null?(h.return=m,Z=h):Ex(f)}d=d.sibling}e:for(d=null,f=e;;){if(f.tag===5){if(d===null){d=f;try{r=f.stateNode,u?(n=r.style,typeof n.setProperty=="function"?n.setProperty("display","none","important"):n.display="none"):(i=f.stateNode,s=f.memoizedProps.style,l=s!=null&&s.hasOwnProperty("display")?s.display:null,i.style.display=Gx("display",l))}catch(g){ut(e,e.return,g)}}}else if(f.tag===6){if(d===null)try{f.stateNode.nodeValue=u?"":f.memoizedProps}catch(g){ut(e,e.return,g)}}else if((f.tag!==22&&f.tag!==23||f.memoizedState===null||f===e)&&f.child!==null){f.child.return=f,f=f.child;continue}if(f===e)break e;for(;f.sibling===null;){if(f.return===null||f.return===e)break e;d===f&&(d=null),f=f.return}d===f&&(d=null),f.sibling.return=f.return,f=f.sibling}}break;case 19:Go(t,e),da(e),a&4&&Tx(e);break;case 21:break;default:Go(t,e),da(e)}}function da(e){var t=e.flags;if(t&2){try{e:{for(var o=e.return;o!==null;){if(xy(o)){var a=o;break e}o=o.return}throw Error(F(160))}switch(a.tag){case 5:var r=a.stateNode;a.flags&32&&(Mi(r,""),a.flags&=-33);var n=Rx(e);xp(e,n,r);break;case 3:case 4:var l=a.stateNode.containerInfo,i=Rx(e);vp(e,i,l);break;default:throw Error(F(161))}}catch(s){ut(e,e.return,s)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function m1(e,t,o){Z=e,by(e,t,o)}function by(e,t,o){for(var a=(e.mode&1)!==0;Z!==null;){var r=Z,n=r.child;if(r.tag===22&&a){var l=r.memoizedState!==null||wu;if(!l){var i=r.alternate,s=i!==null&&i.memoizedState!==null||zt;i=wu;var u=zt;if(wu=l,(zt=s)&&!u)for(Z=r;Z!==null;)l=Z,s=l.child,l.tag===22&&l.memoizedState!==null?Ax(r):s!==null?(s.return=l,Z=s):Ax(r);for(;n!==null;)Z=n,by(n,t,o),n=n.sibling;Z=r,wu=i,zt=u}Px(e,t,o)}else r.subtreeFlags&8772&&n!==null?(n.return=r,Z=n):Px(e,t,o)}}function Px(e){for(;Z!==null;){var t=Z;if(t.flags&8772){var o=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:zt||ud(5,t);break;case 1:var a=t.stateNode;if(t.flags&4&&!zt)if(o===null)a.componentDidMount();else{var r=t.elementType===t.type?o.memoizedProps:jo(t.type,o.memoizedProps);a.componentDidUpdate(r,o.memoizedState,a.__reactInternalSnapshotBeforeUpdate)}var n=t.updateQueue;n!==null&&px(t,n,a);break;case 3:var l=t.updateQueue;if(l!==null){if(o=null,t.child!==null)switch(t.child.tag){case 5:o=t.child.stateNode;break;case 1:o=t.child.stateNode}px(t,l,o)}break;case 5:var i=t.stateNode;if(o===null&&t.flags&4){o=i;var s=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":s.autoFocus&&o.focus();break;case"img":s.src&&(o.src=s.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var u=t.alternate;if(u!==null){var d=u.memoizedState;if(d!==null){var f=d.dehydrated;f!==null&&_i(f)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(F(163))}zt||t.flags&512&&hp(t)}catch(m){ut(t,t.return,m)}}if(t===e){Z=null;break}if(o=t.sibling,o!==null){o.return=t.return,Z=o;break}Z=t.return}}function Ex(e){for(;Z!==null;){var t=Z;if(t===e){Z=null;break}var o=t.sibling;if(o!==null){o.return=t.return,Z=o;break}Z=t.return}}function Ax(e){for(;Z!==null;){var t=Z;try{switch(t.tag){case 0:case 11:case 15:var o=t.return;try{ud(4,t)}catch(s){ut(t,o,s)}break;case 1:var a=t.stateNode;if(typeof a.componentDidMount=="function"){var r=t.return;try{a.componentDidMount()}catch(s){ut(t,r,s)}}var n=t.return;try{hp(t)}catch(s){ut(t,n,s)}break;case 5:var l=t.return;try{hp(t)}catch(s){ut(t,l,s)}}}catch(s){ut(t,t.return,s)}if(t===e){Z=null;break}var i=t.sibling;if(i!==null){i.return=t.return,Z=i;break}Z=t.return}}var g1=Math.ceil,Yu=ja.ReactCurrentDispatcher,om=ja.ReactCurrentOwner,Mo=ja.ReactCurrentBatchConfig,Ie=0,Tt=null,xt=null,Mt=0,vo=0,tl=Ir(0),Ct=0,Xi=null,pn=0,dd=0,am=0,Ai=null,ao=null,rm=0,ml=1/0,_a=null,Qu=!1,wp=null,yr=null,yu=!1,mr=null,Zu=0,Di=0,yp=null,Tu=-1,Pu=0;function Yt(){return Ie&6?ft():Tu!==-1?Tu:Tu=ft()}function br(e){return e.mode&1?Ie&2&&Mt!==0?Mt&-Mt:ZP.transition!==null?(Pu===0&&(Pu=nw()),Pu):(e=Oe,e!==0||(e=window.event,e=e===void 0?16:fw(e.type)),e):1}function Qo(e,t,o,a){if(50<Di)throw Di=0,yp=null,Error(F(185));Yi(e,o,a),(!(Ie&2)||e!==Tt)&&(e===Tt&&(!(Ie&2)&&(dd|=o),Ct===4&&fr(e,Mt)),io(e,a),o===1&&Ie===0&&!(t.mode&1)&&(ml=ft()+500,ld&&Rr()))}function io(e,t){var o=e.callbackNode;eP(e,t);var a=Bu(e,e===Tt?Mt:0);if(a===0)o!==null&&Hv(o),e.callbackNode=null,e.callbackPriority=0;else if(t=a&-a,e.callbackPriority!==t){if(o!=null&&Hv(o),t===1)e.tag===0?QP(Dx.bind(null,e)):Aw(Dx.bind(null,e)),jP(function(){!(Ie&6)&&Rr()}),o=null;else{switch(lw(a)){case 1:o=Ep;break;case 4:o=aw;break;case 16:o=Mu;break;case 536870912:o=rw;break;default:o=Mu}o=Py(o,Sy.bind(null,e))}e.callbackPriority=t,e.callbackNode=o}}function Sy(e,t){if(Tu=-1,Pu=0,Ie&6)throw Error(F(327));var o=e.callbackNode;if(il()&&e.callbackNode!==o)return null;var a=Bu(e,e===Tt?Mt:0);if(a===0)return null;if(a&30||a&e.expiredLanes||t)t=Ju(e,a);else{t=a;var r=Ie;Ie|=2;var n=Ly();(Tt!==e||Mt!==t)&&(_a=null,ml=ft()+500,sn(e,t));do try{x1();break}catch(i){Cy(e,i)}while(!0);Vp(),Yu.current=n,Ie=r,xt!==null?t=0:(Tt=null,Mt=0,t=Ct)}if(t!==0){if(t===2&&(r=jf(e),r!==0&&(a=r,t=bp(e,r))),t===1)throw o=Xi,sn(e,0),fr(e,a),io(e,ft()),o;if(t===6)fr(e,a);else{if(r=e.current.alternate,!(a&30)&&!h1(r)&&(t=Ju(e,a),t===2&&(n=jf(e),n!==0&&(a=n,t=bp(e,n))),t===1))throw o=Xi,sn(e,0),fr(e,a),io(e,ft()),o;switch(e.finishedWork=r,e.finishedLanes=a,t){case 0:case 1:throw Error(F(345));case 2:an(e,ao,_a);break;case 3:if(fr(e,a),(a&130023424)===a&&(t=rm+500-ft(),10<t)){if(Bu(e,0)!==0)break;if(r=e.suspendedLanes,(r&a)!==a){Yt(),e.pingedLanes|=e.suspendedLanes&r;break}e.timeoutHandle=tp(an.bind(null,e,ao,_a),t);break}an(e,ao,_a);break;case 4:if(fr(e,a),(a&4194240)===a)break;for(t=e.eventTimes,r=-1;0<a;){var l=31-Yo(a);n=1<<l,l=t[l],l>r&&(r=l),a&=~n}if(a=r,a=ft()-a,a=(120>a?120:480>a?480:1080>a?1080:1920>a?1920:3e3>a?3e3:4320>a?4320:1960*g1(a/1960))-a,10<a){e.timeoutHandle=tp(an.bind(null,e,ao,_a),a);break}an(e,ao,_a);break;case 5:an(e,ao,_a);break;default:throw Error(F(329))}}}return io(e,ft()),e.callbackNode===o?Sy.bind(null,e):null}function bp(e,t){var o=Ai;return e.current.memoizedState.isDehydrated&&(sn(e,t).flags|=256),e=Ju(e,t),e!==2&&(t=ao,ao=o,t!==null&&Sp(t)),e}function Sp(e){ao===null?ao=e:ao.push.apply(ao,e)}function h1(e){for(var t=e;;){if(t.flags&16384){var o=t.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var a=0;a<o.length;a++){var r=o[a],n=r.getSnapshot;r=r.value;try{if(!Zo(n(),r))return!1}catch{return!1}}}if(o=t.child,t.subtreeFlags&16384&&o!==null)o.return=t,t=o;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function fr(e,t){for(t&=~am,t&=~dd,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var o=31-Yo(t),a=1<<o;e[o]=-1,t&=~a}}function Dx(e){if(Ie&6)throw Error(F(327));il();var t=Bu(e,0);if(!(t&1))return io(e,ft()),null;var o=Ju(e,t);if(e.tag!==0&&o===2){var a=jf(e);a!==0&&(t=a,o=bp(e,a))}if(o===1)throw o=Xi,sn(e,0),fr(e,t),io(e,ft()),o;if(o===6)throw Error(F(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,an(e,ao,_a),io(e,ft()),null}function nm(e,t){var o=Ie;Ie|=1;try{return e(t)}finally{Ie=o,Ie===0&&(ml=ft()+500,ld&&Rr())}}function mn(e){mr!==null&&mr.tag===0&&!(Ie&6)&&il();var t=Ie;Ie|=1;var o=Mo.transition,a=Oe;try{if(Mo.transition=null,Oe=1,e)return e()}finally{Oe=a,Mo.transition=o,Ie=t,!(Ie&6)&&Rr()}}function lm(){vo=tl.current,je(tl)}function sn(e,t){e.finishedWork=null,e.finishedLanes=0;var o=e.timeoutHandle;if(o!==-1&&(e.timeoutHandle=-1,GP(o)),xt!==null)for(o=xt.return;o!==null;){var a=o;switch(qp(a),a.tag){case 1:a=a.type.childContextTypes,a!=null&&qu();break;case 3:fl(),je(no),je(Vt),Xp();break;case 5:Kp(a);break;case 4:fl();break;case 13:je(at);break;case 19:je(at);break;case 10:Wp(a.type._context);break;case 22:case 23:lm()}o=o.return}if(Tt=e,xt=e=Sr(e.current,null),Mt=vo=t,Ct=0,Xi=null,am=dd=pn=0,ao=Ai=null,nn!==null){for(t=0;t<nn.length;t++)if(o=nn[t],a=o.interleaved,a!==null){o.interleaved=null;var r=a.next,n=o.pending;if(n!==null){var l=n.next;n.next=r,a.next=l}o.pending=a}nn=null}return e}function Cy(e,t){do{var o=xt;try{if(Vp(),ku.current=Xu,Ku){for(var a=rt.memoizedState;a!==null;){var r=a.queue;r!==null&&(r.pending=null),a=a.next}Ku=!1}if(fn=0,Rt=St=rt=null,Pi=!1,Gi=0,om.current=null,o===null||o.return===null){Ct=1,Xi=t,xt=null;break}e:{var n=e,l=o.return,i=o,s=t;if(t=Mt,i.flags|=32768,s!==null&&typeof s=="object"&&typeof s.then=="function"){var u=s,d=i,f=d.tag;if(!(d.mode&1)&&(f===0||f===11||f===15)){var m=d.alternate;m?(d.updateQueue=m.updateQueue,d.memoizedState=m.memoizedState,d.lanes=m.lanes):(d.updateQueue=null,d.memoizedState=null)}var h=wx(l);if(h!==null){h.flags&=-257,yx(h,l,i,n,t),h.mode&1&&xx(n,u,t),t=h,s=u;var y=t.updateQueue;if(y===null){var g=new Set;g.add(s),t.updateQueue=g}else y.add(s);break e}else{if(!(t&1)){xx(n,u,t),im();break e}s=Error(F(426))}}else if(Je&&i.mode&1){var x=wx(l);if(x!==null){!(x.flags&65536)&&(x.flags|=256),yx(x,l,i,n,t),Up(pl(s,i));break e}}n=s=pl(s,i),Ct!==4&&(Ct=2),Ai===null?Ai=[n]:Ai.push(n),n=l;do{switch(n.tag){case 3:n.flags|=65536,t&=-t,n.lanes|=t;var p=ly(n,s,t);fx(n,p);break e;case 1:i=s;var c=n.type,v=n.stateNode;if(!(n.flags&128)&&(typeof c.getDerivedStateFromError=="function"||v!==null&&typeof v.componentDidCatch=="function"&&(yr===null||!yr.has(v)))){n.flags|=65536,t&=-t,n.lanes|=t;var w=iy(n,i,t);fx(n,w);break e}}n=n.return}while(n!==null)}Iy(o)}catch(b){t=b,xt===o&&o!==null&&(xt=o=o.return);continue}break}while(!0)}function Ly(){var e=Yu.current;return Yu.current=Xu,e===null?Xu:e}function im(){(Ct===0||Ct===3||Ct===2)&&(Ct=4),Tt===null||!(pn&268435455)&&!(dd&268435455)||fr(Tt,Mt)}function Ju(e,t){var o=Ie;Ie|=2;var a=Ly();(Tt!==e||Mt!==t)&&(_a=null,sn(e,t));do try{v1();break}catch(r){Cy(e,r)}while(!0);if(Vp(),Ie=o,Yu.current=a,xt!==null)throw Error(F(261));return Tt=null,Mt=0,Ct}function v1(){for(;xt!==null;)ky(xt)}function x1(){for(;xt!==null&&!$T();)ky(xt)}function ky(e){var t=Ty(e.alternate,e,vo);e.memoizedProps=e.pendingProps,t===null?Iy(e):xt=t,om.current=null}function Iy(e){var t=e;do{var o=t.alternate;if(e=t.return,t.flags&32768){if(o=c1(o,t),o!==null){o.flags&=32767,xt=o;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{Ct=6,xt=null;return}}else if(o=d1(o,t,vo),o!==null){xt=o;return}if(t=t.sibling,t!==null){xt=t;return}xt=t=e}while(t!==null);Ct===0&&(Ct=5)}function an(e,t,o){var a=Oe,r=Mo.transition;try{Mo.transition=null,Oe=1,w1(e,t,o,a)}finally{Mo.transition=r,Oe=a}return null}function w1(e,t,o,a){do il();while(mr!==null);if(Ie&6)throw Error(F(327));o=e.finishedWork;var r=e.finishedLanes;if(o===null)return null;if(e.finishedWork=null,e.finishedLanes=0,o===e.current)throw Error(F(177));e.callbackNode=null,e.callbackPriority=0;var n=o.lanes|o.childLanes;if(tP(e,n),e===Tt&&(xt=Tt=null,Mt=0),!(o.subtreeFlags&2064)&&!(o.flags&2064)||yu||(yu=!0,Py(Mu,function(){return il(),null})),n=(o.flags&15990)!==0,o.subtreeFlags&15990||n){n=Mo.transition,Mo.transition=null;var l=Oe;Oe=1;var i=Ie;Ie|=4,om.current=null,p1(e,o),yy(o,e),UP(Jf),Ou=!!Zf,Jf=Zf=null,e.current=o,m1(o,e,r),GT(),Ie=i,Oe=l,Mo.transition=n}else e.current=o;if(yu&&(yu=!1,mr=e,Zu=r),n=e.pendingLanes,n===0&&(yr=null),XT(o.stateNode,a),io(e,ft()),t!==null)for(a=e.onRecoverableError,o=0;o<t.length;o++)r=t[o],a(r.value,{componentStack:r.stack,digest:r.digest});if(Qu)throw Qu=!1,e=wp,wp=null,e;return Zu&1&&e.tag!==0&&il(),n=e.pendingLanes,n&1?e===yp?Di++:(Di=0,yp=e):Di=0,Rr(),null}function il(){if(mr!==null){var e=lw(Zu),t=Mo.transition,o=Oe;try{if(Mo.transition=null,Oe=16>e?16:e,mr===null)var a=!1;else{if(e=mr,mr=null,Zu=0,Ie&6)throw Error(F(331));var r=Ie;for(Ie|=4,Z=e.current;Z!==null;){var n=Z,l=n.child;if(Z.flags&16){var i=n.deletions;if(i!==null){for(var s=0;s<i.length;s++){var u=i[s];for(Z=u;Z!==null;){var d=Z;switch(d.tag){case 0:case 11:case 15:Ei(8,d,n)}var f=d.child;if(f!==null)f.return=d,Z=f;else for(;Z!==null;){d=Z;var m=d.sibling,h=d.return;if(vy(d),d===u){Z=null;break}if(m!==null){m.return=h,Z=m;break}Z=h}}}var y=n.alternate;if(y!==null){var g=y.child;if(g!==null){y.child=null;do{var x=g.sibling;g.sibling=null,g=x}while(g!==null)}}Z=n}}if(n.subtreeFlags&2064&&l!==null)l.return=n,Z=l;else e:for(;Z!==null;){if(n=Z,n.flags&2048)switch(n.tag){case 0:case 11:case 15:Ei(9,n,n.return)}var p=n.sibling;if(p!==null){p.return=n.return,Z=p;break e}Z=n.return}}var c=e.current;for(Z=c;Z!==null;){l=Z;var v=l.child;if(l.subtreeFlags&2064&&v!==null)v.return=l,Z=v;else e:for(l=c;Z!==null;){if(i=Z,i.flags&2048)try{switch(i.tag){case 0:case 11:case 15:ud(9,i)}}catch(b){ut(i,i.return,b)}if(i===l){Z=null;break e}var w=i.sibling;if(w!==null){w.return=i.return,Z=w;break e}Z=i.return}}if(Ie=r,Rr(),pa&&typeof pa.onPostCommitFiberRoot=="function")try{pa.onPostCommitFiberRoot(td,e)}catch{}a=!0}return a}finally{Oe=o,Mo.transition=t}}return!1}function Nx(e,t,o){t=pl(o,t),t=ly(e,t,1),e=wr(e,t,1),t=Yt(),e!==null&&(Yi(e,1,t),io(e,t))}function ut(e,t,o){if(e.tag===3)Nx(e,e,o);else for(;t!==null;){if(t.tag===3){Nx(t,e,o);break}else if(t.tag===1){var a=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof a.componentDidCatch=="function"&&(yr===null||!yr.has(a))){e=pl(o,e),e=iy(t,e,1),t=wr(t,e,1),e=Yt(),t!==null&&(Yi(t,1,e),io(t,e));break}}t=t.return}}function y1(e,t,o){var a=e.pingCache;a!==null&&a.delete(t),t=Yt(),e.pingedLanes|=e.suspendedLanes&o,Tt===e&&(Mt&o)===o&&(Ct===4||Ct===3&&(Mt&130023424)===Mt&&500>ft()-rm?sn(e,0):am|=o),io(e,t)}function Ry(e,t){t===0&&(e.mode&1?(t=lu,lu<<=1,!(lu&130023424)&&(lu=4194304)):t=1);var o=Yt();e=$a(e,t),e!==null&&(Yi(e,t,o),io(e,o))}function b1(e){var t=e.memoizedState,o=0;t!==null&&(o=t.retryLane),Ry(e,o)}function S1(e,t){var o=0;switch(e.tag){case 13:var a=e.stateNode,r=e.memoizedState;r!==null&&(o=r.retryLane);break;case 19:a=e.stateNode;break;default:throw Error(F(314))}a!==null&&a.delete(t),Ry(e,o)}var Ty;Ty=function(e,t,o){if(e!==null)if(e.memoizedProps!==t.pendingProps||no.current)ro=!0;else{if(!(e.lanes&o)&&!(t.flags&128))return ro=!1,u1(e,t,o);ro=!!(e.flags&131072)}else ro=!1,Je&&t.flags&1048576&&Dw(t,Vu,t.index);switch(t.lanes=0,t.tag){case 2:var a=t.type;Ru(e,t),e=t.pendingProps;var r=ul(t,Vt.current);ll(t,o),r=Qp(null,t,a,e,r,o);var n=Zp();return t.flags|=1,typeof r=="object"&&r!==null&&typeof r.render=="function"&&r.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,lo(a)?(n=!0,Uu(t)):n=!1,t.memoizedState=r.state!==null&&r.state!==void 0?r.state:null,Gp(t),r.updater=sd,t.stateNode=r,r._reactInternals=t,sp(t,a,e,o),t=cp(null,t,a,!0,n,o)):(t.tag=0,Je&&n&&Hp(t),Xt(null,t,r,o),t=t.child),t;case 16:a=t.elementType;e:{switch(Ru(e,t),e=t.pendingProps,r=a._init,a=r(a._payload),t.type=a,r=t.tag=L1(a),e=jo(a,e),r){case 0:t=dp(null,t,a,e,o);break e;case 1:t=Cx(null,t,a,e,o);break e;case 11:t=bx(null,t,a,e,o);break e;case 14:t=Sx(null,t,a,jo(a.type,e),o);break e}throw Error(F(306,a,""))}return t;case 0:return a=t.type,r=t.pendingProps,r=t.elementType===a?r:jo(a,r),dp(e,t,a,r,o);case 1:return a=t.type,r=t.pendingProps,r=t.elementType===a?r:jo(a,r),Cx(e,t,a,r,o);case 3:e:{if(cy(t),e===null)throw Error(F(387));a=t.pendingProps,n=t.memoizedState,r=n.element,_w(e,t),Gu(t,a,null,o);var l=t.memoizedState;if(a=l.element,n.isDehydrated)if(n={element:a,isDehydrated:!1,cache:l.cache,pendingSuspenseBoundaries:l.pendingSuspenseBoundaries,transitions:l.transitions},t.updateQueue.baseState=n,t.memoizedState=n,t.flags&256){r=pl(Error(F(423)),t),t=Lx(e,t,a,o,r);break e}else if(a!==r){r=pl(Error(F(424)),t),t=Lx(e,t,a,o,r);break e}else for(xo=xr(t.stateNode.containerInfo.firstChild),wo=t,Je=!0,Xo=null,o=Ow(t,null,a,o),t.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(dl(),a===r){t=Ga(e,t,o);break e}Xt(e,t,a,o)}t=t.child}return t;case 5:return Hw(t),e===null&&np(t),a=t.type,r=t.pendingProps,n=e!==null?e.memoizedProps:null,l=r.children,ep(a,r)?l=null:n!==null&&ep(a,n)&&(t.flags|=32),dy(e,t),Xt(e,t,l,o),t.child;case 6:return e===null&&np(t),null;case 13:return fy(e,t,o);case 4:return jp(t,t.stateNode.containerInfo),a=t.pendingProps,e===null?t.child=cl(t,null,a,o):Xt(e,t,a,o),t.child;case 11:return a=t.type,r=t.pendingProps,r=t.elementType===a?r:jo(a,r),bx(e,t,a,r,o);case 7:return Xt(e,t,t.pendingProps,o),t.child;case 8:return Xt(e,t,t.pendingProps.children,o),t.child;case 12:return Xt(e,t,t.pendingProps.children,o),t.child;case 10:e:{if(a=t.type._context,r=t.pendingProps,n=t.memoizedProps,l=r.value,Ve(Wu,a._currentValue),a._currentValue=l,n!==null)if(Zo(n.value,l)){if(n.children===r.children&&!no.current){t=Ga(e,t,o);break e}}else for(n=t.child,n!==null&&(n.return=t);n!==null;){var i=n.dependencies;if(i!==null){l=n.child;for(var s=i.firstContext;s!==null;){if(s.context===a){if(n.tag===1){s=za(-1,o&-o),s.tag=2;var u=n.updateQueue;if(u!==null){u=u.shared;var d=u.pending;d===null?s.next=s:(s.next=d.next,d.next=s),u.pending=s}}n.lanes|=o,s=n.alternate,s!==null&&(s.lanes|=o),lp(n.return,o,t),i.lanes|=o;break}s=s.next}}else if(n.tag===10)l=n.type===t.type?null:n.child;else if(n.tag===18){if(l=n.return,l===null)throw Error(F(341));l.lanes|=o,i=l.alternate,i!==null&&(i.lanes|=o),lp(l,o,t),l=n.sibling}else l=n.child;if(l!==null)l.return=n;else for(l=n;l!==null;){if(l===t){l=null;break}if(n=l.sibling,n!==null){n.return=l.return,l=n;break}l=l.return}n=l}Xt(e,t,r.children,o),t=t.child}return t;case 9:return r=t.type,a=t.pendingProps.children,ll(t,o),r=Bo(r),a=a(r),t.flags|=1,Xt(e,t,a,o),t.child;case 14:return a=t.type,r=jo(a,t.pendingProps),r=jo(a.type,r),Sx(e,t,a,r,o);case 15:return sy(e,t,t.type,t.pendingProps,o);case 17:return a=t.type,r=t.pendingProps,r=t.elementType===a?r:jo(a,r),Ru(e,t),t.tag=1,lo(a)?(e=!0,Uu(t)):e=!1,ll(t,o),ny(t,a,r),sp(t,a,r,o),cp(null,t,a,!0,e,o);case 19:return py(e,t,o);case 22:return uy(e,t,o)}throw Error(F(156,t.tag))};function Py(e,t){return ow(e,t)}function C1(e,t,o,a){this.tag=e,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=a,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function No(e,t,o,a){return new C1(e,t,o,a)}function sm(e){return e=e.prototype,!(!e||!e.isReactComponent)}function L1(e){if(typeof e=="function")return sm(e)?1:0;if(e!=null){if(e=e.$$typeof,e===Rp)return 11;if(e===Tp)return 14}return 2}function Sr(e,t){var o=e.alternate;return o===null?(o=No(e.tag,t,e.key,e.mode),o.elementType=e.elementType,o.type=e.type,o.stateNode=e.stateNode,o.alternate=e,e.alternate=o):(o.pendingProps=t,o.type=e.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=e.flags&14680064,o.childLanes=e.childLanes,o.lanes=e.lanes,o.child=e.child,o.memoizedProps=e.memoizedProps,o.memoizedState=e.memoizedState,o.updateQueue=e.updateQueue,t=e.dependencies,o.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},o.sibling=e.sibling,o.index=e.index,o.ref=e.ref,o}function Eu(e,t,o,a,r,n){var l=2;if(a=e,typeof e=="function")sm(e)&&(l=1);else if(typeof e=="string")l=5;else e:switch(e){case $n:return un(o.children,r,n,t);case Ip:l=8,r|=8;break;case Df:return e=No(12,o,t,r|2),e.elementType=Df,e.lanes=n,e;case Nf:return e=No(13,o,t,r),e.elementType=Nf,e.lanes=n,e;case Mf:return e=No(19,o,t,r),e.elementType=Mf,e.lanes=n,e;case Hx:return cd(o,r,n,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case Fx:l=10;break e;case _x:l=9;break e;case Rp:l=11;break e;case Tp:l=14;break e;case ur:l=16,a=null;break e}throw Error(F(130,e==null?e:typeof e,""))}return t=No(l,o,t,r),t.elementType=e,t.type=a,t.lanes=n,t}function un(e,t,o,a){return e=No(7,e,a,t),e.lanes=o,e}function cd(e,t,o,a){return e=No(22,e,a,t),e.elementType=Hx,e.lanes=o,e.stateNode={isHidden:!1},e}function Pf(e,t,o){return e=No(6,e,null,t),e.lanes=o,e}function Ef(e,t,o){return t=No(4,e.children!==null?e.children:[],e.key,t),t.lanes=o,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function k1(e,t,o,a,r){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=pf(0),this.expirationTimes=pf(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=pf(0),this.identifierPrefix=a,this.onRecoverableError=r,this.mutableSourceEagerHydrationData=null}function um(e,t,o,a,r,n,l,i,s){return e=new k1(e,t,o,i,s),t===1?(t=1,n===!0&&(t|=8)):t=0,n=No(3,null,null,t),e.current=n,n.stateNode=e,n.memoizedState={element:a,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},Gp(n),e}function I1(e,t,o){var a=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Wn,key:a==null?null:""+a,children:e,containerInfo:t,implementation:o}}function Ey(e){if(!e)return Lr;e=e._reactInternals;e:{if(hn(e)!==e||e.tag!==1)throw Error(F(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(lo(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(F(171))}if(e.tag===1){var o=e.type;if(lo(o))return Ew(e,o,t)}return t}function Ay(e,t,o,a,r,n,l,i,s){return e=um(o,a,!0,e,r,n,l,i,s),e.context=Ey(null),o=e.current,a=Yt(),r=br(o),n=za(a,r),n.callback=t??null,wr(o,n,r),e.current.lanes=r,Yi(e,r,a),io(e,a),e}function fd(e,t,o,a){var r=t.current,n=Yt(),l=br(r);return o=Ey(o),t.context===null?t.context=o:t.pendingContext=o,t=za(n,l),t.payload={element:e},a=a===void 0?null:a,a!==null&&(t.callback=a),e=wr(r,t,l),e!==null&&(Qo(e,r,l,n),Lu(e,r,l)),l}function ed(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function Mx(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var o=e.retryLane;e.retryLane=o!==0&&o<t?o:t}}function dm(e,t){Mx(e,t),(e=e.alternate)&&Mx(e,t)}function R1(){return null}var Dy=typeof reportError=="function"?reportError:function(e){console.error(e)};function cm(e){this._internalRoot=e}pd.prototype.render=cm.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(F(409));fd(e,t,null,null)};pd.prototype.unmount=cm.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;mn(function(){fd(null,e,null,null)}),t[Wa]=null}};function pd(e){this._internalRoot=e}pd.prototype.unstable_scheduleHydration=function(e){if(e){var t=uw();e={blockedOn:null,target:e,priority:t};for(var o=0;o<cr.length&&t!==0&&t<cr[o].priority;o++);cr.splice(o,0,e),o===0&&cw(e)}};function fm(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function md(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function Bx(){}function T1(e,t,o,a,r){if(r){if(typeof a=="function"){var n=a;a=function(){var u=ed(l);n.call(u)}}var l=Ay(t,a,e,0,null,!1,!1,"",Bx);return e._reactRootContainer=l,e[Wa]=l.current,Ui(e.nodeType===8?e.parentNode:e),mn(),l}for(;r=e.lastChild;)e.removeChild(r);if(typeof a=="function"){var i=a;a=function(){var u=ed(s);i.call(u)}}var s=um(e,0,!1,null,null,!1,!1,"",Bx);return e._reactRootContainer=s,e[Wa]=s.current,Ui(e.nodeType===8?e.parentNode:e),mn(function(){fd(t,s,o,a)}),s}function gd(e,t,o,a,r){var n=o._reactRootContainer;if(n){var l=n;if(typeof r=="function"){var i=r;r=function(){var s=ed(l);i.call(s)}}fd(t,l,e,r)}else l=T1(o,t,e,r,a);return ed(l)}iw=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var o=Si(t.pendingLanes);o!==0&&(Ap(t,o|1),io(t,ft()),!(Ie&6)&&(ml=ft()+500,Rr()))}break;case 13:mn(function(){var a=$a(e,1);if(a!==null){var r=Yt();Qo(a,e,1,r)}}),dm(e,1)}};Dp=function(e){if(e.tag===13){var t=$a(e,134217728);if(t!==null){var o=Yt();Qo(t,e,134217728,o)}dm(e,134217728)}};sw=function(e){if(e.tag===13){var t=br(e),o=$a(e,t);if(o!==null){var a=Yt();Qo(o,e,t,a)}dm(e,t)}};uw=function(){return Oe};dw=function(e,t){var o=Oe;try{return Oe=e,t()}finally{Oe=o}};Wf=function(e,t,o){switch(t){case"input":if(Ff(e,o),t=o.name,o.type==="radio"&&t!=null){for(o=e;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<o.length;t++){var a=o[t];if(a!==e&&a.form===e.form){var r=nd(a);if(!r)throw Error(F(90));Ux(a),Ff(a,r)}}}break;case"textarea":Vx(e,o);break;case"select":t=o.value,t!=null&&ol(e,!!o.multiple,t,!1)}};Yx=nm;Qx=mn;var P1={usingClientEntryPoint:!1,Events:[Zi,Xn,nd,Kx,Xx,nm]},xi={findFiberByHostInstance:rn,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},E1={bundleType:xi.bundleType,version:xi.version,rendererPackageName:xi.rendererPackageName,rendererConfig:xi.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:ja.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=ew(e),e===null?null:e.stateNode},findFiberByHostInstance:xi.findFiberByHostInstance||R1,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&(wi=__REACT_DEVTOOLS_GLOBAL_HOOK__,!wi.isDisabled&&wi.supportsFiber))try{td=wi.inject(E1),pa=wi}catch{}var wi;So.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=P1;So.createPortal=function(e,t){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!fm(t))throw Error(F(200));return I1(e,t,null,o)};So.createRoot=function(e,t){if(!fm(e))throw Error(F(299));var o=!1,a="",r=Dy;return t!=null&&(t.unstable_strictMode===!0&&(o=!0),t.identifierPrefix!==void 0&&(a=t.identifierPrefix),t.onRecoverableError!==void 0&&(r=t.onRecoverableError)),t=um(e,1,!1,null,null,o,!1,a,r),e[Wa]=t.current,Ui(e.nodeType===8?e.parentNode:e),new cm(t)};So.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(F(188)):(e=Object.keys(e).join(","),Error(F(268,e)));return e=ew(t),e=e===null?null:e.stateNode,e};So.flushSync=function(e){return mn(e)};So.hydrate=function(e,t,o){if(!md(t))throw Error(F(200));return gd(null,e,t,!0,o)};So.hydrateRoot=function(e,t,o){if(!fm(e))throw Error(F(405));var a=o!=null&&o.hydratedSources||null,r=!1,n="",l=Dy;if(o!=null&&(o.unstable_strictMode===!0&&(r=!0),o.identifierPrefix!==void 0&&(n=o.identifierPrefix),o.onRecoverableError!==void 0&&(l=o.onRecoverableError)),t=Ay(t,null,e,1,o??null,r,!1,n,l),e[Wa]=t.current,Ui(e),a)for(e=0;e<a.length;e++)o=a[e],r=o._getVersion,r=r(o._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[o,r]:t.mutableSourceEagerHydrationData.push(o,r);return new pd(t)};So.render=function(e,t,o){if(!md(t))throw Error(F(200));return gd(null,e,t,!1,o)};So.unmountComponentAtNode=function(e){if(!md(e))throw Error(F(40));return e._reactRootContainer?(mn(function(){gd(null,null,e,!1,function(){e._reactRootContainer=null,e[Wa]=null})}),!0):!1};So.unstable_batchedUpdates=nm;So.unstable_renderSubtreeIntoContainer=function(e,t,o,a){if(!md(o))throw Error(F(200));if(e==null||e._reactInternals===void 0)throw Error(F(38));return gd(e,t,o,!1,a)};So.version="18.3.1-next-f1338f8080-20240426"});var ga=Fa((pB,By)=>{"use strict";function My(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(My)}catch(e){console.error(e)}}My(),By.exports=Ny()});var Fy=Fa(pm=>{"use strict";var Oy=ga();pm.createRoot=Oy.createRoot,pm.hydrateRoot=Oy.hydrateRoot;var mB});var Uy=Fa(hd=>{"use strict";var A1=z(),D1=Symbol.for("react.element"),N1=Symbol.for("react.fragment"),M1=Object.prototype.hasOwnProperty,B1=A1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,O1={key:!0,ref:!0,__self:!0,__source:!0};function qy(e,t,o){var a,r={},n=null,l=null;o!==void 0&&(n=""+o),t.key!==void 0&&(n=""+t.key),t.ref!==void 0&&(l=t.ref);for(a in t)M1.call(t,a)&&!O1.hasOwnProperty(a)&&(r[a]=t[a]);if(e&&e.defaultProps)for(a in t=e.defaultProps,t)r[a]===void 0&&(r[a]=t[a]);return{$$typeof:D1,type:e,key:n,ref:l,props:r,_owner:B1.current}}hd.Fragment=N1;hd.jsx=qy;hd.jsxs=qy});var H=Fa((xB,zy)=>{"use strict";zy.exports=Uy()});var lT=k(Fy());var vt=k(z());var ye=k(z());var eb=k(z());var Lt=k(z(),1);var Hy=k(z(),1);function _y(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function es(...e){return t=>{let o=!1,a=e.map(r=>{let n=_y(r,t);return!o&&typeof n=="function"&&(o=!0),n});if(o)return()=>{for(let r=0;r<a.length;r++){let n=a[r];typeof n=="function"?n():_y(e[r],null)}}}}function ue(...e){return Hy.useCallback(es(...e),e)}var vl=k(H(),1),so=Lt.forwardRef((e,t)=>{let{children:o,...a}=e,r=Lt.Children.toArray(o),n=r.find(_1);if(n){let l=n.props.children,i=r.map(s=>s===n?Lt.Children.count(l)>1?Lt.Children.only(null):Lt.isValidElement(l)?l.props.children:null:s);return(0,vl.jsx)(mm,{...a,ref:t,children:Lt.isValidElement(l)?Lt.cloneElement(l,void 0,i):null})}return(0,vl.jsx)(mm,{...a,ref:t,children:o})});so.displayName="Slot";var mm=Lt.forwardRef((e,t)=>{let{children:o,...a}=e;if(Lt.isValidElement(o)){let r=q1(o),n=H1(a,o.props);return o.type!==Lt.Fragment&&(n.ref=t?es(t,r):r),Lt.cloneElement(o,n)}return Lt.Children.count(o)>1?Lt.Children.only(null):null});mm.displayName="SlotClone";var F1=({children:e})=>(0,vl.jsx)(vl.Fragment,{children:e});function _1(e){return Lt.isValidElement(e)&&e.type===F1}function H1(e,t){let o={...t};for(let a in t){let r=e[a],n=t[a];/^on[A-Z]/.test(a)?r&&n?o[a]=(...i)=>{n(...i),r(...i)}:r&&(o[a]=r):a==="style"?o[a]={...r,...n}:a==="className"&&(o[a]=[r,n].filter(Boolean).join(" "))}return{...e,...o}}function q1(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}function Vy(e){var t,o,a="";if(typeof e=="string"||typeof e=="number")a+=e;else if(typeof e=="object")if(Array.isArray(e)){var r=e.length;for(t=0;t<r;t++)e[t]&&(o=Vy(e[t]))&&(a&&(a+=" "),a+=o)}else for(o in e)e[o]&&(a&&(a+=" "),a+=o);return a}function vd(){for(var e,t,o=0,a="",r=arguments.length;o<r;o++)(e=arguments[o])&&(t=Vy(e))&&(a&&(a+=" "),a+=t);return a}var Wy=e=>typeof e=="boolean"?`${e}`:e===0?"0":e,$y=vd,xd=(e,t)=>o=>{var a;if(t?.variants==null)return $y(e,o?.class,o?.className);let{variants:r,defaultVariants:n}=t,l=Object.keys(r).map(u=>{let d=o?.[u],f=n?.[u];if(d===null)return null;let m=Wy(d)||Wy(f);return r[u][m]}),i=o&&Object.entries(o).reduce((u,d)=>{let[f,m]=d;return m===void 0||(u[f]=m),u},{}),s=t==null||(a=t.compoundVariants)===null||a===void 0?void 0:a.reduce((u,d)=>{let{class:f,className:m,...h}=d;return Object.entries(h).every(y=>{let[g,x]=y;return Array.isArray(x)?x.includes({...n,...i}[g]):{...n,...i}[g]===x})?[...u,f,m]:u},[]);return $y(e,l,s,o?.class,o?.className)};var vm="-",U1=e=>{let t=V1(e),{conflictingClassGroups:o,conflictingClassGroupModifiers:a}=e;return{getClassGroupId:l=>{let i=l.split(vm);return i[0]===""&&i.length!==1&&i.shift(),Ky(i,t)||z1(l)},getConflictingClassGroupIds:(l,i)=>{let s=o[l]||[];return i&&a[l]?[...s,...a[l]]:s}}},Ky=(e,t)=>{if(e.length===0)return t.classGroupId;let o=e[0],a=t.nextPart.get(o),r=a?Ky(e.slice(1),a):void 0;if(r)return r;if(t.validators.length===0)return;let n=e.join(vm);return t.validators.find(({validator:l})=>l(n))?.classGroupId},Gy=/^\[(.+)\]$/,z1=e=>{if(Gy.test(e)){let t=Gy.exec(e)[1],o=t?.substring(0,t.indexOf(":"));if(o)return"arbitrary.."+o}},V1=e=>{let{theme:t,prefix:o}=e,a={nextPart:new Map,validators:[]};return $1(Object.entries(e.classGroups),o).forEach(([n,l])=>{hm(l,a,n,t)}),a},hm=(e,t,o,a)=>{e.forEach(r=>{if(typeof r=="string"){let n=r===""?t:jy(t,r);n.classGroupId=o;return}if(typeof r=="function"){if(W1(r)){hm(r(a),t,o,a);return}t.validators.push({validator:r,classGroupId:o});return}Object.entries(r).forEach(([n,l])=>{hm(l,jy(t,n),o,a)})})},jy=(e,t)=>{let o=e;return t.split(vm).forEach(a=>{o.nextPart.has(a)||o.nextPart.set(a,{nextPart:new Map,validators:[]}),o=o.nextPart.get(a)}),o},W1=e=>e.isThemeGetter,$1=(e,t)=>t?e.map(([o,a])=>{let r=a.map(n=>typeof n=="string"?t+n:typeof n=="object"?Object.fromEntries(Object.entries(n).map(([l,i])=>[t+l,i])):n);return[o,r]}):e,G1=e=>{if(e<1)return{get:()=>{},set:()=>{}};let t=0,o=new Map,a=new Map,r=(n,l)=>{o.set(n,l),t++,t>e&&(t=0,a=o,o=new Map)};return{get(n){let l=o.get(n);if(l!==void 0)return l;if((l=a.get(n))!==void 0)return r(n,l),l},set(n,l){o.has(n)?o.set(n,l):r(n,l)}}},Xy="!",j1=e=>{let{separator:t,experimentalParseClassName:o}=e,a=t.length===1,r=t[0],n=t.length,l=i=>{let s=[],u=0,d=0,f;for(let x=0;x<i.length;x++){let p=i[x];if(u===0){if(p===r&&(a||i.slice(x,x+n)===t)){s.push(i.slice(d,x)),d=x+n;continue}if(p==="/"){f=x;continue}}p==="["?u++:p==="]"&&u--}let m=s.length===0?i:i.substring(d),h=m.startsWith(Xy),y=h?m.substring(1):m,g=f&&f>d?f-d:void 0;return{modifiers:s,hasImportantModifier:h,baseClassName:y,maybePostfixModifierPosition:g}};return o?i=>o({className:i,parseClassName:l}):l},K1=e=>{if(e.length<=1)return e;let t=[],o=[];return e.forEach(a=>{a[0]==="["?(t.push(...o.sort(),a),o=[]):o.push(a)}),t.push(...o.sort()),t},X1=e=>({cache:G1(e.cacheSize),parseClassName:j1(e),...U1(e)}),Y1=/\s+/,Q1=(e,t)=>{let{parseClassName:o,getClassGroupId:a,getConflictingClassGroupIds:r}=t,n=[],l=e.trim().split(Y1),i="";for(let s=l.length-1;s>=0;s-=1){let u=l[s],{modifiers:d,hasImportantModifier:f,baseClassName:m,maybePostfixModifierPosition:h}=o(u),y=!!h,g=a(y?m.substring(0,h):m);if(!g){if(!y){i=u+(i.length>0?" "+i:i);continue}if(g=a(m),!g){i=u+(i.length>0?" "+i:i);continue}y=!1}let x=K1(d).join(":"),p=f?x+Xy:x,c=p+g;if(n.includes(c))continue;n.push(c);let v=r(g,y);for(let w=0;w<v.length;++w){let b=v[w];n.push(p+b)}i=u+(i.length>0?" "+i:i)}return i};function Z1(){let e=0,t,o,a="";for(;e<arguments.length;)(t=arguments[e++])&&(o=Yy(t))&&(a&&(a+=" "),a+=o);return a}var Yy=e=>{if(typeof e=="string")return e;let t,o="";for(let a=0;a<e.length;a++)e[a]&&(t=Yy(e[a]))&&(o&&(o+=" "),o+=t);return o};function J1(e,...t){let o,a,r,n=l;function l(s){let u=t.reduce((d,f)=>f(d),e());return o=X1(u),a=o.cache.get,r=o.cache.set,n=i,i(s)}function i(s){let u=a(s);if(u)return u;let d=Q1(s,o);return r(s,d),d}return function(){return n(Z1.apply(null,arguments))}}var Ke=e=>{let t=o=>o[e]||[];return t.isThemeGetter=!0,t},Qy=/^\[(?:([a-z-]+):)?(.+)\]$/i,eE=/^\d+\/\d+$/,tE=new Set(["px","full","screen"]),oE=/^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,aE=/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,rE=/^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/,nE=/^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,lE=/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,Ka=e=>xl(e)||tE.has(e)||eE.test(e),Tr=e=>wl(e,"length",mE),xl=e=>!!e&&!Number.isNaN(Number(e)),gm=e=>wl(e,"number",xl),ts=e=>!!e&&Number.isInteger(Number(e)),iE=e=>e.endsWith("%")&&xl(e.slice(0,-1)),ge=e=>Qy.test(e),Pr=e=>oE.test(e),sE=new Set(["length","size","percentage"]),uE=e=>wl(e,sE,Zy),dE=e=>wl(e,"position",Zy),cE=new Set(["image","url"]),fE=e=>wl(e,cE,hE),pE=e=>wl(e,"",gE),os=()=>!0,wl=(e,t,o)=>{let a=Qy.exec(e);return a?a[1]?typeof t=="string"?a[1]===t:t.has(a[1]):o(a[2]):!1},mE=e=>aE.test(e)&&!rE.test(e),Zy=()=>!1,gE=e=>nE.test(e),hE=e=>lE.test(e);var vE=()=>{let e=Ke("colors"),t=Ke("spacing"),o=Ke("blur"),a=Ke("brightness"),r=Ke("borderColor"),n=Ke("borderRadius"),l=Ke("borderSpacing"),i=Ke("borderWidth"),s=Ke("contrast"),u=Ke("grayscale"),d=Ke("hueRotate"),f=Ke("invert"),m=Ke("gap"),h=Ke("gradientColorStops"),y=Ke("gradientColorStopPositions"),g=Ke("inset"),x=Ke("margin"),p=Ke("opacity"),c=Ke("padding"),v=Ke("saturate"),w=Ke("scale"),b=Ke("sepia"),L=Ke("skew"),C=Ke("space"),S=Ke("translate"),T=()=>["auto","contain","none"],P=()=>["auto","hidden","clip","visible","scroll"],q=()=>["auto",ge,t],M=()=>[ge,t],X=()=>["",Ka,Tr],R=()=>["auto",xl,ge],U=()=>["bottom","center","left","left-bottom","left-top","right","right-bottom","right-top","top"],B=()=>["solid","dashed","dotted","double","none"],A=()=>["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity"],N=()=>["start","end","center","between","around","evenly","stretch"],O=()=>["","0",ge],Q=()=>["auto","avoid","all","avoid-page","page","left","right","column"],ae=()=>[xl,ge];return{cacheSize:500,separator:":",theme:{colors:[os],spacing:[Ka,Tr],blur:["none","",Pr,ge],brightness:ae(),borderColor:[e],borderRadius:["none","","full",Pr,ge],borderSpacing:M(),borderWidth:X(),contrast:ae(),grayscale:O(),hueRotate:ae(),invert:O(),gap:M(),gradientColorStops:[e],gradientColorStopPositions:[iE,Tr],inset:q(),margin:q(),opacity:ae(),padding:M(),saturate:ae(),scale:ae(),sepia:O(),skew:ae(),space:M(),translate:M()},classGroups:{aspect:[{aspect:["auto","square","video",ge]}],container:["container"],columns:[{columns:[Pr]}],"break-after":[{"break-after":Q()}],"break-before":[{"break-before":Q()}],"break-inside":[{"break-inside":["auto","avoid","avoid-page","avoid-column"]}],"box-decoration":[{"box-decoration":["slice","clone"]}],box:[{box:["border","content"]}],display:["block","inline-block","inline","flex","inline-flex","table","inline-table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row-group","table-row","flow-root","grid","inline-grid","contents","list-item","hidden"],float:[{float:["right","left","none","start","end"]}],clear:[{clear:["left","right","both","none","start","end"]}],isolation:["isolate","isolation-auto"],"object-fit":[{object:["contain","cover","fill","none","scale-down"]}],"object-position":[{object:[...U(),ge]}],overflow:[{overflow:P()}],"overflow-x":[{"overflow-x":P()}],"overflow-y":[{"overflow-y":P()}],overscroll:[{overscroll:T()}],"overscroll-x":[{"overscroll-x":T()}],"overscroll-y":[{"overscroll-y":T()}],position:["static","fixed","absolute","relative","sticky"],inset:[{inset:[g]}],"inset-x":[{"inset-x":[g]}],"inset-y":[{"inset-y":[g]}],start:[{start:[g]}],end:[{end:[g]}],top:[{top:[g]}],right:[{right:[g]}],bottom:[{bottom:[g]}],left:[{left:[g]}],visibility:["visible","invisible","collapse"],z:[{z:["auto",ts,ge]}],basis:[{basis:q()}],"flex-direction":[{flex:["row","row-reverse","col","col-reverse"]}],"flex-wrap":[{flex:["wrap","wrap-reverse","nowrap"]}],flex:[{flex:["1","auto","initial","none",ge]}],grow:[{grow:O()}],shrink:[{shrink:O()}],order:[{order:["first","last","none",ts,ge]}],"grid-cols":[{"grid-cols":[os]}],"col-start-end":[{col:["auto",{span:["full",ts,ge]},ge]}],"col-start":[{"col-start":R()}],"col-end":[{"col-end":R()}],"grid-rows":[{"grid-rows":[os]}],"row-start-end":[{row:["auto",{span:[ts,ge]},ge]}],"row-start":[{"row-start":R()}],"row-end":[{"row-end":R()}],"grid-flow":[{"grid-flow":["row","col","dense","row-dense","col-dense"]}],"auto-cols":[{"auto-cols":["auto","min","max","fr",ge]}],"auto-rows":[{"auto-rows":["auto","min","max","fr",ge]}],gap:[{gap:[m]}],"gap-x":[{"gap-x":[m]}],"gap-y":[{"gap-y":[m]}],"justify-content":[{justify:["normal",...N()]}],"justify-items":[{"justify-items":["start","end","center","stretch"]}],"justify-self":[{"justify-self":["auto","start","end","center","stretch"]}],"align-content":[{content:["normal",...N(),"baseline"]}],"align-items":[{items:["start","end","center","baseline","stretch"]}],"align-self":[{self:["auto","start","end","center","stretch","baseline"]}],"place-content":[{"place-content":[...N(),"baseline"]}],"place-items":[{"place-items":["start","end","center","baseline","stretch"]}],"place-self":[{"place-self":["auto","start","end","center","stretch"]}],p:[{p:[c]}],px:[{px:[c]}],py:[{py:[c]}],ps:[{ps:[c]}],pe:[{pe:[c]}],pt:[{pt:[c]}],pr:[{pr:[c]}],pb:[{pb:[c]}],pl:[{pl:[c]}],m:[{m:[x]}],mx:[{mx:[x]}],my:[{my:[x]}],ms:[{ms:[x]}],me:[{me:[x]}],mt:[{mt:[x]}],mr:[{mr:[x]}],mb:[{mb:[x]}],ml:[{ml:[x]}],"space-x":[{"space-x":[C]}],"space-x-reverse":["space-x-reverse"],"space-y":[{"space-y":[C]}],"space-y-reverse":["space-y-reverse"],w:[{w:["auto","min","max","fit","svw","lvw","dvw",ge,t]}],"min-w":[{"min-w":[ge,t,"min","max","fit"]}],"max-w":[{"max-w":[ge,t,"none","full","min","max","fit","prose",{screen:[Pr]},Pr]}],h:[{h:[ge,t,"auto","min","max","fit","svh","lvh","dvh"]}],"min-h":[{"min-h":[ge,t,"min","max","fit","svh","lvh","dvh"]}],"max-h":[{"max-h":[ge,t,"min","max","fit","svh","lvh","dvh"]}],size:[{size:[ge,t,"auto","min","max","fit"]}],"font-size":[{text:["base",Pr,Tr]}],"font-smoothing":["antialiased","subpixel-antialiased"],"font-style":["italic","not-italic"],"font-weight":[{font:["thin","extralight","light","normal","medium","semibold","bold","extrabold","black",gm]}],"font-family":[{font:[os]}],"fvn-normal":["normal-nums"],"fvn-ordinal":["ordinal"],"fvn-slashed-zero":["slashed-zero"],"fvn-figure":["lining-nums","oldstyle-nums"],"fvn-spacing":["proportional-nums","tabular-nums"],"fvn-fraction":["diagonal-fractions","stacked-fractions"],tracking:[{tracking:["tighter","tight","normal","wide","wider","widest",ge]}],"line-clamp":[{"line-clamp":["none",xl,gm]}],leading:[{leading:["none","tight","snug","normal","relaxed","loose",Ka,ge]}],"list-image":[{"list-image":["none",ge]}],"list-style-type":[{list:["none","disc","decimal",ge]}],"list-style-position":[{list:["inside","outside"]}],"placeholder-color":[{placeholder:[e]}],"placeholder-opacity":[{"placeholder-opacity":[p]}],"text-alignment":[{text:["left","center","right","justify","start","end"]}],"text-color":[{text:[e]}],"text-opacity":[{"text-opacity":[p]}],"text-decoration":["underline","overline","line-through","no-underline"],"text-decoration-style":[{decoration:[...B(),"wavy"]}],"text-decoration-thickness":[{decoration:["auto","from-font",Ka,Tr]}],"underline-offset":[{"underline-offset":["auto",Ka,ge]}],"text-decoration-color":[{decoration:[e]}],"text-transform":["uppercase","lowercase","capitalize","normal-case"],"text-overflow":["truncate","text-ellipsis","text-clip"],"text-wrap":[{text:["wrap","nowrap","balance","pretty"]}],indent:[{indent:M()}],"vertical-align":[{align:["baseline","top","middle","bottom","text-top","text-bottom","sub","super",ge]}],whitespace:[{whitespace:["normal","nowrap","pre","pre-line","pre-wrap","break-spaces"]}],break:[{break:["normal","words","all","keep"]}],hyphens:[{hyphens:["none","manual","auto"]}],content:[{content:["none",ge]}],"bg-attachment":[{bg:["fixed","local","scroll"]}],"bg-clip":[{"bg-clip":["border","padding","content","text"]}],"bg-opacity":[{"bg-opacity":[p]}],"bg-origin":[{"bg-origin":["border","padding","content"]}],"bg-position":[{bg:[...U(),dE]}],"bg-repeat":[{bg:["no-repeat",{repeat:["","x","y","round","space"]}]}],"bg-size":[{bg:["auto","cover","contain",uE]}],"bg-image":[{bg:["none",{"gradient-to":["t","tr","r","br","b","bl","l","tl"]},fE]}],"bg-color":[{bg:[e]}],"gradient-from-pos":[{from:[y]}],"gradient-via-pos":[{via:[y]}],"gradient-to-pos":[{to:[y]}],"gradient-from":[{from:[h]}],"gradient-via":[{via:[h]}],"gradient-to":[{to:[h]}],rounded:[{rounded:[n]}],"rounded-s":[{"rounded-s":[n]}],"rounded-e":[{"rounded-e":[n]}],"rounded-t":[{"rounded-t":[n]}],"rounded-r":[{"rounded-r":[n]}],"rounded-b":[{"rounded-b":[n]}],"rounded-l":[{"rounded-l":[n]}],"rounded-ss":[{"rounded-ss":[n]}],"rounded-se":[{"rounded-se":[n]}],"rounded-ee":[{"rounded-ee":[n]}],"rounded-es":[{"rounded-es":[n]}],"rounded-tl":[{"rounded-tl":[n]}],"rounded-tr":[{"rounded-tr":[n]}],"rounded-br":[{"rounded-br":[n]}],"rounded-bl":[{"rounded-bl":[n]}],"border-w":[{border:[i]}],"border-w-x":[{"border-x":[i]}],"border-w-y":[{"border-y":[i]}],"border-w-s":[{"border-s":[i]}],"border-w-e":[{"border-e":[i]}],"border-w-t":[{"border-t":[i]}],"border-w-r":[{"border-r":[i]}],"border-w-b":[{"border-b":[i]}],"border-w-l":[{"border-l":[i]}],"border-opacity":[{"border-opacity":[p]}],"border-style":[{border:[...B(),"hidden"]}],"divide-x":[{"divide-x":[i]}],"divide-x-reverse":["divide-x-reverse"],"divide-y":[{"divide-y":[i]}],"divide-y-reverse":["divide-y-reverse"],"divide-opacity":[{"divide-opacity":[p]}],"divide-style":[{divide:B()}],"border-color":[{border:[r]}],"border-color-x":[{"border-x":[r]}],"border-color-y":[{"border-y":[r]}],"border-color-s":[{"border-s":[r]}],"border-color-e":[{"border-e":[r]}],"border-color-t":[{"border-t":[r]}],"border-color-r":[{"border-r":[r]}],"border-color-b":[{"border-b":[r]}],"border-color-l":[{"border-l":[r]}],"divide-color":[{divide:[r]}],"outline-style":[{outline:["",...B()]}],"outline-offset":[{"outline-offset":[Ka,ge]}],"outline-w":[{outline:[Ka,Tr]}],"outline-color":[{outline:[e]}],"ring-w":[{ring:X()}],"ring-w-inset":["ring-inset"],"ring-color":[{ring:[e]}],"ring-opacity":[{"ring-opacity":[p]}],"ring-offset-w":[{"ring-offset":[Ka,Tr]}],"ring-offset-color":[{"ring-offset":[e]}],shadow:[{shadow:["","inner","none",Pr,pE]}],"shadow-color":[{shadow:[os]}],opacity:[{opacity:[p]}],"mix-blend":[{"mix-blend":[...A(),"plus-lighter","plus-darker"]}],"bg-blend":[{"bg-blend":A()}],filter:[{filter:["","none"]}],blur:[{blur:[o]}],brightness:[{brightness:[a]}],contrast:[{contrast:[s]}],"drop-shadow":[{"drop-shadow":["","none",Pr,ge]}],grayscale:[{grayscale:[u]}],"hue-rotate":[{"hue-rotate":[d]}],invert:[{invert:[f]}],saturate:[{saturate:[v]}],sepia:[{sepia:[b]}],"backdrop-filter":[{"backdrop-filter":["","none"]}],"backdrop-blur":[{"backdrop-blur":[o]}],"backdrop-brightness":[{"backdrop-brightness":[a]}],"backdrop-contrast":[{"backdrop-contrast":[s]}],"backdrop-grayscale":[{"backdrop-grayscale":[u]}],"backdrop-hue-rotate":[{"backdrop-hue-rotate":[d]}],"backdrop-invert":[{"backdrop-invert":[f]}],"backdrop-opacity":[{"backdrop-opacity":[p]}],"backdrop-saturate":[{"backdrop-saturate":[v]}],"backdrop-sepia":[{"backdrop-sepia":[b]}],"border-collapse":[{border:["collapse","separate"]}],"border-spacing":[{"border-spacing":[l]}],"border-spacing-x":[{"border-spacing-x":[l]}],"border-spacing-y":[{"border-spacing-y":[l]}],"table-layout":[{table:["auto","fixed"]}],caption:[{caption:["top","bottom"]}],transition:[{transition:["none","all","","colors","opacity","shadow","transform",ge]}],duration:[{duration:ae()}],ease:[{ease:["linear","in","out","in-out",ge]}],delay:[{delay:ae()}],animate:[{animate:["none","spin","ping","pulse","bounce",ge]}],transform:[{transform:["","gpu","none"]}],scale:[{scale:[w]}],"scale-x":[{"scale-x":[w]}],"scale-y":[{"scale-y":[w]}],rotate:[{rotate:[ts,ge]}],"translate-x":[{"translate-x":[S]}],"translate-y":[{"translate-y":[S]}],"skew-x":[{"skew-x":[L]}],"skew-y":[{"skew-y":[L]}],"transform-origin":[{origin:["center","top","top-right","right","bottom-right","bottom","bottom-left","left","top-left",ge]}],accent:[{accent:["auto",e]}],appearance:[{appearance:["none","auto"]}],cursor:[{cursor:["auto","default","pointer","wait","text","move","help","not-allowed","none","context-menu","progress","cell","crosshair","vertical-text","alias","copy","no-drop","grab","grabbing","all-scroll","col-resize","row-resize","n-resize","e-resize","s-resize","w-resize","ne-resize","nw-resize","se-resize","sw-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","zoom-in","zoom-out",ge]}],"caret-color":[{caret:[e]}],"pointer-events":[{"pointer-events":["none","auto"]}],resize:[{resize:["none","y","x",""]}],"scroll-behavior":[{scroll:["auto","smooth"]}],"scroll-m":[{"scroll-m":M()}],"scroll-mx":[{"scroll-mx":M()}],"scroll-my":[{"scroll-my":M()}],"scroll-ms":[{"scroll-ms":M()}],"scroll-me":[{"scroll-me":M()}],"scroll-mt":[{"scroll-mt":M()}],"scroll-mr":[{"scroll-mr":M()}],"scroll-mb":[{"scroll-mb":M()}],"scroll-ml":[{"scroll-ml":M()}],"scroll-p":[{"scroll-p":M()}],"scroll-px":[{"scroll-px":M()}],"scroll-py":[{"scroll-py":M()}],"scroll-ps":[{"scroll-ps":M()}],"scroll-pe":[{"scroll-pe":M()}],"scroll-pt":[{"scroll-pt":M()}],"scroll-pr":[{"scroll-pr":M()}],"scroll-pb":[{"scroll-pb":M()}],"scroll-pl":[{"scroll-pl":M()}],"snap-align":[{snap:["start","end","center","align-none"]}],"snap-stop":[{snap:["normal","always"]}],"snap-type":[{snap:["none","x","y","both"]}],"snap-strictness":[{snap:["mandatory","proximity"]}],touch:[{touch:["auto","none","manipulation"]}],"touch-x":[{"touch-pan":["x","left","right"]}],"touch-y":[{"touch-pan":["y","up","down"]}],"touch-pz":["touch-pinch-zoom"],select:[{select:["none","text","all","auto"]}],"will-change":[{"will-change":["auto","scroll","contents","transform",ge]}],fill:[{fill:[e,"none"]}],"stroke-w":[{stroke:[Ka,Tr,gm]}],stroke:[{stroke:[e,"none"]}],sr:["sr-only","not-sr-only"],"forced-color-adjust":[{"forced-color-adjust":["auto","none"]}]},conflictingClassGroups:{overflow:["overflow-x","overflow-y"],overscroll:["overscroll-x","overscroll-y"],inset:["inset-x","inset-y","start","end","top","right","bottom","left"],"inset-x":["right","left"],"inset-y":["top","bottom"],flex:["basis","grow","shrink"],gap:["gap-x","gap-y"],p:["px","py","ps","pe","pt","pr","pb","pl"],px:["pr","pl"],py:["pt","pb"],m:["mx","my","ms","me","mt","mr","mb","ml"],mx:["mr","ml"],my:["mt","mb"],size:["w","h"],"font-size":["leading"],"fvn-normal":["fvn-ordinal","fvn-slashed-zero","fvn-figure","fvn-spacing","fvn-fraction"],"fvn-ordinal":["fvn-normal"],"fvn-slashed-zero":["fvn-normal"],"fvn-figure":["fvn-normal"],"fvn-spacing":["fvn-normal"],"fvn-fraction":["fvn-normal"],"line-clamp":["display","overflow"],rounded:["rounded-s","rounded-e","rounded-t","rounded-r","rounded-b","rounded-l","rounded-ss","rounded-se","rounded-ee","rounded-es","rounded-tl","rounded-tr","rounded-br","rounded-bl"],"rounded-s":["rounded-ss","rounded-es"],"rounded-e":["rounded-se","rounded-ee"],"rounded-t":["rounded-tl","rounded-tr"],"rounded-r":["rounded-tr","rounded-br"],"rounded-b":["rounded-br","rounded-bl"],"rounded-l":["rounded-tl","rounded-bl"],"border-spacing":["border-spacing-x","border-spacing-y"],"border-w":["border-w-s","border-w-e","border-w-t","border-w-r","border-w-b","border-w-l"],"border-w-x":["border-w-r","border-w-l"],"border-w-y":["border-w-t","border-w-b"],"border-color":["border-color-s","border-color-e","border-color-t","border-color-r","border-color-b","border-color-l"],"border-color-x":["border-color-r","border-color-l"],"border-color-y":["border-color-t","border-color-b"],"scroll-m":["scroll-mx","scroll-my","scroll-ms","scroll-me","scroll-mt","scroll-mr","scroll-mb","scroll-ml"],"scroll-mx":["scroll-mr","scroll-ml"],"scroll-my":["scroll-mt","scroll-mb"],"scroll-p":["scroll-px","scroll-py","scroll-ps","scroll-pe","scroll-pt","scroll-pr","scroll-pb","scroll-pl"],"scroll-px":["scroll-pr","scroll-pl"],"scroll-py":["scroll-pt","scroll-pb"],touch:["touch-x","touch-y","touch-pz"],"touch-x":["touch"],"touch-y":["touch"],"touch-pz":["touch"]},conflictingClassGroupModifiers:{"font-size":["leading"]}}};var Jy=J1(vE);function K(...e){return Jy(vd(e))}var tb=k(H()),xE=xd("inline-flex items-center justify-center gap-2 whitespace-nowrap lintel-press rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 min-h-[44px] md:min-h-0",{variants:{variant:{default:"bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))] active:bg-[hsl(var(--primary-active))]",secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",outline:"border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",ghost:"hover:bg-accent hover:text-accent-foreground"},size:{default:"h-control px-3 py-1",sm:"h-7 px-2",icon:"h-control w-control"}},defaultVariants:{variant:"default",size:"default"}}),ee=eb.forwardRef(({className:e,variant:t,size:o,asChild:a=!1,...r},n)=>(0,tb.jsx)(a?so:"button",{className:K(xE({variant:t,size:o,className:e})),ref:n,...r}));ee.displayName="Button";var as=k(z());var rs=k(H()),Ot=as.forwardRef(({className:e,...t},o)=>(0,rs.jsx)("div",{ref:o,className:e,...t}));Ot.displayName="Card";var Fo=as.forwardRef(({className:e,...t},o)=>(0,rs.jsx)("div",{ref:o,className:e,...t}));Fo.displayName="CardHeader";var _o=as.forwardRef(({className:e,...t},o)=>(0,rs.jsx)("h2",{ref:o,className:K("lintel-dash-panel-title",e),...t}));_o.displayName="CardTitle";var wE=as.forwardRef(({className:e,...t},o)=>(0,rs.jsx)("div",{ref:o,className:e,...t}));wE.displayName="CardContent";var ob=k(H());function wt({className:e,...t}){return(0,ob.jsx)("div",{"data-testid":"lintel-skeleton","aria-hidden":!0,className:K("animate-pulse rounded-md bg-muted",e),...t})}var vn=k(z());var xn=k(H()),Er=vn.forwardRef(({className:e,...t},o)=>(0,xn.jsx)("table",{ref:o,className:K("w-full text-sm",e),...t}));Er.displayName="Table";var Ar=vn.forwardRef(({className:e,...t},o)=>(0,xn.jsx)("thead",{ref:o,className:e,...t}));Ar.displayName="TableHeader";var Dr=vn.forwardRef(({className:e,...t},o)=>(0,xn.jsx)("tbody",{ref:o,className:e,...t}));Dr.displayName="TableBody";var pt=vn.forwardRef(({className:e,...t},o)=>(0,xn.jsx)("tr",{ref:o,className:e,...t}));pt.displayName="TableRow";var Ho=vn.forwardRef(({className:e,...t},o)=>(0,xn.jsx)("th",{ref:o,className:e,...t}));Ho.displayName="TableHead";var Le=vn.forwardRef(({className:e,...t},o)=>(0,xn.jsx)("td",{ref:o,className:e,...t}));Le.displayName="TableCell";var kd=k(z());var Ya=k(z(),1);function Y(e,t,{checkForDefaultPrevented:o=!0}={}){return function(r){if(e?.(r),o===!1||!r.defaultPrevented)return t?.(r)}}var qo=k(z(),1),xm=k(H(),1);function ab(e,t){let o=qo.createContext(t),a=n=>{let{children:l,...i}=n,s=qo.useMemo(()=>i,Object.values(i));return(0,xm.jsx)(o.Provider,{value:s,children:l})};a.displayName=e+"Provider";function r(n){let l=qo.useContext(o);if(l)return l;if(t!==void 0)return t;throw new Error(`\`${n}\` must be used within \`${e}\``)}return[a,r]}function dt(e,t=[]){let o=[];function a(n,l){let i=qo.createContext(l),s=o.length;o=[...o,l];let u=f=>{let{scope:m,children:h,...y}=f,g=m?.[e]?.[s]||i,x=qo.useMemo(()=>y,Object.values(y));return(0,xm.jsx)(g.Provider,{value:x,children:h})};u.displayName=n+"Provider";function d(f,m){let h=m?.[e]?.[s]||i,y=qo.useContext(h);if(y)return y;if(l!==void 0)return l;throw new Error(`\`${f}\` must be used within \`${n}\``)}return[u,d]}let r=()=>{let n=o.map(l=>qo.createContext(l));return function(i){let s=i?.[e]||n;return qo.useMemo(()=>({[`__scope${e}`]:{...i,[e]:s}}),[i,s])}};return r.scopeName=e,[a,yE(r,...t)]}function yE(...e){let t=e[0];if(e.length===1)return t;let o=()=>{let a=e.map(r=>({useScope:r(),scopeName:r.scopeName}));return function(n){let l=a.reduce((i,{useScope:s,scopeName:u})=>{let f=s(n)[`__scope${u}`];return{...i,...f}},{});return qo.useMemo(()=>({[`__scope${t.scopeName}`]:l}),[l])}};return o.scopeName=t.scopeName,o}var At=k(z(),1);var Nr=k(z(),1);var wd=k(H(),1);function Mr(e){let t=e+"CollectionProvider",[o,a]=dt(t),[r,n]=o(t,{collectionRef:{current:null},itemMap:new Map}),l=h=>{let{scope:y,children:g}=h,x=Nr.default.useRef(null),p=Nr.default.useRef(new Map).current;return(0,wd.jsx)(r,{scope:y,itemMap:p,collectionRef:x,children:g})};l.displayName=t;let i=e+"CollectionSlot",s=Nr.default.forwardRef((h,y)=>{let{scope:g,children:x}=h,p=n(i,g),c=ue(y,p.collectionRef);return(0,wd.jsx)(so,{ref:c,children:x})});s.displayName=i;let u=e+"CollectionItemSlot",d="data-radix-collection-item",f=Nr.default.forwardRef((h,y)=>{let{scope:g,children:x,...p}=h,c=Nr.default.useRef(null),v=ue(y,c),w=n(u,g);return Nr.default.useEffect(()=>(w.itemMap.set(c,{ref:c,...p}),()=>void w.itemMap.delete(c))),(0,wd.jsx)(so,{[d]:"",ref:v,children:x})});f.displayName=u;function m(h){let y=n(e+"CollectionConsumer",h);return Nr.default.useCallback(()=>{let x=y.collectionRef.current;if(!x)return[];let p=Array.from(x.querySelectorAll(`[${d}]`));return Array.from(y.itemMap.values()).sort((w,b)=>p.indexOf(w.ref.current)-p.indexOf(b.ref.current))},[y.collectionRef,y.itemMap])}return[{Provider:l,Slot:s,ItemSlot:f},m,a]}var yd=k(z(),1);var rb=k(z(),1),He=globalThis?.document?rb.useLayoutEffect:()=>{};var bE=yd.useId||(()=>{}),SE=0;function Pt(e){let[t,o]=yd.useState(bE());return He(()=>{e||o(a=>a??String(SE++))},[e]),e||(t?`radix-${t}`:"")}var nb=k(z(),1),lb=k(ga(),1);var ib=k(H(),1),CE=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","span","svg","ul"],te=CE.reduce((e,t)=>{let o=nb.forwardRef((a,r)=>{let{asChild:n,...l}=a,i=n?so:t;return typeof window<"u"&&(window[Symbol.for("radix-ui")]=!0),(0,ib.jsx)(i,{...l,ref:r})});return o.displayName=`Primitive.${t}`,{...e,[t]:o}},{});function bd(e,t){e&&lb.flushSync(()=>e.dispatchEvent(t))}var yl=k(z(),1);function De(e){let t=yl.useRef(e);return yl.useEffect(()=>{t.current=e}),yl.useMemo(()=>(...o)=>t.current?.(...o),[])}var Br=k(z(),1);function Et({prop:e,defaultProp:t,onChange:o=()=>{}}){let[a,r]=LE({defaultProp:t,onChange:o}),n=e!==void 0,l=n?e:a,i=De(o),s=Br.useCallback(u=>{if(n){let f=typeof u=="function"?u(e):u;f!==e&&i(f)}else r(u)},[n,e,r,i]);return[l,s]}function LE({defaultProp:e,onChange:t}){let o=Br.useState(e),[a]=o,r=Br.useRef(a),n=De(t);return Br.useEffect(()=>{r.current!==a&&(n(a),r.current=a)},[a,r,n]),o}var Sd=k(z(),1),kE=k(H(),1),IE=Sd.createContext(void 0);function ha(e){let t=Sd.useContext(IE);return e||t||"ltr"}var Or=k(H(),1),wm="rovingFocusGroup.onEntryFocus",RE={bubbles:!1,cancelable:!0},Cd="RovingFocusGroup",[ym,sb,TE]=Mr(Cd),[PE,bm]=dt(Cd,[TE]),[EE,AE]=PE(Cd),ub=At.forwardRef((e,t)=>(0,Or.jsx)(ym.Provider,{scope:e.__scopeRovingFocusGroup,children:(0,Or.jsx)(ym.Slot,{scope:e.__scopeRovingFocusGroup,children:(0,Or.jsx)(DE,{...e,ref:t})})}));ub.displayName=Cd;var DE=At.forwardRef((e,t)=>{let{__scopeRovingFocusGroup:o,orientation:a,loop:r=!1,dir:n,currentTabStopId:l,defaultCurrentTabStopId:i,onCurrentTabStopIdChange:s,onEntryFocus:u,preventScrollOnEntryFocus:d=!1,...f}=e,m=At.useRef(null),h=ue(t,m),y=ha(n),[g=null,x]=Et({prop:l,defaultProp:i,onChange:s}),[p,c]=At.useState(!1),v=De(u),w=sb(o),b=At.useRef(!1),[L,C]=At.useState(0);return At.useEffect(()=>{let S=m.current;if(S)return S.addEventListener(wm,v),()=>S.removeEventListener(wm,v)},[v]),(0,Or.jsx)(EE,{scope:o,orientation:a,dir:y,loop:r,currentTabStopId:g,onItemFocus:At.useCallback(S=>x(S),[x]),onItemShiftTab:At.useCallback(()=>c(!0),[]),onFocusableItemAdd:At.useCallback(()=>C(S=>S+1),[]),onFocusableItemRemove:At.useCallback(()=>C(S=>S-1),[]),children:(0,Or.jsx)(te.div,{tabIndex:p||L===0?-1:0,"data-orientation":a,...f,ref:h,style:{outline:"none",...e.style},onMouseDown:Y(e.onMouseDown,()=>{b.current=!0}),onFocus:Y(e.onFocus,S=>{let T=!b.current;if(S.target===S.currentTarget&&T&&!p){let P=new CustomEvent(wm,RE);if(S.currentTarget.dispatchEvent(P),!P.defaultPrevented){let q=w().filter(B=>B.focusable),M=q.find(B=>B.active),X=q.find(B=>B.id===g),U=[M,X,...q].filter(Boolean).map(B=>B.ref.current);fb(U,d)}}b.current=!1}),onBlur:Y(e.onBlur,()=>c(!1))})})}),db="RovingFocusGroupItem",cb=At.forwardRef((e,t)=>{let{__scopeRovingFocusGroup:o,focusable:a=!0,active:r=!1,tabStopId:n,...l}=e,i=Pt(),s=n||i,u=AE(db,o),d=u.currentTabStopId===s,f=sb(o),{onFocusableItemAdd:m,onFocusableItemRemove:h}=u;return At.useEffect(()=>{if(a)return m(),()=>h()},[a,m,h]),(0,Or.jsx)(ym.ItemSlot,{scope:o,id:s,focusable:a,active:r,children:(0,Or.jsx)(te.span,{tabIndex:d?0:-1,"data-orientation":u.orientation,...l,ref:t,onMouseDown:Y(e.onMouseDown,y=>{a?u.onItemFocus(s):y.preventDefault()}),onFocus:Y(e.onFocus,()=>u.onItemFocus(s)),onKeyDown:Y(e.onKeyDown,y=>{if(y.key==="Tab"&&y.shiftKey){u.onItemShiftTab();return}if(y.target!==y.currentTarget)return;let g=BE(y,u.orientation,u.dir);if(g!==void 0){if(y.metaKey||y.ctrlKey||y.altKey||y.shiftKey)return;y.preventDefault();let p=f().filter(c=>c.focusable).map(c=>c.ref.current);if(g==="last")p.reverse();else if(g==="prev"||g==="next"){g==="prev"&&p.reverse();let c=p.indexOf(y.currentTarget);p=u.loop?OE(p,c+1):p.slice(c+1)}setTimeout(()=>fb(p))}})})})});cb.displayName=db;var NE={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function ME(e,t){return t!=="rtl"?e:e==="ArrowLeft"?"ArrowRight":e==="ArrowRight"?"ArrowLeft":e}function BE(e,t,o){let a=ME(e.key,o);if(!(t==="vertical"&&["ArrowLeft","ArrowRight"].includes(a))&&!(t==="horizontal"&&["ArrowUp","ArrowDown"].includes(a)))return NE[a]}function fb(e,t=!1){let o=document.activeElement;for(let a of e)if(a===o||(a.focus({preventScroll:t}),document.activeElement!==o))return}function OE(e,t){return e.map((o,a)=>e[(t+a)%e.length])}var pb=ub,mb=cb;var uo=k(z(),1);var gb=k(z(),1);function _E(e,t){return gb.useReducer((o,a)=>t[o][a]??o,e)}var kt=e=>{let{present:t,children:o}=e,a=HE(t),r=typeof o=="function"?o({present:a.isPresent}):uo.Children.only(o),n=ue(a.ref,qE(r));return typeof o=="function"||a.isPresent?uo.cloneElement(r,{ref:n}):null};kt.displayName="Presence";function HE(e){let[t,o]=uo.useState(),a=uo.useRef({}),r=uo.useRef(e),n=uo.useRef("none"),l=e?"mounted":"unmounted",[i,s]=_E(l,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return uo.useEffect(()=>{let u=Ld(a.current);n.current=i==="mounted"?u:"none"},[i]),He(()=>{let u=a.current,d=r.current;if(d!==e){let m=n.current,h=Ld(u);e?s("MOUNT"):h==="none"||u?.display==="none"?s("UNMOUNT"):s(d&&m!==h?"ANIMATION_OUT":"UNMOUNT"),r.current=e}},[e,s]),He(()=>{if(t){let u,d=t.ownerDocument.defaultView??window,f=h=>{let g=Ld(a.current).includes(h.animationName);if(h.target===t&&g&&(s("ANIMATION_END"),!r.current)){let x=t.style.animationFillMode;t.style.animationFillMode="forwards",u=d.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=x)})}},m=h=>{h.target===t&&(n.current=Ld(a.current))};return t.addEventListener("animationstart",m),t.addEventListener("animationcancel",f),t.addEventListener("animationend",f),()=>{d.clearTimeout(u),t.removeEventListener("animationstart",m),t.removeEventListener("animationcancel",f),t.removeEventListener("animationend",f)}}else s("ANIMATION_END")},[t,s]),{isPresent:["mounted","unmountSuspended"].includes(i),ref:uo.useCallback(u=>{u&&(a.current=getComputedStyle(u)),o(u)},[])}}function Ld(e){return e?.animationName||"none"}function qE(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}var Xa=k(H(),1),Sm="Tabs",[UE,wO]=dt(Sm,[bm]),hb=bm(),[zE,Cm]=UE(Sm),vb=Ya.forwardRef((e,t)=>{let{__scopeTabs:o,value:a,onValueChange:r,defaultValue:n,orientation:l="horizontal",dir:i,activationMode:s="automatic",...u}=e,d=ha(i),[f,m]=Et({prop:a,onChange:r,defaultProp:n});return(0,Xa.jsx)(zE,{scope:o,baseId:Pt(),value:f,onValueChange:m,orientation:l,dir:d,activationMode:s,children:(0,Xa.jsx)(te.div,{dir:d,"data-orientation":l,...u,ref:t})})});vb.displayName=Sm;var xb="TabsList",wb=Ya.forwardRef((e,t)=>{let{__scopeTabs:o,loop:a=!0,...r}=e,n=Cm(xb,o),l=hb(o);return(0,Xa.jsx)(pb,{asChild:!0,...l,orientation:n.orientation,dir:n.dir,loop:a,children:(0,Xa.jsx)(te.div,{role:"tablist","aria-orientation":n.orientation,...r,ref:t})})});wb.displayName=xb;var yb="TabsTrigger",bb=Ya.forwardRef((e,t)=>{let{__scopeTabs:o,value:a,disabled:r=!1,...n}=e,l=Cm(yb,o),i=hb(o),s=Lb(l.baseId,a),u=kb(l.baseId,a),d=a===l.value;return(0,Xa.jsx)(mb,{asChild:!0,...i,focusable:!r,active:d,children:(0,Xa.jsx)(te.button,{type:"button",role:"tab","aria-selected":d,"aria-controls":u,"data-state":d?"active":"inactive","data-disabled":r?"":void 0,disabled:r,id:s,...n,ref:t,onMouseDown:Y(e.onMouseDown,f=>{!r&&f.button===0&&f.ctrlKey===!1?l.onValueChange(a):f.preventDefault()}),onKeyDown:Y(e.onKeyDown,f=>{[" ","Enter"].includes(f.key)&&l.onValueChange(a)}),onFocus:Y(e.onFocus,()=>{let f=l.activationMode!=="manual";!d&&!r&&f&&l.onValueChange(a)})})})});bb.displayName=yb;var Sb="TabsContent",Cb=Ya.forwardRef((e,t)=>{let{__scopeTabs:o,value:a,forceMount:r,children:n,...l}=e,i=Cm(Sb,o),s=Lb(i.baseId,a),u=kb(i.baseId,a),d=a===i.value,f=Ya.useRef(d);return Ya.useEffect(()=>{let m=requestAnimationFrame(()=>f.current=!1);return()=>cancelAnimationFrame(m)},[]),(0,Xa.jsx)(kt,{present:r||d,children:({present:m})=>(0,Xa.jsx)(te.div,{"data-state":d?"active":"inactive","data-orientation":i.orientation,role:"tabpanel","aria-labelledby":s,hidden:!m,id:u,tabIndex:0,...l,ref:t,style:{...e.style,animationDuration:f.current?"0s":void 0},children:m&&n})})});Cb.displayName=Sb;function Lb(e,t){return`${e}-trigger-${t}`}function kb(e,t){return`${e}-content-${t}`}var Ib=vb,Lm=wb,km=bb,Im=Cb;var Rd=k(H()),Rm=Ib,Id=kd.forwardRef(({className:e,...t},o)=>(0,Rd.jsx)(Lm,{ref:o,className:K("flex gap-0.5 border-b border-border",e),...t}));Id.displayName=Lm.displayName;var ns=kd.forwardRef(({className:e,...t},o)=>(0,Rd.jsx)(km,{ref:o,className:K("cursor-pointer border-b-2 border-transparent bg-transparent px-3.5 py-[7px] text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground",e),...t}));ns.displayName=km.displayName;var WE=kd.forwardRef(({className:e,...t},o)=>(0,Rd.jsx)(Im,{ref:o,className:K("focus-visible:outline-none",e),...t}));WE.displayName=Im.displayName;var Co=k(z()),iS=k(ga());var me=k(z(),1),Ub=k(ga(),1);var lt=k(z(),1);var Rb=k(z(),1);function Tb(e,t=globalThis?.document){let o=De(e);Rb.useEffect(()=>{let a=r=>{r.key==="Escape"&&o(r)};return t.addEventListener("keydown",a,{capture:!0}),()=>t.removeEventListener("keydown",a,{capture:!0})},[o,t])}var Pm=k(H(),1),$E="DismissableLayer",Tm="dismissableLayer.update",GE="dismissableLayer.pointerDownOutside",jE="dismissableLayer.focusOutside",Pb,Ab=lt.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),Fr=lt.forwardRef((e,t)=>{let{disableOutsidePointerEvents:o=!1,onEscapeKeyDown:a,onPointerDownOutside:r,onFocusOutside:n,onInteractOutside:l,onDismiss:i,...s}=e,u=lt.useContext(Ab),[d,f]=lt.useState(null),m=d?.ownerDocument??globalThis?.document,[,h]=lt.useState({}),y=ue(t,C=>f(C)),g=Array.from(u.layers),[x]=[...u.layersWithOutsidePointerEventsDisabled].slice(-1),p=g.indexOf(x),c=d?g.indexOf(d):-1,v=u.layersWithOutsidePointerEventsDisabled.size>0,w=c>=p,b=XE(C=>{let S=C.target,T=[...u.branches].some(P=>P.contains(S));!w||T||(r?.(C),l?.(C),C.defaultPrevented||i?.())},m),L=YE(C=>{let S=C.target;[...u.branches].some(P=>P.contains(S))||(n?.(C),l?.(C),C.defaultPrevented||i?.())},m);return Tb(C=>{c===u.layers.size-1&&(a?.(C),!C.defaultPrevented&&i&&(C.preventDefault(),i()))},m),lt.useEffect(()=>{if(d)return o&&(u.layersWithOutsidePointerEventsDisabled.size===0&&(Pb=m.body.style.pointerEvents,m.body.style.pointerEvents="none"),u.layersWithOutsidePointerEventsDisabled.add(d)),u.layers.add(d),Eb(),()=>{o&&u.layersWithOutsidePointerEventsDisabled.size===1&&(m.body.style.pointerEvents=Pb)}},[d,m,o,u]),lt.useEffect(()=>()=>{d&&(u.layers.delete(d),u.layersWithOutsidePointerEventsDisabled.delete(d),Eb())},[d,u]),lt.useEffect(()=>{let C=()=>h({});return document.addEventListener(Tm,C),()=>document.removeEventListener(Tm,C)},[]),(0,Pm.jsx)(te.div,{...s,ref:y,style:{pointerEvents:v?w?"auto":"none":void 0,...e.style},onFocusCapture:Y(e.onFocusCapture,L.onFocusCapture),onBlurCapture:Y(e.onBlurCapture,L.onBlurCapture),onPointerDownCapture:Y(e.onPointerDownCapture,b.onPointerDownCapture)})});Fr.displayName=$E;var KE="DismissableLayerBranch",Db=lt.forwardRef((e,t)=>{let o=lt.useContext(Ab),a=lt.useRef(null),r=ue(t,a);return lt.useEffect(()=>{let n=a.current;if(n)return o.branches.add(n),()=>{o.branches.delete(n)}},[o.branches]),(0,Pm.jsx)(te.div,{...e,ref:r})});Db.displayName=KE;function XE(e,t=globalThis?.document){let o=De(e),a=lt.useRef(!1),r=lt.useRef(()=>{});return lt.useEffect(()=>{let n=i=>{if(i.target&&!a.current){let u=function(){Nb(GE,o,d,{discrete:!0})};var s=u;let d={originalEvent:i};i.pointerType==="touch"?(t.removeEventListener("click",r.current),r.current=u,t.addEventListener("click",r.current,{once:!0})):u()}else t.removeEventListener("click",r.current);a.current=!1},l=window.setTimeout(()=>{t.addEventListener("pointerdown",n)},0);return()=>{window.clearTimeout(l),t.removeEventListener("pointerdown",n),t.removeEventListener("click",r.current)}},[t,o]),{onPointerDownCapture:()=>a.current=!0}}function YE(e,t=globalThis?.document){let o=De(e),a=lt.useRef(!1);return lt.useEffect(()=>{let r=n=>{n.target&&!a.current&&Nb(jE,o,{originalEvent:n},{discrete:!1})};return t.addEventListener("focusin",r),()=>t.removeEventListener("focusin",r)},[t,o]),{onFocusCapture:()=>a.current=!0,onBlurCapture:()=>a.current=!1}}function Eb(){let e=new CustomEvent(Tm);document.dispatchEvent(e)}function Nb(e,t,o,{discrete:a}){let r=o.originalEvent.target,n=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:o});t&&r.addEventListener(e,t,{once:!0}),a?bd(r,n):r.dispatchEvent(n)}var Mb=Fr,Bb=Db;var Td=k(z(),1),Ob=k(ga(),1);var Fb=k(H(),1),ZE="Portal",Qa=Td.forwardRef((e,t)=>{let{container:o,...a}=e,[r,n]=Td.useState(!1);He(()=>n(!0),[]);let l=o||r&&globalThis?.document?.body;return l?Ob.default.createPortal((0,Fb.jsx)(te.div,{...a,ref:t}),l):null});Qa.displayName=ZE;var _b=k(z(),1);var Hb=k(H(),1),JE="VisuallyHidden",bl=_b.forwardRef((e,t)=>(0,Hb.jsx)(te.span,{...e,ref:t,style:{position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal",...e.style}}));bl.displayName=JE;var Pe=k(H(),1),Mm="ToastProvider",[Bm,eA,tA]=Mr("Toast"),[zb,$O]=dt("Toast",[tA]),[oA,Ed]=zb(Mm),Vb=e=>{let{__scopeToast:t,label:o="Notification",duration:a=5e3,swipeDirection:r="right",swipeThreshold:n=50,children:l}=e,[i,s]=me.useState(null),[u,d]=me.useState(0),f=me.useRef(!1),m=me.useRef(!1);return o.trim()||console.error(`Invalid prop \`label\` supplied to \`${Mm}\`. Expected non-empty \`string\`.`),(0,Pe.jsx)(Bm.Provider,{scope:t,children:(0,Pe.jsx)(oA,{scope:t,label:o,duration:a,swipeDirection:r,swipeThreshold:n,toastCount:u,viewport:i,onViewportChange:s,onToastAdd:me.useCallback(()=>d(h=>h+1),[]),onToastRemove:me.useCallback(()=>d(h=>h-1),[]),isFocusedToastEscapeKeyDownRef:f,isClosePausedRef:m,children:l})})};Vb.displayName=Mm;var Wb="ToastViewport",aA=["F8"],Am="toast.viewportPause",Dm="toast.viewportResume",$b=me.forwardRef((e,t)=>{let{__scopeToast:o,hotkey:a=aA,label:r="Notifications ({hotkey})",...n}=e,l=Ed(Wb,o),i=eA(o),s=me.useRef(null),u=me.useRef(null),d=me.useRef(null),f=me.useRef(null),m=ue(t,f,l.onViewportChange),h=a.join("+").replace(/Key/g,"").replace(/Digit/g,""),y=l.toastCount>0;me.useEffect(()=>{let x=p=>{a.length!==0&&a.every(v=>p[v]||p.code===v)&&f.current?.focus()};return document.addEventListener("keydown",x),()=>document.removeEventListener("keydown",x)},[a]),me.useEffect(()=>{let x=s.current,p=f.current;if(y&&x&&p){let c=()=>{if(!l.isClosePausedRef.current){let L=new CustomEvent(Am);p.dispatchEvent(L),l.isClosePausedRef.current=!0}},v=()=>{if(l.isClosePausedRef.current){let L=new CustomEvent(Dm);p.dispatchEvent(L),l.isClosePausedRef.current=!1}},w=L=>{!x.contains(L.relatedTarget)&&v()},b=()=>{x.contains(document.activeElement)||v()};return x.addEventListener("focusin",c),x.addEventListener("focusout",w),x.addEventListener("pointermove",c),x.addEventListener("pointerleave",b),window.addEventListener("blur",c),window.addEventListener("focus",v),()=>{x.removeEventListener("focusin",c),x.removeEventListener("focusout",w),x.removeEventListener("pointermove",c),x.removeEventListener("pointerleave",b),window.removeEventListener("blur",c),window.removeEventListener("focus",v)}}},[y,l.isClosePausedRef]);let g=me.useCallback(({tabbingDirection:x})=>{let c=i().map(v=>{let w=v.ref.current,b=[w,...vA(w)];return x==="forwards"?b:b.reverse()});return(x==="forwards"?c.reverse():c).flat()},[i]);return me.useEffect(()=>{let x=f.current;if(x){let p=c=>{let v=c.altKey||c.ctrlKey||c.metaKey;if(c.key==="Tab"&&!v){let b=document.activeElement,L=c.shiftKey;if(c.target===x&&L){u.current?.focus();return}let T=g({tabbingDirection:L?"backwards":"forwards"}),P=T.findIndex(q=>q===b);Em(T.slice(P+1))?c.preventDefault():L?u.current?.focus():d.current?.focus()}};return x.addEventListener("keydown",p),()=>x.removeEventListener("keydown",p)}},[i,g]),(0,Pe.jsxs)(Bb,{ref:s,role:"region","aria-label":r.replace("{hotkey}",h),tabIndex:-1,style:{pointerEvents:y?void 0:"none"},children:[y&&(0,Pe.jsx)(Nm,{ref:u,onFocusFromOutsideViewport:()=>{let x=g({tabbingDirection:"forwards"});Em(x)}}),(0,Pe.jsx)(Bm.Slot,{scope:o,children:(0,Pe.jsx)(te.ol,{tabIndex:-1,...n,ref:m})}),y&&(0,Pe.jsx)(Nm,{ref:d,onFocusFromOutsideViewport:()=>{let x=g({tabbingDirection:"backwards"});Em(x)}})]})});$b.displayName=Wb;var Gb="ToastFocusProxy",Nm=me.forwardRef((e,t)=>{let{__scopeToast:o,onFocusFromOutsideViewport:a,...r}=e,n=Ed(Gb,o);return(0,Pe.jsx)(bl,{"aria-hidden":!0,tabIndex:0,...r,ref:t,style:{position:"fixed"},onFocus:l=>{let i=l.relatedTarget;!n.viewport?.contains(i)&&a()}})});Nm.displayName=Gb;var Ad="Toast",rA="toast.swipeStart",nA="toast.swipeMove",lA="toast.swipeCancel",iA="toast.swipeEnd",jb=me.forwardRef((e,t)=>{let{forceMount:o,open:a,defaultOpen:r,onOpenChange:n,...l}=e,[i=!0,s]=Et({prop:a,defaultProp:r,onChange:n});return(0,Pe.jsx)(kt,{present:o||i,children:(0,Pe.jsx)(dA,{open:i,...l,ref:t,onClose:()=>s(!1),onPause:De(e.onPause),onResume:De(e.onResume),onSwipeStart:Y(e.onSwipeStart,u=>{u.currentTarget.setAttribute("data-swipe","start")}),onSwipeMove:Y(e.onSwipeMove,u=>{let{x:d,y:f}=u.detail.delta;u.currentTarget.setAttribute("data-swipe","move"),u.currentTarget.style.setProperty("--radix-toast-swipe-move-x",`${d}px`),u.currentTarget.style.setProperty("--radix-toast-swipe-move-y",`${f}px`)}),onSwipeCancel:Y(e.onSwipeCancel,u=>{u.currentTarget.setAttribute("data-swipe","cancel"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-x"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-y"),u.currentTarget.style.removeProperty("--radix-toast-swipe-end-x"),u.currentTarget.style.removeProperty("--radix-toast-swipe-end-y")}),onSwipeEnd:Y(e.onSwipeEnd,u=>{let{x:d,y:f}=u.detail.delta;u.currentTarget.setAttribute("data-swipe","end"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-x"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-y"),u.currentTarget.style.setProperty("--radix-toast-swipe-end-x",`${d}px`),u.currentTarget.style.setProperty("--radix-toast-swipe-end-y",`${f}px`),s(!1)})})})});jb.displayName=Ad;var[sA,uA]=zb(Ad,{onClose(){}}),dA=me.forwardRef((e,t)=>{let{__scopeToast:o,type:a="foreground",duration:r,open:n,onClose:l,onEscapeKeyDown:i,onPause:s,onResume:u,onSwipeStart:d,onSwipeMove:f,onSwipeCancel:m,onSwipeEnd:h,...y}=e,g=Ed(Ad,o),[x,p]=me.useState(null),c=ue(t,R=>p(R)),v=me.useRef(null),w=me.useRef(null),b=r||g.duration,L=me.useRef(0),C=me.useRef(b),S=me.useRef(0),{onToastAdd:T,onToastRemove:P}=g,q=De(()=>{x?.contains(document.activeElement)&&g.viewport?.focus(),l()}),M=me.useCallback(R=>{!R||R===1/0||(window.clearTimeout(S.current),L.current=new Date().getTime(),S.current=window.setTimeout(q,R))},[q]);me.useEffect(()=>{let R=g.viewport;if(R){let U=()=>{M(C.current),u?.()},B=()=>{let A=new Date().getTime()-L.current;C.current=C.current-A,window.clearTimeout(S.current),s?.()};return R.addEventListener(Am,B),R.addEventListener(Dm,U),()=>{R.removeEventListener(Am,B),R.removeEventListener(Dm,U)}}},[g.viewport,b,s,u,M]),me.useEffect(()=>{n&&!g.isClosePausedRef.current&&M(b)},[n,b,g.isClosePausedRef,M]),me.useEffect(()=>(T(),()=>P()),[T,P]);let X=me.useMemo(()=>x?Jb(x):null,[x]);return g.viewport?(0,Pe.jsxs)(Pe.Fragment,{children:[X&&(0,Pe.jsx)(cA,{__scopeToast:o,role:"status","aria-live":a==="foreground"?"assertive":"polite","aria-atomic":!0,children:X}),(0,Pe.jsx)(sA,{scope:o,onClose:q,children:Ub.createPortal((0,Pe.jsx)(Bm.ItemSlot,{scope:o,children:(0,Pe.jsx)(Mb,{asChild:!0,onEscapeKeyDown:Y(i,()=>{g.isFocusedToastEscapeKeyDownRef.current||q(),g.isFocusedToastEscapeKeyDownRef.current=!1}),children:(0,Pe.jsx)(te.li,{role:"status","aria-live":"off","aria-atomic":!0,tabIndex:0,"data-state":n?"open":"closed","data-swipe-direction":g.swipeDirection,...y,ref:c,style:{userSelect:"none",touchAction:"none",...e.style},onKeyDown:Y(e.onKeyDown,R=>{R.key==="Escape"&&(i?.(R.nativeEvent),R.nativeEvent.defaultPrevented||(g.isFocusedToastEscapeKeyDownRef.current=!0,q()))}),onPointerDown:Y(e.onPointerDown,R=>{R.button===0&&(v.current={x:R.clientX,y:R.clientY})}),onPointerMove:Y(e.onPointerMove,R=>{if(!v.current)return;let U=R.clientX-v.current.x,B=R.clientY-v.current.y,A=!!w.current,N=["left","right"].includes(g.swipeDirection),O=["left","up"].includes(g.swipeDirection)?Math.min:Math.max,Q=N?O(0,U):0,ae=N?0:O(0,B),he=R.pointerType==="touch"?10:2,pe={x:Q,y:ae},de={originalEvent:R,delta:pe};A?(w.current=pe,Pd(nA,f,de,{discrete:!1})):qb(pe,g.swipeDirection,he)?(w.current=pe,Pd(rA,d,de,{discrete:!1}),R.target.setPointerCapture(R.pointerId)):(Math.abs(U)>he||Math.abs(B)>he)&&(v.current=null)}),onPointerUp:Y(e.onPointerUp,R=>{let U=w.current,B=R.target;if(B.hasPointerCapture(R.pointerId)&&B.releasePointerCapture(R.pointerId),w.current=null,v.current=null,U){let A=R.currentTarget,N={originalEvent:R,delta:U};qb(U,g.swipeDirection,g.swipeThreshold)?Pd(iA,h,N,{discrete:!0}):Pd(lA,m,N,{discrete:!0}),A.addEventListener("click",O=>O.preventDefault(),{once:!0})}})})})}),g.viewport)})]}):null}),cA=e=>{let{__scopeToast:t,children:o,...a}=e,r=Ed(Ad,t),[n,l]=me.useState(!1),[i,s]=me.useState(!1);return gA(()=>l(!0)),me.useEffect(()=>{let u=window.setTimeout(()=>s(!0),1e3);return()=>window.clearTimeout(u)},[]),i?null:(0,Pe.jsx)(Qa,{asChild:!0,children:(0,Pe.jsx)(bl,{...a,children:n&&(0,Pe.jsxs)(Pe.Fragment,{children:[r.label," ",o]})})})},fA="ToastTitle",Kb=me.forwardRef((e,t)=>{let{__scopeToast:o,...a}=e;return(0,Pe.jsx)(te.div,{...a,ref:t})});Kb.displayName=fA;var pA="ToastDescription",Xb=me.forwardRef((e,t)=>{let{__scopeToast:o,...a}=e;return(0,Pe.jsx)(te.div,{...a,ref:t})});Xb.displayName=pA;var Yb="ToastAction",mA=me.forwardRef((e,t)=>{let{altText:o,...a}=e;return o.trim()?(0,Pe.jsx)(Zb,{altText:o,asChild:!0,children:(0,Pe.jsx)(Om,{...a,ref:t})}):(console.error(`Invalid prop \`altText\` supplied to \`${Yb}\`. Expected non-empty \`string\`.`),null)});mA.displayName=Yb;var Qb="ToastClose",Om=me.forwardRef((e,t)=>{let{__scopeToast:o,...a}=e,r=uA(Qb,o);return(0,Pe.jsx)(Zb,{asChild:!0,children:(0,Pe.jsx)(te.button,{type:"button",...a,ref:t,onClick:Y(e.onClick,r.onClose)})})});Om.displayName=Qb;var Zb=me.forwardRef((e,t)=>{let{__scopeToast:o,altText:a,...r}=e;return(0,Pe.jsx)(te.div,{"data-radix-toast-announce-exclude":"","data-radix-toast-announce-alt":a||void 0,...r,ref:t})});function Jb(e){let t=[];return Array.from(e.childNodes).forEach(a=>{if(a.nodeType===a.TEXT_NODE&&a.textContent&&t.push(a.textContent),hA(a)){let r=a.ariaHidden||a.hidden||a.style.display==="none",n=a.dataset.radixToastAnnounceExclude==="";if(!r)if(n){let l=a.dataset.radixToastAnnounceAlt;l&&t.push(l)}else t.push(...Jb(a))}}),t}function Pd(e,t,o,{discrete:a}){let r=o.originalEvent.currentTarget,n=new CustomEvent(e,{bubbles:!0,cancelable:!0,detail:o});t&&r.addEventListener(e,t,{once:!0}),a?bd(r,n):r.dispatchEvent(n)}var qb=(e,t,o=0)=>{let a=Math.abs(e.x),r=Math.abs(e.y),n=a>r;return t==="left"||t==="right"?n&&a>o:!n&&r>o};function gA(e=()=>{}){let t=De(e);He(()=>{let o=0,a=0;return o=window.requestAnimationFrame(()=>a=window.requestAnimationFrame(t)),()=>{window.cancelAnimationFrame(o),window.cancelAnimationFrame(a)}},[t])}function hA(e){return e.nodeType===e.ELEMENT_NODE}function vA(e){let t=[],o=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:a=>{let r=a.tagName==="INPUT"&&a.type==="hidden";return a.disabled||a.hidden||r?NodeFilter.FILTER_SKIP:a.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;o.nextNode();)t.push(o.currentNode);return t}function Em(e){let t=document.activeElement;return e.some(o=>o===t?!0:(o.focus(),document.activeElement!==t))}var eS=Vb,Fm=$b,_m=jb,Hm=Kb,qm=Xb;var Um=Om;var Nd=k(z());var tS=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Dd=(...e)=>e.filter((t,o,a)=>!!t&&t.trim()!==""&&a.indexOf(t)===o).join(" ").trim();var ls=k(z());var oS={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};var aS=(0,ls.forwardRef)(({color:e="currentColor",size:t=24,strokeWidth:o=2,absoluteStrokeWidth:a,className:r="",children:n,iconNode:l,...i},s)=>(0,ls.createElement)("svg",{ref:s,...oS,width:t,height:t,stroke:e,strokeWidth:a?Number(o)*24/Number(t):o,className:Dd("lucide",r),...i},[...l.map(([u,d])=>(0,ls.createElement)(u,d)),...Array.isArray(n)?n:[n]]));var Ne=(e,t)=>{let o=(0,Nd.forwardRef)(({className:a,...r},n)=>(0,Nd.createElement)(aS,{ref:n,iconNode:t,className:Dd(`lucide-${tS(e)}`,a),...r}));return o.displayName=`${e}`,o};var is=Ne("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);var wn=Ne("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);var _r=Ne("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);var ss=Ne("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);var us=Ne("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);var ds=Ne("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);var Sl=Ne("DoorOpen",[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14",key:"hrm0s9"}],["path",{d:"M2 20h3",key:"1gaodv"}],["path",{d:"M13 20h9",key:"s90cdi"}],["path",{d:"M10 12v.01",key:"vx6srw"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",key:"199qr4"}]]);var va=Ne("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);var cs=Ne("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);var fs=Ne("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);var ps=Ne("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);var ms=Ne("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);var gs=Ne("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);var hs=Ne("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);var Za=Ne("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);var Md=k(z()),lS=k(H()),rS=Md.createContext(null);function nS({container:e,children:t}){return(0,lS.jsx)(rS.Provider,{value:e,children:t})}function xa(){return Md.useContext(rS)}var yn=k(H()),Ja=eS,wa=Co.forwardRef(({className:e,...t},o)=>{let a=xa(),r=(0,yn.jsx)(Fm,{ref:o,className:K("fixed bottom-0 inset-x-0 z-[60] m-0 flex w-full max-w-none list-none flex-col gap-2 p-4 pb-[calc(16px+var(--lintel-safe-bottom))] outline-none md:inset-x-auto md:right-0 md:max-w-[380px] md:pb-4",e),...t});return a?iS.createPortal(r,a):r});wa.displayName=Fm.displayName;var ya=Co.forwardRef(({className:e,...t},o)=>(0,yn.jsx)(_m,{ref:o,"data-testid":"lintel-toast",className:K("lintel-toast flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 pr-2 text-foreground shadow-lg",e),...t}));ya.displayName=_m.displayName;var ba=Co.forwardRef(({className:e,...t},o)=>(0,yn.jsx)(Hm,{ref:o,className:K("text-sm font-semibold",e),...t}));ba.displayName=Hm.displayName;var Sa=Co.forwardRef(({className:e,...t},o)=>(0,yn.jsx)(qm,{ref:o,className:K("text-xs text-muted-foreground",e),...t}));Sa.displayName=qm.displayName;var Bd=Co.forwardRef(({className:e,...t},o)=>(0,yn.jsx)(Um,{ref:o,className:K("shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",e),"aria-label":"Dismiss",...t,children:(0,yn.jsx)(Za,{className:"h-3.5 w-3.5"})}));Bd.displayName=Um.displayName;function er(){let[e,t]=Co.useState([]),o=Co.useRef(1),a=Co.useCallback((n,l)=>{let i=o.current++;return t(s=>[...s,{id:i,title:n,description:l}]),i},[]),r=Co.useCallback(n=>{t(l=>l.filter(i=>i.id!==n))},[]);return{toasts:e,push:a,dismiss:r}}var ko=k(z());var cg=k(z());var Ye=k(z(),1);var Uo=k(z(),1);var fS=k(H(),1),zm="focusScope.autoFocusOnMount",Vm="focusScope.autoFocusOnUnmount",sS={bubbles:!1,cancelable:!0},wA="FocusScope",bn=Uo.forwardRef((e,t)=>{let{loop:o=!1,trapped:a=!1,onMountAutoFocus:r,onUnmountAutoFocus:n,...l}=e,[i,s]=Uo.useState(null),u=De(r),d=De(n),f=Uo.useRef(null),m=ue(t,g=>s(g)),h=Uo.useRef({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}}).current;Uo.useEffect(()=>{if(a){let c=function(L){if(h.paused||!i)return;let C=L.target;i.contains(C)?f.current=C:Hr(f.current,{select:!0})},v=function(L){if(h.paused||!i)return;let C=L.relatedTarget;C!==null&&(i.contains(C)||Hr(f.current,{select:!0}))},w=function(L){if(document.activeElement===document.body)for(let S of L)S.removedNodes.length>0&&Hr(i)};var g=c,x=v,p=w;document.addEventListener("focusin",c),document.addEventListener("focusout",v);let b=new MutationObserver(w);return i&&b.observe(i,{childList:!0,subtree:!0}),()=>{document.removeEventListener("focusin",c),document.removeEventListener("focusout",v),b.disconnect()}}},[a,i,h.paused]),Uo.useEffect(()=>{if(i){dS.add(h);let g=document.activeElement;if(!i.contains(g)){let p=new CustomEvent(zm,sS);i.addEventListener(zm,u),i.dispatchEvent(p),p.defaultPrevented||(yA(kA(pS(i)),{select:!0}),document.activeElement===g&&Hr(i))}return()=>{i.removeEventListener(zm,u),setTimeout(()=>{let p=new CustomEvent(Vm,sS);i.addEventListener(Vm,d),i.dispatchEvent(p),p.defaultPrevented||Hr(g??document.body,{select:!0}),i.removeEventListener(Vm,d),dS.remove(h)},0)}}},[i,u,d,h]);let y=Uo.useCallback(g=>{if(!o&&!a||h.paused)return;let x=g.key==="Tab"&&!g.altKey&&!g.ctrlKey&&!g.metaKey,p=document.activeElement;if(x&&p){let c=g.currentTarget,[v,w]=bA(c);v&&w?!g.shiftKey&&p===w?(g.preventDefault(),o&&Hr(v,{select:!0})):g.shiftKey&&p===v&&(g.preventDefault(),o&&Hr(w,{select:!0})):p===c&&g.preventDefault()}},[o,a,h.paused]);return(0,fS.jsx)(te.div,{tabIndex:-1,...l,ref:m,onKeyDown:y})});bn.displayName=wA;function yA(e,{select:t=!1}={}){let o=document.activeElement;for(let a of e)if(Hr(a,{select:t}),document.activeElement!==o)return}function bA(e){let t=pS(e),o=uS(t,e),a=uS(t.reverse(),e);return[o,a]}function pS(e){let t=[],o=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:a=>{let r=a.tagName==="INPUT"&&a.type==="hidden";return a.disabled||a.hidden||r?NodeFilter.FILTER_SKIP:a.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;o.nextNode();)t.push(o.currentNode);return t}function uS(e,t){for(let o of e)if(!SA(o,{upTo:t}))return o}function SA(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function CA(e){return e instanceof HTMLInputElement&&"select"in e}function Hr(e,{select:t=!1}={}){if(e&&e.focus){let o=document.activeElement;e.focus({preventScroll:!0}),e!==o&&CA(e)&&t&&e.select()}}var dS=LA();function LA(){let e=[];return{add(t){let o=e[0];t!==o&&o?.pause(),e=cS(e,t),e.unshift(t)},remove(t){e=cS(e,t),e[0]?.resume()}}}function cS(e,t){let o=[...e],a=o.indexOf(t);return a!==-1&&o.splice(a,1),o}function kA(e){return e.filter(t=>t.tagName!=="A")}var gS=k(z(),1),Wm=0;function Cl(){gS.useEffect(()=>{let e=document.querySelectorAll("[data-radix-focus-guard]");return document.body.insertAdjacentElement("afterbegin",e[0]??mS()),document.body.insertAdjacentElement("beforeend",e[1]??mS()),Wm++,()=>{Wm===1&&document.querySelectorAll("[data-radix-focus-guard]").forEach(t=>t.remove()),Wm--}},[])}function mS(){let e=document.createElement("span");return e.setAttribute("data-radix-focus-guard",""),e.tabIndex=0,e.style.outline="none",e.style.opacity="0",e.style.position="fixed",e.style.pointerEvents="none",e}var co=function(){return co=Object.assign||function(t){for(var o,a=1,r=arguments.length;a<r;a++){o=arguments[a];for(var n in o)Object.prototype.hasOwnProperty.call(o,n)&&(t[n]=o[n])}return t},co.apply(this,arguments)};function Od(e,t){var o={};for(var a in e)Object.prototype.hasOwnProperty.call(e,a)&&t.indexOf(a)<0&&(o[a]=e[a]);if(e!=null&&typeof Object.getOwnPropertySymbols=="function")for(var r=0,a=Object.getOwnPropertySymbols(e);r<a.length;r++)t.indexOf(a[r])<0&&Object.prototype.propertyIsEnumerable.call(e,a[r])&&(o[a[r]]=e[a[r]]);return o}function hS(e,t,o){if(o||arguments.length===2)for(var a=0,r=t.length,n;a<r;a++)(n||!(a in t))&&(n||(n=Array.prototype.slice.call(t,0,a)),n[a]=t[a]);return e.concat(n||Array.prototype.slice.call(t))}var Ud=k(z());var Wt=k(z());var Sn="right-scroll-bar-position",Cn="width-before-scroll-bar",$m="with-scroll-bars-hidden",Gm="--removed-body-scroll-bar-size";function Fd(e,t){return typeof e=="function"?e(t):e&&(e.current=t),e}var vS=k(z());function xS(e,t){var o=(0,vS.useState)(function(){return{value:e,callback:t,facade:{get current(){return o.value},set current(a){var r=o.value;r!==a&&(o.value=a,o.callback(a,r))}}}})[0];return o.callback=t,o.facade}var _d=k(z());var IA=typeof window<"u"?_d.useLayoutEffect:_d.useEffect,wS=new WeakMap;function jm(e,t){var o=xS(t||null,function(a){return e.forEach(function(r){return Fd(r,a)})});return IA(function(){var a=wS.get(o);if(a){var r=new Set(a),n=new Set(e),l=o.current;r.forEach(function(i){n.has(i)||Fd(i,null)}),n.forEach(function(i){r.has(i)||Fd(i,l)})}wS.set(o,e)},[e]),o}function RA(e){return e}function TA(e,t){t===void 0&&(t=RA);var o=[],a=!1,r={read:function(){if(a)throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");return o.length?o[o.length-1]:e},useMedium:function(n){var l=t(n,a);return o.push(l),function(){o=o.filter(function(i){return i!==l})}},assignSyncMedium:function(n){for(a=!0;o.length;){var l=o;o=[],l.forEach(n)}o={push:function(i){return n(i)},filter:function(){return o}}},assignMedium:function(n){a=!0;var l=[];if(o.length){var i=o;o=[],i.forEach(n),l=o}var s=function(){var d=l;l=[],d.forEach(n)},u=function(){return Promise.resolve().then(s)};u(),o={push:function(d){l.push(d),u()},filter:function(d){return l=l.filter(d),o}}}};return r}function Km(e){e===void 0&&(e={});var t=TA(null);return t.options=co({async:!0,ssr:!1},e),t}var yS=k(z()),bS=function(e){var t=e.sideCar,o=Od(e,["sideCar"]);if(!t)throw new Error("Sidecar: please provide `sideCar` property to import the right car");var a=t.read();if(!a)throw new Error("Sidecar medium not found");return yS.createElement(a,co({},o))};bS.isSideCarExport=!0;function Xm(e,t){return e.useMedium(t),bS}var Hd=Km();var Ym=function(){},vs=Wt.forwardRef(function(e,t){var o=Wt.useRef(null),a=Wt.useState({onScrollCapture:Ym,onWheelCapture:Ym,onTouchMoveCapture:Ym}),r=a[0],n=a[1],l=e.forwardProps,i=e.children,s=e.className,u=e.removeScrollBar,d=e.enabled,f=e.shards,m=e.sideCar,h=e.noRelative,y=e.noIsolation,g=e.inert,x=e.allowPinchZoom,p=e.as,c=p===void 0?"div":p,v=e.gapMode,w=Od(e,["forwardProps","children","className","removeScrollBar","enabled","shards","sideCar","noRelative","noIsolation","inert","allowPinchZoom","as","gapMode"]),b=m,L=jm([o,t]),C=co(co({},w),r);return Wt.createElement(Wt.Fragment,null,d&&Wt.createElement(b,{sideCar:Hd,removeScrollBar:u,shards:f,noRelative:h,noIsolation:y,inert:g,setCallbacks:n,allowPinchZoom:!!x,lockRef:o,gapMode:v}),l?Wt.cloneElement(Wt.Children.only(i),co(co({},C),{ref:L})):Wt.createElement(c,co({},C,{className:s,ref:L}),i))});vs.defaultProps={enabled:!0,removeScrollBar:!0,inert:!1};vs.classNames={fullWidth:Cn,zeroRight:Sn};var Xe=k(z());var kl=k(z());var LS=k(z());var SS;var CS=function(){if(SS)return SS;if(typeof __webpack_nonce__<"u")return __webpack_nonce__};function PA(){if(!document)return null;var e=document.createElement("style");e.type="text/css";var t=CS();return t&&e.setAttribute("nonce",t),e}function EA(e,t){e.styleSheet?e.styleSheet.cssText=t:e.appendChild(document.createTextNode(t))}function AA(e){var t=document.head||document.getElementsByTagName("head")[0];t.appendChild(e)}var Qm=function(){var e=0,t=null;return{add:function(o){e==0&&(t=PA())&&(EA(t,o),AA(t)),e++},remove:function(){e--,!e&&t&&(t.parentNode&&t.parentNode.removeChild(t),t=null)}}};var Zm=function(){var e=Qm();return function(t,o){LS.useEffect(function(){return e.add(t),function(){e.remove()}},[t&&o])}};var xs=function(){var e=Zm(),t=function(o){var a=o.styles,r=o.dynamic;return e(a,r),null};return t};var DA={left:0,top:0,right:0,gap:0},Jm=function(e){return parseInt(e||"",10)||0},NA=function(e){var t=window.getComputedStyle(document.body),o=t[e==="padding"?"paddingLeft":"marginLeft"],a=t[e==="padding"?"paddingTop":"marginTop"],r=t[e==="padding"?"paddingRight":"marginRight"];return[Jm(o),Jm(a),Jm(r)]},eg=function(e){if(e===void 0&&(e="margin"),typeof window>"u")return DA;var t=NA(e),o=document.documentElement.clientWidth,a=window.innerWidth;return{left:t[0],top:t[1],right:t[2],gap:Math.max(0,a-o+t[2]-t[0])}};var MA=xs(),Ll="data-scroll-locked",BA=function(e,t,o,a){var r=e.left,n=e.top,l=e.right,i=e.gap;return o===void 0&&(o="margin"),`
  .`.concat($m,` {
   overflow: hidden `).concat(a,`;
   padding-right: `).concat(i,"px ").concat(a,`;
  }
  body[`).concat(Ll,`] {
    overflow: hidden `).concat(a,`;
    overscroll-behavior: contain;
    `).concat([t&&"position: relative ".concat(a,";"),o==="margin"&&`
    padding-left: `.concat(r,`px;
    padding-top: `).concat(n,`px;
    padding-right: `).concat(l,`px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(i,"px ").concat(a,`;
    `),o==="padding"&&"padding-right: ".concat(i,"px ").concat(a,";")].filter(Boolean).join(""),`
  }
  
  .`).concat(Sn,` {
    right: `).concat(i,"px ").concat(a,`;
  }
  
  .`).concat(Cn,` {
    margin-right: `).concat(i,"px ").concat(a,`;
  }
  
  .`).concat(Sn," .").concat(Sn,` {
    right: 0 `).concat(a,`;
  }
  
  .`).concat(Cn," .").concat(Cn,` {
    margin-right: 0 `).concat(a,`;
  }
  
  body[`).concat(Ll,`] {
    `).concat(Gm,": ").concat(i,`px;
  }
`)},kS=function(){var e=parseInt(document.body.getAttribute(Ll)||"0",10);return isFinite(e)?e:0},OA=function(){kl.useEffect(function(){return document.body.setAttribute(Ll,(kS()+1).toString()),function(){var e=kS()-1;e<=0?document.body.removeAttribute(Ll):document.body.setAttribute(Ll,e.toString())}},[])},tg=function(e){var t=e.noRelative,o=e.noImportant,a=e.gapMode,r=a===void 0?"margin":a;OA();var n=kl.useMemo(function(){return eg(r)},[r]);return kl.createElement(MA,{styles:BA(n,!t,r,o?"":"!important")})};var og=!1;if(typeof window<"u")try{ws=Object.defineProperty({},"passive",{get:function(){return og=!0,!0}}),window.addEventListener("test",ws,ws),window.removeEventListener("test",ws,ws)}catch{og=!1}var ws,Ln=og?{passive:!1}:!1;var FA=function(e){return e.tagName==="TEXTAREA"},IS=function(e,t){if(!(e instanceof Element))return!1;var o=window.getComputedStyle(e);return o[t]!=="hidden"&&!(o.overflowY===o.overflowX&&!FA(e)&&o[t]==="visible")},_A=function(e){return IS(e,"overflowY")},HA=function(e){return IS(e,"overflowX")},ag=function(e,t){var o=t.ownerDocument,a=t;do{typeof ShadowRoot<"u"&&a instanceof ShadowRoot&&(a=a.host);var r=RS(e,a);if(r){var n=TS(e,a),l=n[1],i=n[2];if(l>i)return!0}a=a.parentNode}while(a&&a!==o.body);return!1},qA=function(e){var t=e.scrollTop,o=e.scrollHeight,a=e.clientHeight;return[t,o,a]},UA=function(e){var t=e.scrollLeft,o=e.scrollWidth,a=e.clientWidth;return[t,o,a]},RS=function(e,t){return e==="v"?_A(t):HA(t)},TS=function(e,t){return e==="v"?qA(t):UA(t)},zA=function(e,t){return e==="h"&&t==="rtl"?-1:1},PS=function(e,t,o,a,r){var n=zA(e,window.getComputedStyle(t).direction),l=n*a,i=o.target,s=t.contains(i),u=!1,d=l>0,f=0,m=0;do{if(!i)break;var h=TS(e,i),y=h[0],g=h[1],x=h[2],p=g-x-n*y;(y||p)&&RS(e,i)&&(f+=p,m+=y);var c=i.parentNode;i=c&&c.nodeType===Node.DOCUMENT_FRAGMENT_NODE?c.host:c}while(!s&&i!==document.body||s&&(t.contains(i)||t===i));return(d&&(r&&Math.abs(f)<1||!r&&l>f)||!d&&(r&&Math.abs(m)<1||!r&&-l>m))&&(u=!0),u};var qd=function(e){return"changedTouches"in e?[e.changedTouches[0].clientX,e.changedTouches[0].clientY]:[0,0]},ES=function(e){return[e.deltaX,e.deltaY]},AS=function(e){return e&&"current"in e?e.current:e},VA=function(e,t){return e[0]===t[0]&&e[1]===t[1]},WA=function(e){return`
  .block-interactivity-`.concat(e,` {pointer-events: none;}
  .allow-interactivity-`).concat(e,` {pointer-events: all;}
`)},$A=0,Il=[];function DS(e){var t=Xe.useRef([]),o=Xe.useRef([0,0]),a=Xe.useRef(),r=Xe.useState($A++)[0],n=Xe.useState(xs)[0],l=Xe.useRef(e);Xe.useEffect(function(){l.current=e},[e]),Xe.useEffect(function(){if(e.inert){document.body.classList.add("block-interactivity-".concat(r));var g=hS([e.lockRef.current],(e.shards||[]).map(AS),!0).filter(Boolean);return g.forEach(function(x){return x.classList.add("allow-interactivity-".concat(r))}),function(){document.body.classList.remove("block-interactivity-".concat(r)),g.forEach(function(x){return x.classList.remove("allow-interactivity-".concat(r))})}}},[e.inert,e.lockRef.current,e.shards]);var i=Xe.useCallback(function(g,x){if("touches"in g&&g.touches.length===2||g.type==="wheel"&&g.ctrlKey)return!l.current.allowPinchZoom;var p=qd(g),c=o.current,v="deltaX"in g?g.deltaX:c[0]-p[0],w="deltaY"in g?g.deltaY:c[1]-p[1],b,L=g.target,C=Math.abs(v)>Math.abs(w)?"h":"v";if("touches"in g&&C==="h"&&L.type==="range")return!1;var S=window.getSelection(),T=S&&S.anchorNode,P=T?T===L||T.contains(L):!1;if(P)return!1;var q=ag(C,L);if(!q)return!0;if(q?b=C:(b=C==="v"?"h":"v",q=ag(C,L)),!q)return!1;if(!a.current&&"changedTouches"in g&&(v||w)&&(a.current=b),!b)return!0;var M=a.current||b;return PS(M,x,g,M==="h"?v:w,!0)},[]),s=Xe.useCallback(function(g){var x=g;if(!(!Il.length||Il[Il.length-1]!==n)){var p="deltaY"in x?ES(x):qd(x),c=t.current.filter(function(b){return b.name===x.type&&(b.target===x.target||x.target===b.shadowParent)&&VA(b.delta,p)})[0];if(c&&c.should){x.cancelable&&x.preventDefault();return}if(!c){var v=(l.current.shards||[]).map(AS).filter(Boolean).filter(function(b){return b.contains(x.target)}),w=v.length>0?i(x,v[0]):!l.current.noIsolation;w&&x.cancelable&&x.preventDefault()}}},[]),u=Xe.useCallback(function(g,x,p,c){var v={name:g,delta:x,target:p,should:c,shadowParent:GA(p)};t.current.push(v),setTimeout(function(){t.current=t.current.filter(function(w){return w!==v})},1)},[]),d=Xe.useCallback(function(g){o.current=qd(g),a.current=void 0},[]),f=Xe.useCallback(function(g){u(g.type,ES(g),g.target,i(g,e.lockRef.current))},[]),m=Xe.useCallback(function(g){u(g.type,qd(g),g.target,i(g,e.lockRef.current))},[]);Xe.useEffect(function(){return Il.push(n),e.setCallbacks({onScrollCapture:f,onWheelCapture:f,onTouchMoveCapture:m}),document.addEventListener("wheel",s,Ln),document.addEventListener("touchmove",s,Ln),document.addEventListener("touchstart",d,Ln),function(){Il=Il.filter(function(g){return g!==n}),document.removeEventListener("wheel",s,Ln),document.removeEventListener("touchmove",s,Ln),document.removeEventListener("touchstart",d,Ln)}},[]);var h=e.removeScrollBar,y=e.inert;return Xe.createElement(Xe.Fragment,null,y?Xe.createElement(n,{styles:WA(r)}):null,h?Xe.createElement(tg,{noRelative:e.noRelative,gapMode:e.gapMode}):null)}function GA(e){for(var t=null;e!==null;)e instanceof ShadowRoot&&(t=e.host,e=e.host),e=e.parentNode;return t}var NS=Xm(Hd,DS);var MS=Ud.forwardRef(function(e,t){return Ud.createElement(vs,co({},e,{ref:t,sideCar:NS}))});MS.classNames=vs.classNames;var kn=MS;var jA=function(e){if(typeof document>"u")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},Rl=new WeakMap,zd=new WeakMap,Vd={},rg=0,BS=function(e){return e&&(e.host||BS(e.parentNode))},KA=function(e,t){return t.map(function(o){if(e.contains(o))return o;var a=BS(o);return a&&e.contains(a)?a:(console.error("aria-hidden",o,"in not contained inside",e,". Doing nothing"),null)}).filter(function(o){return!!o})},XA=function(e,t,o,a){var r=KA(t,Array.isArray(e)?e:[e]);Vd[o]||(Vd[o]=new WeakMap);var n=Vd[o],l=[],i=new Set,s=new Set(r),u=function(f){!f||i.has(f)||(i.add(f),u(f.parentNode))};r.forEach(u);var d=function(f){!f||s.has(f)||Array.prototype.forEach.call(f.children,function(m){if(i.has(m))d(m);else try{var h=m.getAttribute(a),y=h!==null&&h!=="false",g=(Rl.get(m)||0)+1,x=(n.get(m)||0)+1;Rl.set(m,g),n.set(m,x),l.push(m),g===1&&y&&zd.set(m,!0),x===1&&m.setAttribute(o,"true"),y||m.setAttribute(a,"true")}catch(p){console.error("aria-hidden: cannot operate on ",m,p)}})};return d(t),i.clear(),rg++,function(){l.forEach(function(f){var m=Rl.get(f)-1,h=n.get(f)-1;Rl.set(f,m),n.set(f,h),m||(zd.has(f)||f.removeAttribute(a),zd.delete(f)),h||f.removeAttribute(o)}),rg--,rg||(Rl=new WeakMap,Rl=new WeakMap,zd=new WeakMap,Vd={})}},Tl=function(e,t,o){o===void 0&&(o="data-aria-hidden");var a=Array.from(Array.isArray(e)?e:[e]),r=t||jA(e);return r?(a.push.apply(a,Array.from(r.querySelectorAll("[aria-live], script"))),XA(a,r,o,"aria-hidden")):function(){return null}};var qe=k(H(),1),ng="Dialog",[OS,kH]=dt(ng),[YA,Jo]=OS(ng),FS=e=>{let{__scopeDialog:t,children:o,open:a,defaultOpen:r,onOpenChange:n,modal:l=!0}=e,i=Ye.useRef(null),s=Ye.useRef(null),[u=!1,d]=Et({prop:a,defaultProp:r,onChange:n});return(0,qe.jsx)(YA,{scope:t,triggerRef:i,contentRef:s,contentId:Pt(),titleId:Pt(),descriptionId:Pt(),open:u,onOpenChange:d,onOpenToggle:Ye.useCallback(()=>d(f=>!f),[d]),modal:l,children:o})};FS.displayName=ng;var _S="DialogTrigger",QA=Ye.forwardRef((e,t)=>{let{__scopeDialog:o,...a}=e,r=Jo(_S,o),n=ue(t,r.triggerRef);return(0,qe.jsx)(te.button,{type:"button","aria-haspopup":"dialog","aria-expanded":r.open,"aria-controls":r.contentId,"data-state":sg(r.open),...a,ref:n,onClick:Y(e.onClick,r.onOpenToggle)})});QA.displayName=_S;var lg="DialogPortal",[ZA,HS]=OS(lg,{forceMount:void 0}),qS=e=>{let{__scopeDialog:t,forceMount:o,children:a,container:r}=e,n=Jo(lg,t);return(0,qe.jsx)(ZA,{scope:t,forceMount:o,children:Ye.Children.map(a,l=>(0,qe.jsx)(kt,{present:o||n.open,children:(0,qe.jsx)(Qa,{asChild:!0,container:r,children:l})}))})};qS.displayName=lg;var Wd="DialogOverlay",US=Ye.forwardRef((e,t)=>{let o=HS(Wd,e.__scopeDialog),{forceMount:a=o.forceMount,...r}=e,n=Jo(Wd,e.__scopeDialog);return n.modal?(0,qe.jsx)(kt,{present:a||n.open,children:(0,qe.jsx)(JA,{...r,ref:t})}):null});US.displayName=Wd;var JA=Ye.forwardRef((e,t)=>{let{__scopeDialog:o,...a}=e,r=Jo(Wd,o);return(0,qe.jsx)(kn,{as:so,allowPinchZoom:!0,shards:[r.contentRef],children:(0,qe.jsx)(te.div,{"data-state":sg(r.open),...a,ref:t,style:{pointerEvents:"auto",...a.style}})})}),In="DialogContent",zS=Ye.forwardRef((e,t)=>{let o=HS(In,e.__scopeDialog),{forceMount:a=o.forceMount,...r}=e,n=Jo(In,e.__scopeDialog);return(0,qe.jsx)(kt,{present:a||n.open,children:n.modal?(0,qe.jsx)(eD,{...r,ref:t}):(0,qe.jsx)(tD,{...r,ref:t})})});zS.displayName=In;var eD=Ye.forwardRef((e,t)=>{let o=Jo(In,e.__scopeDialog),a=Ye.useRef(null),r=ue(t,o.contentRef,a);return Ye.useEffect(()=>{let n=a.current;if(n)return Tl(n)},[]),(0,qe.jsx)(VS,{...e,ref:r,trapFocus:o.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:Y(e.onCloseAutoFocus,n=>{n.preventDefault(),o.triggerRef.current?.focus()}),onPointerDownOutside:Y(e.onPointerDownOutside,n=>{let l=n.detail.originalEvent,i=l.button===0&&l.ctrlKey===!0;(l.button===2||i)&&n.preventDefault()}),onFocusOutside:Y(e.onFocusOutside,n=>n.preventDefault())})}),tD=Ye.forwardRef((e,t)=>{let o=Jo(In,e.__scopeDialog),a=Ye.useRef(!1),r=Ye.useRef(!1);return(0,qe.jsx)(VS,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:n=>{e.onCloseAutoFocus?.(n),n.defaultPrevented||(a.current||o.triggerRef.current?.focus(),n.preventDefault()),a.current=!1,r.current=!1},onInteractOutside:n=>{e.onInteractOutside?.(n),n.defaultPrevented||(a.current=!0,n.detail.originalEvent.type==="pointerdown"&&(r.current=!0));let l=n.target;o.triggerRef.current?.contains(l)&&n.preventDefault(),n.detail.originalEvent.type==="focusin"&&r.current&&n.preventDefault()}})}),VS=Ye.forwardRef((e,t)=>{let{__scopeDialog:o,trapFocus:a,onOpenAutoFocus:r,onCloseAutoFocus:n,...l}=e,i=Jo(In,o),s=Ye.useRef(null),u=ue(t,s);return Cl(),(0,qe.jsxs)(qe.Fragment,{children:[(0,qe.jsx)(bn,{asChild:!0,loop:!0,trapped:a,onMountAutoFocus:r,onUnmountAutoFocus:n,children:(0,qe.jsx)(Fr,{role:"dialog",id:i.contentId,"aria-describedby":i.descriptionId,"aria-labelledby":i.titleId,"data-state":sg(i.open),...l,ref:u,onDismiss:()=>i.onOpenChange(!1)})}),(0,qe.jsxs)(qe.Fragment,{children:[(0,qe.jsx)(lD,{contentRef:s,descriptionId:i.descriptionId})]})]})}),ig="DialogTitle",WS=Ye.forwardRef((e,t)=>{let{__scopeDialog:o,...a}=e,r=Jo(ig,o);return(0,qe.jsx)(te.h2,{id:r.titleId,...a,ref:t})});WS.displayName=ig;var $S="DialogDescription",oD=Ye.forwardRef((e,t)=>{let{__scopeDialog:o,...a}=e,r=Jo($S,o);return(0,qe.jsx)(te.p,{id:r.descriptionId,...a,ref:t})});oD.displayName=$S;var GS="DialogClose",jS=Ye.forwardRef((e,t)=>{let{__scopeDialog:o,...a}=e,r=Jo(GS,o);return(0,qe.jsx)(te.button,{type:"button",...a,ref:t,onClick:Y(e.onClick,()=>r.onOpenChange(!1))})});jS.displayName=GS;function sg(e){return e?"open":"closed"}var aD="DialogTitleWarning",[IH,rD]=ab(aD,{contentName:In,titleName:ig,docsSlug:"dialog"});var nD="DialogDescriptionWarning",lD=({contentRef:e,descriptionId:t})=>{let a=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${rD(nD).contentName}}.`;return Ye.useEffect(()=>{let r=e.current?.getAttribute("aria-describedby");t&&r&&(document.getElementById(t)||console.warn(a))},[a,e,t]),null},KS=FS;var XS=qS,ug=US,dg=zS,YS=WS;var QS=jS;var ea=k(H()),Ca=KS;var ZS=cg.forwardRef(({className:e,...t},o)=>(0,ea.jsx)(ug,{ref:o,className:K("fixed inset-0 z-50 bg-[rgba(35,31,32,0.55)]",e),...t}));ZS.displayName=ug.displayName;var ta=cg.forwardRef(({className:e,children:t,variant:o="center",hideClose:a=!1,...r},n)=>{let l=xa();return(0,ea.jsxs)(XS,{container:l??void 0,children:[(0,ea.jsx)(ZS,{}),(0,ea.jsxs)(dg,{ref:n,"data-variant":o,className:K("fixed z-50 border border-border bg-card p-4 shadow-lg rounded-md",o==="bottom-sheet"?"inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0 w-full max-w-none rounded-b-none rounded-t-xl max-h-[85dvh] overflow-auto pb-[calc(16px+var(--lintel-safe-bottom))]":"left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[85dvh] overflow-y-auto",e),"aria-describedby":void 0,...r,children:[t,!a&&(0,ea.jsxs)(QS,{className:"absolute right-3 top-3 opacity-70 transition-opacity hover:opacity-100 focus:outline-none",children:[(0,ea.jsx)(Za,{className:"h-4 w-4"}),(0,ea.jsx)("span",{className:"sr-only",children:"Close"})]})]})]})});ta.displayName=dg.displayName;function Pl({className:e,...t}){return(0,ea.jsx)("div",{className:K("flex flex-col gap-1.5",e),...t})}function La({className:e,...t}){return(0,ea.jsx)(YS,{className:K("text-sm font-semibold text-foreground",e),...t})}var JS=k(z());var eC=k(H()),Lo=JS.forwardRef(({className:e,type:t,...o},a)=>(0,eC.jsx)("input",{type:t,className:K("lintel-control flex h-control w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",e),ref:a,...o}));Lo.displayName="Input";var rC=k(z());var tC=k(z(),1);var oC=k(H(),1),sD="Label",aC=tC.forwardRef((e,t)=>(0,oC.jsx)(te.label,{...e,ref:t,onMouseDown:o=>{o.target.closest("button, input, select, textarea")||(e.onMouseDown?.(o),!o.defaultPrevented&&o.detail>1&&o.preventDefault())}}));aC.displayName=sD;var fg=aC;var qr=k(H()),mt=rC.forwardRef(({className:e,required:t,children:o,...a},r)=>(0,qr.jsxs)(fg,{ref:r,className:K("text-[12px] leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",e),...a,children:[o,t&&(0,qr.jsxs)(qr.Fragment,{children:[(0,qr.jsx)("span",{"aria-hidden":"true",className:"ml-0.5 text-destructive",children:"*"}),(0,qr.jsx)("span",{className:"sr-only",children:" (required)"})]})]}));mt.displayName=fg.displayName;var El="rbsRoomImages";function nC(){try{let e=globalThis.chrome;if(e&&e.storage&&e.storage.local&&typeof e.storage.local.get=="function")return e.storage.local}catch{}return null}var ka={};function pg(e){let t=(e||"").trim();return t?/^data:/i.test(t)?t:/^[A-Za-z0-9+/=\s]+$/.test(t)?`data:image/png;base64,${t}`:"":""}function dD(){let e={};try{document.querySelectorAll("[data-rsrcid][data-imgpath]").forEach(o=>{let a=o,r=(a.getAttribute("data-rsrcid")||"").trim();if(!r)return;let n=(a.getAttribute("data-imgpath")||"").trim();n&&(e[r]=n)})}catch{}return e}function cD(){return!!globalThis.chrome?.runtime?.lastError}function lC(e){let t={};if(!Array.isArray(e))return t;for(let o of e){let a=o??{},r=typeof a.RSRC_ID=="string"?a.RSRC_ID.trim():"",n=typeof a.IMG_PHT=="string"?a.IMG_PHT.trim():"";r&&pg(n)&&(t[r]=n)}return t}function Al(){let e=nC();return e?new Promise(t=>{try{e.get([El],o=>{let a=o&&o[El];t(a&&typeof a=="object"?{...a}:{})})}catch{t({...ka})}}):Promise.resolve({...ka})}function $d(e){let t=e||{},o=nC();return o?new Promise(a=>{try{o.get([El],r=>{let l={...r&&r[El]||{},...t};try{o.set({[El]:l},()=>{if(!cD()){a(l);return}o.set({[El]:t},()=>a(t))})}catch{ka={...ka,...t},a(l)}})}catch{ka={...ka,...t},a({...ka})}}):(ka={...ka,...t},Promise.resolve({...ka}))}async function iC(){let e=dD(),t=Object.keys(e).length?await $d(e):await Al();return gg(t)}function sC(e,t){let o=(t||"").trim();if(!o)return"";let a=(e||{})[o];return a?pg(a):""}async function mg(e,t){let o=(e||"").trim(),a=(t||"").trim();if(!o||!a)return;let r=await Al(),n=r[a];!n||r[o]||await $d({[o]:n})}function gg(e){let t={};for(let o of Object.keys(e||{})){let a=pg(e[o]);a&&(t[o]=a)}return t}function uC(e){return Array.isArray(e)?e.map(t=>({value:String(t?.RSRC_TYP_ID??""),text:String(t?.RSRC_TYP_NAME??"").trim()})).filter(t=>t.value&&t.text):[]}function dC(e){return Array.isArray(e)?e.map(t=>({value:String(t?.LOCATION_ID??""),text:String(t?.LOCATION??"").trim()})).filter(t=>t.value&&t.text).sort((t,o)=>t.text.localeCompare(o.text)):[]}function cC(e){let t=new Map;for(let o of e){let a=o??{};t.set(String(a.RSRC_ID??""),{isIn4sit:a.IS_IN4SIT===!0,isSupt:a.IS_SUPT===!0,isApprvl:a.IS_APPRVL===!0})}return t}var Qe=globalThis,jd=Qe.RBS_ENDPOINTS??{searchList:"/SRB001/SearchSRB001List",slotList:"/SRB001/GetTimeSlotListByresidNdatetime"},$t={start:"07:00",end:"22:30"};function Ur(e){if(typeof Qe.timeToMinutes=="function")return Qe.timeToMinutes(e);let t=/^(\d{1,2}):(\d{2})$/.exec((e||"").trim());return t?Number(t[1])*60+Number(t[2]):NaN}function pC(e,t){if(typeof Qe.buildSlotAxis=="function")return Qe.buildSlotAxis(e,t);let o=Ur(e),a=Ur(t),r=[];for(let n=o;n<=a-60;n+=30)r.push(`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`);return r}function xg(e){return Array.isArray(e)?e.map(t=>({label:t,isHourStart:/:00$/.test(t),blockEnd:/:30$/.test(t)})):[]}function mC(e,t){if(typeof Qe.alignSlots=="function")return Qe.alignSlots(e,t);let o=new Map;for(let a of t||[])a&&!o.has(a.time)&&o.set(a.time,a);return e.map(a=>o.has(a)?o.get(a):null)}function ys(e,t,o,a){return typeof Qe.slotCacheKey=="function"?Qe.slotCacheKey(e,t,o,a):`${e}|${t}|${o?`${o.start}-${o.end}`:""}|${a}`}function gC(e,t,o){return Qe.rangeToWindow?Qe.rangeToWindow(e,t,o):{start:e[t]??"",end:e[o]??"",count:Math.abs(o-t)+1}}function hC(e,t,o){return Qe.rangeHasConflict?Qe.rangeHasConflict(e,t,o):!1}function vC(e,t){return Qe.keyToAction?Qe.keyToAction(e,t):null}function Ia(){let e=document.querySelector("input[name=__RequestVerificationToken]");return e&&e.value||""}function fD(e){let t=document.getElementById(e);return t&&t.value||""}var Se=class extends Error{constructor(t,o,a=!1){super(t),this.name="ApiError",this.httpStatus=o,this.sessionExpired=a}};function Dl(e){return e?!!(/^\s*<(!doctype|html)/i.test(e)||/Session\s*Timeout\/Error!/i.test(e)||/sessiontimeout/i.test(e)):!1}function wg(e){return e?!!(/Session\s*Timeout\/Error!/i.test(e)||/sessiontimeout/i.test(e)):!1}var zr=2e4;async function Vr(e,t){let o,a=typeof AbortController<"u"?new AbortController:null,r=a?setTimeout(()=>a.abort(),zr):null;try{o=await fetch(e,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","X-Requested-With":"XMLHttpRequest"},body:Qe.encodeForm?Qe.encodeForm(t):new URLSearchParams(t).toString(),signal:a?a.signal:void 0})}catch{throw a&&a.signal.aborted?new Se(`RBS did not respond within ${Math.round(zr/1e3)}s. The request to ${e} timed out.`,0):new Se("network error contacting RBS",0)}finally{r&&clearTimeout(r)}if(!o.ok)throw new Se(`the RBS API returned an error (HTTP ${o.status})`,o.status);let n=await o.text();try{return JSON.parse(n)}catch{throw Dl(n)?new Se("Your SIT session has expired, so RBS returned its sign-in page instead of data.",o.status,!0):new Se("the RBS API returned an error (unparseable JSON)",o.status)}}async function yg(e){let t=await bg(e);await $d(lC(t));let o=Qe.parseRooms?Qe.parseRooms(t):[];if(e.category!=="equipment")return o;let a=cC(t);return o.map(r=>({...r,equipment:!0,checks:a.get(r.id)}))}async function xC(){return uC(await Vr("/SRB001/GetResourceTypeNameListForBooking",{__RequestVerificationToken:Ia(),RSRC_CAT:"2"}))}async function wC(e){return dC(await Vr("/SRB001/GetLocationListFilter",{__RequestVerificationToken:Ia(),faciEquip:"equipments",resourceTypeID:e}))}async function bg(e){let t=e.minCapacity>0?String(e.minCapacity):"",o=e.category==="equipment",a=Qe.buildSearchPayload({token:Ia(),capacityOperator:"<",minCapacity:t,maxCapacity:"",singleCapacity:"",campusID:fD(gt.campus),buildingID:e.building?String(e.building):"",facilities:o?"equipments":"facilities",status:"All",search:e.search?String(e.search):"",resourceType:e.roomType?String(e.roomType):"",date:e.date,start:"07:00",end:"22:00"});pD(e.building??"");let r=await Vr(jd.searchList,o?{...a,Location:e.location??""}:a);return Array.isArray(r)?r:[]}function pD(e){try{let t=document.getElementById(gt.building);if(!t)return;let o=e||"";if(t.value===o)return;Array.from(t.options).some(r=>r.value===o)&&(t.value=o,t.dispatchEvent(new Event("change",{bubbles:!0})))}catch{}}async function bs(e,t){let o=Qe.buildSlotPayload(e,t,$t,"All",Ia()),a=await Vr(jd.slotList,o);return Array.isArray(a)?a:[]}var mD="/DHB002/GetCalenderData";async function gD(e,t){let a=await Vr(mD,{__RequestVerificationToken:Ia(),faciequip:"facilities",SearchDate:t,EndDate:t,ResourceType:e,ParentResourceID:"",search:"",searchrsrcid:""})??{};return{resultData:Array.isArray(a.resultData)?a.resultData:[],resultSltData:Array.isArray(a.resultSltData)?a.resultSltData:[]}}function yC(e,t){return gD(e,t)}function hD(e){return e===1?"free":e===3?"taken":e===7||e===8?"closed":"unknown"}function bC(e){return String(e??"").replace(/\s+/g," ").trim()}function vD(e){let t=bC(e.SLT_Desc);if(!/^\d{2}:\d{2}$/.test(t)){let o=String(e.SLT_Time==null?"":e.SLT_Time).padStart(4,"0");t=o.slice(0,2)+":"+o.slice(2)}return t}function Ss(e){let t=typeof e=="string"?JSON.parse(e):e;return Array.isArray(t)?t.map(o=>{let a=o??{},r=Number(a.SLT_STATUS),n={time:vD(a),status:r,state:hD(r),sltId:String(a.SLT_ID==null?"":a.SLT_ID),dateTime:String(a.SLT_Date_Time==null?"":a.SLT_Date_Time),quota:Number(a.Quota)||0},l=bC(a.SLT_CRTD_BY_NAME);return l&&(n.booker=l),n}):[]}var Cs={permission:"/SRB001/GetPermissionByIDs",bookingPeriod:"/SRB001/CheckBookingPeriondNWindow",checkRule:"/SRB001/CheckSingleBookingRule",confirmation:"/SRB001/NormalBookingConfirmation",saving:"/SRB001/BookingSaving"};async function Ls(e,t){return Vr(e,{...t,__RequestVerificationToken:Ia()})}function Kd(e){return Ls(Cs.permission,e)}function Xd(e){return Ls(Cs.bookingPeriod,e)}function Yd(e){return Ls(Cs.checkRule,e)}function Qd(e){return Ls(Cs.confirmation,e)}function Zd(e){return Ls(Cs.saving,e)}var Gd={cancelInfo:"/DHB001/BookingCancel",saveToCancel:"/DHB001/SaveToCancel"},fC="/common/EncryptDecryptFunc";async function SC(e){let t={_isEncrypt:"true",_encryptData:e,_decryptData:"",__RequestVerificationToken:Ia()},o,a=typeof AbortController<"u"?new AbortController:null,r=a?setTimeout(()=>a.abort(),zr):null;try{o=await fetch(fC,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","X-Requested-With":"XMLHttpRequest"},body:new URLSearchParams(t).toString(),signal:a?a.signal:void 0})}catch{throw a&&a.signal.aborted?new Se(`RBS did not respond within ${Math.round(zr/1e3)}s. The request to ${fC} timed out.`,0):new Se("network error contacting RBS",0)}finally{r&&clearTimeout(r)}if(!o.ok)throw new Se(`the RBS API returned an error (HTTP ${o.status})`,o.status);let n=await o.text();if(Dl(n))throw new Se("Your SIT session has expired, so RBS returned its sign-in page instead of the booking id.",o.status,!0);let l=n.trim();if(l==="")throw new Se("RBS returned an empty encrypted id.",o.status);return l}async function CC(e){let t=`${Gd.cancelInfo}?BKG_ID=${encodeURIComponent(e)}&backOptionValue=1`,o,a=typeof AbortController<"u"?new AbortController:null,r=a?setTimeout(()=>a.abort(),zr):null;try{o=await fetch(t,{method:"GET",credentials:"same-origin",cache:"no-store",headers:{"X-Requested-With":"XMLHttpRequest"},signal:a?a.signal:void 0})}catch{throw a&&a.signal.aborted?new Se(`RBS did not respond within ${Math.round(zr/1e3)}s. The request to ${Gd.cancelInfo} timed out.`,0):new Se("network error contacting RBS",0)}finally{r&&clearTimeout(r)}if(!o.ok)throw new Se(`the RBS API returned an error (HTTP ${o.status})`,o.status);let n=await o.text();if(wg(n))throw new Se("Your SIT session has expired, so RBS returned its sign-in page instead of the cancel info.",o.status,!0);return n}async function LC(e){e.set("__RequestVerificationToken",Ia());let t,o=typeof AbortController<"u"?new AbortController:null,a=o?setTimeout(()=>o.abort(),zr):null;try{t=await fetch(Gd.saveToCancel,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","X-Requested-With":"XMLHttpRequest"},body:e.toString(),signal:o?o.signal:void 0})}catch{throw o&&o.signal.aborted?new Se(`RBS did not respond within ${Math.round(zr/1e3)}s. The request to ${Gd.saveToCancel} timed out.`,0):new Se("network error contacting RBS",0)}finally{a&&clearTimeout(a)}if(!t.ok)throw new Se(`the RBS API returned an error (HTTP ${t.status})`,t.status);let r=await t.text();if(Dl(r))throw new Se("Your SIT session has expired, so the cancellation did not go through.",t.status,!0);let n=r.trim(),l=n==='"1"'||n==="1";return{ok:l,confirmed:l,raw:r}}var kC={quota:"/MQT001/GetResourceTypeQuotaList",details:"/MQT001/ResourceQuotaList"},IC=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function Wr(e){let t=String(e.getDate()).padStart(2,"0"),o=IC[e.getMonth()]??"";return`${t} ${o} ${e.getFullYear()}`}function RC(e,t=new Date){let o=/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec((e||"").trim());if(!o)return!1;let a=Number(o[1]),r=IC.indexOf(o[2]),n=Number(o[3]);return r<0?!1:a===t.getDate()&&r===t.getMonth()&&n===t.getFullYear()}function TC(e,t){return{__RequestVerificationToken:t,resourceTypeCategory:e.resourceTypeCategory||"",resourceType:e.resourceType||"",searchDate:e.searchDate||""}}async function PC(e){let o=(await Vr(kC.quota,TC(e,Ia()))).data;return Array.isArray(o)?o:[]}async function EC(e){let o=(await Vr(kC.details,TC(e,Ia()))).data;return Array.isArray(o)?o:[]}function Sg(e){if(typeof Qe.createSlotQueue!="function")throw new Error("createSlotQueue is not available (content/native.js not injected)");return Qe.createSlotQueue(e)}var hg="rbs-native-hide-lintel",vg="sit-lintel-host";function AC(){try{let e=(location.pathname||"").toLowerCase();if(e.indexOf("/home/errorpage")!==-1||e.indexOf("/account/login")!==-1)return!0;let t=(location.search||"").toLowerCase();if(/[?&]code=/.test(t)&&/[?&]exceptionmsg=/.test(t))return!0;let o=document.body&&document.body.textContent||"";if(/Session\s*Timeout\/Error!/i.test(o)||/sessiontimeout/i.test(o))return!0}catch{}return!1}function DC(){try{if(document.documentElement.classList.add("rbsx-native-hidden"),document.getElementById(hg))return;let e=Qe.NATIVE_HIDE_SELECTORS??["header","nav","footer",".body-content","#divRoomInfo","#divSearchContentResult","#divbtnbottom"],t=[];for(let a of e)t.push(`html.rbsx-native-hidden ${a} { display: none !important; }`);t.push(`html.rbsx-native-hidden body > :not(#${vg}) { display: none !important; }`,`html.rbsx-native-hidden #${vg} { position: fixed !important; inset: 0 !important; z-index: 2147483000 !important; display: block !important; background: #0b0c0e !important; overflow: auto !important; }`,"html.rbsx-native-hidden, html.rbsx-native-hidden body { overflow: hidden !important; margin: 0 !important; }");let o=document.createElement("style");o.id=hg,o.textContent=t.join(`
`),document.head.appendChild(o)}catch{}}function tr(){let e=document.getElementById(hg);e&&e.remove(),document.documentElement.classList.remove("rbsx-native-hidden")}function xD(){let e=Array.from(document.querySelectorAll("#btnLogout"));return e.length===0?null:e.find(o=>o.offsetWidth>0||o.offsetHeight>0||o.getClientRects().length>0)??e[0]}function NC(){wD();let e=xD();return e?(Qe.FORBIDDEN_CLICK_IDS??[]).some(o=>e.id===o||!!e.closest("#"+o))?{found:!1,reason:"refused-forbidden-target"}:(e.scrollIntoView({behavior:"smooth",block:"center"}),e.click(),{found:!0}):{found:!1,reason:"no-logout-button"}}function wD(){tr();let e=document.getElementById(vg);e&&(e.style.display="none")}function Nl(){return globalThis.__rbsBridge}var gt=globalThis.RBS_CONTROL_IDS??{resourceType:"resourceType",date:"searchSlotDate",start:"SearchHoursFrom",end:"SearchHoursTo",status:"bookingstatus",capacity:"srcCapacity",building:"building",campus:"campus",searchButton:"btnBookingMainSearch"},Ml=globalThis.DEFAULT_WINDOW??{start:"07:00",end:"22:30"};function MC(e=14){let t=globalThis.buildDateChips,o=new Date;if(typeof t=="function")return t(o,e);let a=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],r=["S","M","T","W","T","F","S"];return Array.from({length:e},(n,l)=>{let i=new Date(o.getFullYear(),o.getMonth(),o.getDate()+l);return{date:i,label:`${i.getDate()} ${a[i.getMonth()]} ${i.getFullYear()}`,weekday:r[i.getDay()],isToday:l===0}})}var Cg="no longer needed";function BC(e){let t=new URLSearchParams;t.set("__RequestVerificationToken",e.token);for(let o of e.encryptedIds)t.append("bookID[]",o);return t.set("reason",e.reason),t}var yD=6,Bl=5;function OC(e){if(!Array.isArray(e))return null;let t=e[yD];return typeof t=="string"&&t.trim()!==""?t.trim():null}function FC(e,t){return!(t==="past"||/^\s*cancelled/i.test(e||""))}function bD(e){return new DOMParser().parseFromString(e,"text/html")}function Lg(e){return(e||"").replace(/\s+/g," ").trim()}function _C(e,t=bD){let o=typeof e=="string"?e:"",a={fields:[],raw:o};if(o.trim()==="")return a;let r;try{r=t(o)}catch{return a}if(!r)return a;let n=r.getElementById("content");if(!n)return a;let l=n.querySelector(".card-header h3")||n.querySelector("h3"),i=l&&Lg(l.textContent)||void 0,s=[],u=Array.from(n.querySelectorAll("span")),d=new Set;for(let f=0;f<u.length;f++){let m=u[f];if(d.has(m))continue;let h=Lg(m.textContent);if(!h.endsWith(":"))continue;let y=h.slice(0,-1).trim();if(y==="")continue;let g="";for(let x=f+1;x<u.length;x++){let p=u[x];if(d.has(p))continue;let c=p.getAttribute&&p.getAttribute("class");if(!(typeof c=="string"&&/\bfont-weight-bold\b/.test(c)))continue;let w=Lg(p.textContent);if(w.endsWith(":"))break;g=w,d.add(p);break}s.push({label:y,value:g})}return{title:i,fields:s,raw:o}}var We=k(H());function HC({encryptedId:e,roomLabel:t,open:o,onOpenChange:a,onCancelled:r}){let[n,l]=ko.useState(""),[i,s]=ko.useState(!1),[u,d]=ko.useState(!1),[f,m]=ko.useState(!1),[h,y]=ko.useState(null),[g,x]=ko.useState({kind:"loading"});ko.useEffect(()=>{if(!o||!e)return;let w=!1;return l(""),s(!1),d(!1),m(!1),y(null),x({kind:"loading"}),CC(e).then(b=>{w||x({kind:"ready",parsed:_C(b)})}).catch(b=>{w||x({kind:"error",message:b instanceof Error?b.message:String(b)})}),()=>{w=!0}},[o,e]);let p=n.trim()||Cg,c=!!e&&!i&&!u,v=ko.useCallback(()=>{if(!e||i||u)return;s(!0),y(null);let w=BC({token:"",encryptedIds:[e],reason:p});LC(w).then(b=>{m(b.confirmed),d(!0),r(b.raw,b.confirmed)}).catch(b=>{y(b instanceof Error?b.message:String(b))}).finally(()=>s(!1))},[e,i,u,p,r]);return e?(0,We.jsx)(Ca,{open:o,onOpenChange:a,children:(0,We.jsxs)(ta,{"data-testid":"lintel-cancel-dialog",children:[(0,We.jsx)(Pl,{children:(0,We.jsx)(La,{children:"Cancel booking"})}),(0,We.jsxs)("div",{className:"mt-2 flex flex-col gap-3",children:[t&&(0,We.jsx)("div",{className:"lintel-mono text-[13px] font-medium text-foreground",children:t}),(0,We.jsxs)("div",{className:"rounded-md border border-border bg-secondary p-2",children:[g.kind==="loading"&&(0,We.jsx)("div",{className:"text-[12px] text-muted-foreground","data-testid":"lintel-cancel-info-loading",children:"Loading cancellation details\u2026"}),g.kind==="error"&&(0,We.jsxs)("div",{className:"text-[12px] text-destructive","data-testid":"lintel-cancel-info-error",children:["Could not load cancellation details (",g.message,")."]}),g.kind==="ready"&&g.parsed.fields.length>0&&(0,We.jsx)("dl",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]","data-testid":"lintel-cancel-info",children:g.parsed.fields.map((w,b)=>(0,We.jsxs)(ko.Fragment,{children:[(0,We.jsx)("dt",{className:"text-muted-foreground",children:w.label}),(0,We.jsx)("dd",{className:"font-medium text-foreground",children:w.value||"-"})]},`${w.label}-${b}`))}),g.kind==="ready"&&g.parsed.fields.length===0&&(0,We.jsx)("div",{className:"text-[12px] text-muted-foreground","data-testid":"lintel-cancel-info-empty",children:"Couldn't read the booking details, but you can still cancel below."})]}),(0,We.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,We.jsx)(mt,{htmlFor:"lintel-cancel-reason",children:"Reason for cancellation"}),(0,We.jsx)(Lo,{id:"lintel-cancel-reason",type:"text",placeholder:Cg,value:n,onChange:w=>l(w.target.value),"data-testid":"lintel-cancel-reason",disabled:i||u})]}),h&&(0,We.jsx)("div",{className:"rounded-md border border-destructive/50 p-2 text-[12px] text-destructive","data-testid":"lintel-cancel-error",role:"alert",children:h}),u&&(0,We.jsxs)("div",{className:"rounded-md border border-border p-2 text-[12px]","data-testid":"lintel-cancel-done",children:[(0,We.jsx)("div",{className:"font-semibold text-foreground",children:f?"Cancellation successful":"Cancellation request sent. Your bookings will refresh to confirm the result."}),(0,We.jsx)("p",{className:"mt-0.5 text-[12px] text-muted-foreground",children:"Your bookings have been refreshed to reflect the result."})]}),(0,We.jsxs)("div",{className:"mt-1 flex justify-end gap-2",children:[(0,We.jsx)(ee,{variant:"outline",onClick:()=>a(!1),"data-testid":"lintel-cancel-close",children:u?"Done":"Keep booking"}),!u&&(0,We.jsx)(ee,{className:"bg-destructive text-destructive-foreground hover:bg-destructive/90",onClick:v,disabled:!c,"aria-disabled":!c,"data-testid":"lintel-cancel-confirm","aria-busy":i||void 0,children:i?"Cancelling\u2026":"Cancel booking"})]})]})]})}):null}var zo=k(z());var qC=k(ga());var fo=k(H());function SD(e,t,o,a){let r=window.innerWidth||document.documentElement.clientWidth,n=window.innerHeight||document.documentElement.clientHeight,l=8,i=e+14,s=t+14;return i+o+l>r&&(i=Math.max(l,e-o-14)),s+a+l>n&&(s=Math.max(l,n-a-l)),{left:i,top:s}}var CD="/Image/Facility.jpg",LD="/Image/Equipment.jpg";function ks({src:e,roomCode:t,equipment:o}){let a=o?LD:CD,r=xa(),[n,l]=zo.useState(!1),[i,s]=zo.useState(!1),[u,d]=zo.useState({left:0,top:0}),f=zo.useRef(null),m=220,h=220,y=zo.useCallback((v,w)=>{d(SD(v,w,m,h))},[]),g=zo.useCallback((v,w)=>{y(v,w),l(!0)},[y]),x=zo.useCallback(()=>l(!1),[]);zo.useEffect(()=>{if(!n)return;let v=w=>{w.key==="Escape"&&x()};return window.addEventListener("keydown",v),()=>window.removeEventListener("keydown",v)},[n,x]);let p=!!e,c={onMouseEnter:v=>g(v.clientX,v.clientY),onMouseMove:v=>n&&y(v.clientX,v.clientY),onMouseLeave:x,onFocus:()=>{let v=f.current?.getBoundingClientRect();v&&g(v.right,v.bottom)},onBlur:x};return(0,fo.jsxs)(fo.Fragment,{children:[(0,fo.jsx)("span",{ref:f,"data-testid":"lintel-room-thumb","data-has-photo":p?"1":"0",tabIndex:0,role:"button","aria-label":p?`Preview photo of ${t}`:`No photo for ${t}`,className:"lintel-thumb",...c,children:p?(0,fo.jsx)("img",{className:"lintel-thumb-img",src:e,alt:`${t} room photo`,draggable:!1,"data-testid":"lintel-room-thumb-img"}):i?(0,fo.jsx)("span",{className:"lintel-thumb-placeholder","aria-hidden":!0,"data-testid":"lintel-room-thumb-placeholder",children:(0,fo.jsx)(Sl,{className:"lintel-thumb-placeholder-glyph"})}):(0,fo.jsx)("img",{className:"lintel-thumb-img",src:a,alt:`${t} room photo`,draggable:!1,onError:()=>s(!0),"data-testid":"lintel-room-thumb-img"})}),n&&r?(0,qC.createPortal)((0,fo.jsx)("div",{className:"lintel-thumb-preview","data-testid":"lintel-thumb-preview",role:"img","aria-label":p?`${t} room photo, enlarged`:`${t} has no photo`,style:{left:u.left,top:u.top,width:m},children:p?(0,fo.jsx)("img",{className:"lintel-thumb-preview-img",src:e,alt:"",draggable:!1}):i?(0,fo.jsx)(Sl,{className:"lintel-thumb-preview-glyph",strokeWidth:1}):(0,fo.jsx)("img",{className:"lintel-thumb-preview-img",src:a,alt:"",draggable:!1,onError:()=>s(!0)})}),r):null]})}var kD=new Set(["SCRIPT","STYLE","IFRAME","LINK","OBJECT","EMBED","NOSCRIPT","META","BASE"]),ID=new Set(["DIV","SECTION","ARTICLE","MAIN","HEADER","FOOTER","ASIDE","H1","H2","H3","H4","H5","H6","P","SPAN","STRONG","EM","B","I","U","SMALL","CODE","PRE","BLOCKQUOTE","SUP","SUB","UL","OL","LI","DL","DT","DD","TABLE","THEAD","TBODY","TFOOT","TR","TH","TD","CAPTION","A","BR","HR","FIGURE","FIGCAPTION"]);function UC(e){let t=(e||"").trim();if(!t)return;if(t.startsWith("/")&&!t.startsWith("//"))return t;let o=t.toLowerCase();if(o.startsWith("http:")||o.startsWith("https:")||o.startsWith("mailto:"))return t}function RD(e){let t=(e||"").trim();if(t.length<4)return"";let o=parseInt(t.substr(0,2),16),a="";for(let r=2;r<t.length;r+=2)a+=String.fromCharCode(parseInt(t.substr(r,2),16)^o);return a}function TD(e){let t="",o=e;if(o.classList&&o.classList.contains("__cf_email__")&&(t=e.getAttribute("data-cfemail")||""),!t){let r=e.querySelector(".__cf_email__[data-cfemail]");r&&(t=r.getAttribute("data-cfemail")||"")}if(!t&&e.tagName.toUpperCase()==="A"){let r=e.getAttribute("href")||"",n=/\/cdn-cgi\/l\/email-protection#([0-9a-fA-F]+)/.exec(r);n&&(t=n[1])}if(!t)return null;let a=RD(t);return!a||a.indexOf("@")===-1?null:{type:"element",tag:"a",href:`mailto:${a}`,rel:"noopener noreferrer",children:[{type:"text",text:a}]}}function PD(e){let t=(e.getAttribute("style")||"").toLowerCase();return/position\s*:\s*(absolute|fixed|sticky)/.test(t)}function kg(e){if(e.nodeType===3){let n=e.nodeValue||"";return n.trim()===""&&!/\s/.test(n)?null:{type:"text",text:n}}if(e.nodeType!==1)return null;let t=e,o=t.tagName.toUpperCase();if(kD.has(o)||PD(t))return null;let a=TD(t);if(a)return a;let r=[];if(t.childNodes.forEach(n=>{let l=kg(n);l&&r.push(l)}),t.querySelector(".__cf_email__[data-cfemail]")){let n=r.filter(l=>l.type==="element"&&l.tag==="a"&&(l.href||"").startsWith("mailto:"));n.length&&(r=n)}if(o==="A"){let n=t.getAttribute("href"),l=UC(n);if(!l)return r.length===0?null:r.length===1?r[0]:{type:"element",tag:"div",children:r};let i=t.getAttribute("target")==="_blank"?"_blank":void 0;return{type:"element",tag:"a",href:l,target:i,rel:"noopener noreferrer",children:r}}return ID.has(o)?{type:"element",tag:o.toLowerCase(),children:r}:r.length===0?null:r.length===1?r[0]:{type:"element",tag:"div",children:r}}function zC(e){let t=e.querySelector("main");if(t)return t;let o=e.getElementById("content");if(o)return o;let a=e.body;if(!a)return null;let r=a,n=(a.textContent||"").length;return a.querySelectorAll("div, section, article").forEach(l=>{let i=(l.textContent||"").length;i>n*.6&&l.children.length>=1&&i<=n&&i>(r===a?0:n)&&(r=l,n=i)}),r}async function Ig(e){let t=await fetch(e,{credentials:"same-origin",cache:"no-store"});if(!t.ok)throw new Error(`fetch failed (HTTP ${t.status})`);let o=await t.text(),a=new DOMParser().parseFromString(o,"text/html"),r=zC(a);if(!r)throw new Error("no content container found");let n=(a.querySelector("title")?.textContent||"").trim(),l=[];if(r.childNodes.forEach(i=>{let s=kg(i);s&&l.push(s)}),l.length===0)throw new Error("content was empty after sanitising");return{title:n,nodes:l}}function ED(e){let t=e.filter(o=>o.type==="element"&&o.tag==="li");return t.length===0||t.length!==e.length?e:t.length===1?[{type:"element",tag:"p",children:t[0].children}]:[{type:"element",tag:"ul",children:t}]}async function VC(e){let t=await fetch(e,{credentials:"same-origin",cache:"no-store"});if(!t.ok)throw new Error(`fetch failed (HTTP ${t.status})`);let o=await t.text(),a=new DOMParser().parseFromString(o,"text/html"),r=zC(a);if(!r)throw new Error("no content container found");let n=Array.from(r.querySelectorAll("ol")),l=s=>!!s.querySelector(":scope > li > b")&&!s.querySelector(":scope > ol"),i=[];for(let s=0;s<n.length;s++){let u=n[s];if(!l(u))continue;let d=(u.textContent||"").replace(/\s+/g," ").trim();if(!d)continue;let f=[];for(let m=s+1;m<n.length;m++){let h=n[m];if(l(h))break;if(u.contains(h))continue;let g=Array.from(h.querySelectorAll("li")).map(x=>kg(x)).filter(x=>x!==null);f=ED(g),s=m;break}i.push({question:d,answer:f})}if(i.length===0)throw new Error("no FAQ items found after parsing");return i}async function WC(e){let t=await fetch(e,{credentials:"same-origin",cache:"no-store"});if(!t.ok)throw new Error(`fetch failed (HTTP ${t.status})`);let o=await t.text();if(wg(o))throw new Se("Your SIT session has expired, so RBS returned its sign-in page instead of your reservations.",t.status,!0);let r=new DOMParser().parseFromString(o,"text/html").getElementById("bookingList");if(!r)return[];let n=[];return r.querySelectorAll("tr[data-booking-id]").forEach(l=>{let i=Array.from(l.querySelectorAll("td")).map(s=>(s.textContent||"").trim());i.length<4||n.push({id:l.getAttribute("data-booking-id")||"",room:i[0],date:i[1],time:i[2],status:i[3]})}),n}function AD(){let e=document.querySelector("input[name=__RequestVerificationToken]");return e&&e.value||""}async function $C(e){let t=new URLSearchParams({__RequestVerificationToken:AD(),bookingStatus:e.bookingStatus,resourceCategoryID:String(e.resourceCategoryID),resourceName:""}).toString(),o;try{o=await fetch("/DHB001/GetDashBoardDataByStatus",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","X-Requested-With":"XMLHttpRequest"},body:t})}catch{throw new Error("network error contacting RBS")}if(!o.ok)throw new Error(`the RBS API returned an error (HTTP ${o.status})`);let a=await o.text();if(Dl(a))throw new Se("Your SIT session has expired, so RBS returned its sign-in page instead of your bookings.",o.status,!0);let r;try{r=JSON.parse(a)}catch{throw new Error("the RBS API returned an error (unparseable JSON)")}let n=r.data;return{rows:Array.isArray(n)?n:[]}}async function GC(){let e;try{e=await fetch("/DHB001/BookingSupportReload",{method:"GET",credentials:"same-origin",cache:"no-store",headers:{"X-Requested-With":"XMLHttpRequest"}})}catch{throw new Error("network error contacting RBS")}if(!e.ok)throw new Error(`fetch failed (HTTP ${e.status})`);let t=await e.text();if(Dl(t))throw new Se("Your SIT session has expired, so RBS returned its sign-in page instead of your credits.",e.status,!0);let o=new DOMParser().parseFromString(t,"text/html"),a=[];o.querySelectorAll(".card-body .row").forEach(s=>{if(s.closest("#bookingsupportdata")||s.classList.contains("supporter-request-container"))return;let u=s.querySelector(".font-weight-bold");if(!u)return;let d=(u.textContent||"").replace(/\s+/g," ").trim(),f="";s.querySelectorAll("div").forEach(m=>{if(m===u||m.classList.contains("font-weight-bold"))return;let h=(m.textContent||"").replace(/\s+/g," ").trim();h&&!f&&(f=h)}),d&&a.push({label:d,detail:f})});let n=(o.querySelector(".supporter-request-num")?.textContent||"").replace(/\s+/g," ").trim(),l,i=Array.from(o.querySelectorAll("a")).find(s=>(s.textContent||"").trim().toLowerCase()==="see more");return i&&(l=UC(i.getAttribute("href"))),{credits:a,supporterRequests:n,seeMoreHref:l}}var Rg="lintel.dashboard.cache.v1";function jC(e,t){return`${e}|${t}`}function Jd(e){if(e===null)return"null";if(Array.isArray(e))return"["+e.map(Jd).join(",")+"]";if(typeof e==="object"){let o=e;return"{"+Object.keys(o).sort().map(r=>JSON.stringify(r)+":"+Jd(o[r])).join(",")+"}"}return JSON.stringify(e)??"undefined"}function KC(e,t){if(e.length!==t.length)return!1;for(let o=0;o<e.length;o++)if(Jd(e[o])!==Jd(t[o]))return!1;return!0}function XC(e,t){if(e.supporterRequests!==t.supporterRequests||e.credits.length!==t.credits.length)return!1;for(let o=0;o<e.credits.length;o++)if(e.credits[o].label!==t.credits[o].label||e.credits[o].detail!==t.credits[o].detail)return!1;return!0}function YC(){return globalThis.chrome?.storage?.local}function DD(e){if(!e||typeof e!="object")return!1;let t=e;return typeof t.label=="string"&&typeof t.detail=="string"}function ND(e){if(!e||typeof e!="object")return!1;let t=e;if(!t.byKey||typeof t.byKey!="object")return!1;for(let o of Object.keys(t.byKey)){let a=t.byKey[o];if(!a||typeof a!="object"||!Array.isArray(a.rows)||typeof a.ts!="number")return!1}if(t.side!==void 0){let o=t.side;if(!o||typeof o!="object"||!Array.isArray(o.credits)||!o.credits.every(DD)||typeof o.supporterRequests!="string"||typeof o.ts!="number")return!1}return!0}function Is(){let e=YC();return e?new Promise(t=>{let o=!1,a=r=>{if(o)return;o=!0;let n=r?r[Rg]:void 0;t(ND(n)?n:null)};try{let r=e.get(Rg,n=>a(n));r&&typeof r.then=="function"&&r.then(a).catch(()=>a(void 0))}catch{a(void 0)}}):Promise.resolve(null)}function Tg(e){let t=YC();if(t)try{let o=t.set({[Rg]:e});o&&typeof o.catch=="function"&&o.catch(()=>{})}catch{}}var Ol=k(z()),$r="/SRB001/SRB001Page",oc="/DHB001/DHB001Page",ec="/SPT001/SPT001Page",ac="/Home/UserGuidePage",Pg="/Home/FAQPage",Eg="/Home/SupportPage",MD="/MQT001/MQT001Page",Ag=[{kind:"dashboard",label:"Dashboard",path:oc},{kind:"search",label:"New Booking",path:$r},{kind:"support-booking",label:"Support Booking",path:ec},{kind:"help",label:"Help",path:ac}];function tc(e,t=""){let o=e+(t||"");return e.indexOf($r)!==-1?{kind:"search",path:e,href:o,title:"Make a New Booking"}:e.indexOf(oc)!==-1?{kind:"dashboard",path:e,href:o,title:"Dashboard"}:e.indexOf(ec)!==-1?{kind:"support-booking",path:e,href:o,title:"Support Booking",missingEndpoint:`the JSON endpoint behind ${ec} is not mapped`}:e.indexOf(ac)!==-1?{kind:"help",path:e,href:o,title:"Help",section:"user-guide"}:e.indexOf(Pg)!==-1?{kind:"help",path:e,href:o,title:"Help",section:"faq"}:e.indexOf(Eg)!==-1?{kind:"help",path:e,href:o,title:"Help",section:"support"}:e.indexOf(MD)!==-1?{kind:"my-credit",path:e,href:o,title:"My Credit"}:{kind:"unmapped",path:e,href:o,title:"Page not mapped",missingEndpoint:`the JSON endpoint behind ${e} is not mapped`}}function QC(){try{return tc(location.pathname,location.search)}catch{return tc($r)}}function ZC(){let[e,t]=Ol.useState(()=>QC());Ol.useEffect(()=>{let a=()=>t(QC());return window.addEventListener("popstate",a),()=>window.removeEventListener("popstate",a)},[]);let o=Ol.useCallback(a=>{try{let r=tc(a);if(r.href===location.pathname+location.search){t(r);return}history.pushState({lintel:!0},"",a),t(tc(location.pathname,location.search))}catch{}},[]);return{route:e,navigate:o}}var eL="lintel.recentSearch.v1";function JC(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function BD(e){if(!JC(e))return null;let{building:t,buildingLabel:o,roomType:a,dateIso:r,dateLabel:n,windowStart:l,windowEnd:i,ts:s}=e;return typeof t!="string"||typeof o!="string"||!JC(a)||typeof a.value!="string"||typeof a.text!="string"||typeof r!="string"||r===""||typeof n!="string"||n===""||typeof l!="string"||typeof i!="string"||typeof s!="number"||!Number.isFinite(s)?null:{building:t,buildingLabel:o,roomType:{value:a.value,text:a.text},dateIso:r,dateLabel:n,windowStart:l,windowEnd:i,ts:s}}function tL(){return globalThis.chrome?.storage?.local}function OD(e){let t=tL();return t?new Promise(o=>{let a=!1,r=n=>{if(a)return;a=!0;let l=n?n[e]:void 0;o(l===void 0?null:l)};try{let n=t.get(e,l=>r(l));n&&typeof n.then=="function"&&n.then(r).catch(()=>r(void 0))}catch{r(void 0)}}):Promise.resolve(null)}function FD(e,t){let o=tL();if(o)try{let a=o.set({[e]:t});a&&typeof a.catch=="function"&&a.catch(()=>{})}catch{}}function oL(){return OD(eL).then(e=>BD(e))}function aL(e){FD(eL,e)}var Dg="lintel.popup.pendingSearch";function rL(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function nL(e,t){if(!rL(e))return null;let{building:o,roomType:a,dateIso:r,windowStart:n,windowEnd:l,ts:i}=e;return typeof o!="string"||!rL(a)||typeof a.value!="string"||typeof a.text!="string"||typeof r!="string"||r===""||typeof n!="string"||typeof l!="string"||typeof i!="number"||!Number.isFinite(i)||i>t||t-i>6e4?null:{building:o,roomType:{value:a.value,text:a.text},dateIso:r,windowStart:n,windowEnd:l,ts:i}}function Ng(){return globalThis.chrome?.storage?.local}function _D(e){let t=Ng();return t?new Promise(o=>{let a=!1,r=n=>{if(a)return;a=!0;let l=n?n[e]:void 0;o(l===void 0?null:l)};try{let n=t.get(e,l=>r(l));n&&typeof n.then=="function"&&n.then(r).catch(()=>r(void 0))}catch{r(void 0)}}):Promise.resolve(null)}function HD(e,t){let o=Ng();if(o)try{let a=o.set({[e]:t});a&&typeof a.catch=="function"&&a.catch(()=>{})}catch{}}function lL(){return _D(Dg)}function iL(){let e=Ng();if(e)try{let t=e.remove(Dg,()=>{});t&&typeof t.catch=="function"&&t.catch(()=>{})}catch{}}function sL(e){HD(Dg,e)}var Mg="lintel.options.cache.v1",qD=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function uL(e,t){if(!e||typeof e!="object")return"";let o=e[t];return o==null?"":String(o).trim()}function dL(e,t,o){let a=new Set,r=[];for(let n of e||[]){let l=uL(n,t),i=uL(n,o);!l||!i||a.has(l)||(a.add(l),r.push({value:l,text:i}))}return r}function cL(e){return{buildings:dL(e,"BLDNG_ID","BLDNG_NAME"),roomTypes:dL(e,"RSRC_TYP_ID","RSRC_TYP_NAME")}}function fL(e){let o=e.getDay(),a=o===5?0:(5-o+7)%7,r=new Date(e.getFullYear(),e.getMonth(),e.getDate()+a);return`${r.getDate()} ${qD[r.getMonth()]} ${r.getFullYear()}`}function pL(e){return!e||!Array.isArray(e.buildings)||!Array.isArray(e.roomTypes)||e.buildings.length===0||e.roomTypes.length===0}function mL(){return globalThis.chrome?.storage?.local}function UD(e){return!!e&&typeof e=="object"&&Array.isArray(e.buildings)&&Array.isArray(e.roomTypes)}function rc(){let e=mL();return e?new Promise(t=>{let o=!1,a=r=>{if(o)return;o=!0;let n=r?r[Mg]:void 0;t(UD(n)?n:null)};try{let r=e.get(Mg,n=>a(n));r&&typeof r.then=="function"&&r.then(a).catch(()=>a(void 0))}catch{a(void 0)}}):Promise.resolve(null)}function Bg(e){let t=mL();if(t)try{let o=t.set({[Mg]:e});o&&typeof o.catch=="function"&&o.catch(()=>{})}catch{}}function gL(e,t,o,a,r){let n=l=>!!l&&e.includes(l);return n(t)?t:n(o)?o:e.includes(a)?a:e.length>0?r?e[e.length-1]:e[0]:""}function nc(e){return{start:gL(e.fromOptions,e.cached?.start,e.seed?.start,e.fallback.start,!1),end:gL(e.toOptions,e.cached?.end,e.seed?.end,e.fallback.end,!0)}}function Fl(...e){let t=[];for(let o=7*60;o<=22*60+30;o+=30)t.push(`${String(Math.floor(o/60)).padStart(2,"0")}:${String(o%60).padStart(2,"0")}`);for(let o of e)/^\d{2}:\d{2}$/.test(o)&&!t.includes(o)&&t.push(o);return t.sort()}var Yr=k(z());var G=k(z(),1),Jg=k(ga(),1);function Rs(e,[t,o]){return Math.min(o,Math.max(t,e))}var Io=k(z(),1);var xL=["top","right","bottom","left"];var Ra=Math.min,oa=Math.max,Ps=Math.round,Es=Math.floor,Ta=e=>({x:e,y:e}),zD={left:"right",right:"left",bottom:"top",top:"bottom"};function Og(e,t,o){return oa(e,Ra(t,o))}function Pa(e,t){return typeof e=="function"?e(t):e}function or(e){return e.split("-")[0]}function Rn(e){return e.split("-")[1]}function ic(e){return e==="x"?"y":"x"}function sc(e){return e==="y"?"height":"width"}function aa(e){let t=e[0];return t==="t"||t==="b"?"y":"x"}function uc(e){return ic(aa(e))}function wL(e,t,o){o===void 0&&(o=!1);let a=Rn(e),r=uc(e),n=sc(r),l=r==="x"?a===(o?"end":"start")?"right":"left":a==="start"?"bottom":"top";return t.reference[n]>t.floating[n]&&(l=Ts(l)),[l,Ts(l)]}function yL(e){let t=Ts(e);return[lc(e),t,lc(t)]}function lc(e){return e.includes("start")?e.replace("start","end"):e.replace("end","start")}var hL=["left","right"],vL=["right","left"],VD=["top","bottom"],WD=["bottom","top"];function $D(e,t,o){switch(e){case"top":case"bottom":return o?t?vL:hL:t?hL:vL;case"left":case"right":return t?VD:WD;default:return[]}}function bL(e,t,o,a){let r=Rn(e),n=$D(or(e),o==="start",a);return r&&(n=n.map(l=>l+"-"+r),t&&(n=n.concat(n.map(lc)))),n}function Ts(e){let t=or(e);return zD[t]+e.slice(t.length)}function GD(e){var t,o,a,r;return{top:(t=e.top)!=null?t:0,right:(o=e.right)!=null?o:0,bottom:(a=e.bottom)!=null?a:0,left:(r=e.left)!=null?r:0}}function Fg(e){return typeof e!="number"?GD(e):{top:e,right:e,bottom:e,left:e}}function Tn(e){let{x:t,y:o,width:a,height:r}=e;return{width:a,height:r,top:o,left:t,right:t+a,bottom:o+r,x:t,y:o}}function SL(e,t,o){let{reference:a,floating:r}=e,n=aa(t),l=uc(t),i=sc(l),s=or(t),u=n==="y",d=a.x+a.width/2-r.width/2,f=a.y+a.height/2-r.height/2,m=a[i]/2-r[i]/2,h;switch(s){case"top":h={x:d,y:a.y-r.height};break;case"bottom":h={x:d,y:a.y+a.height};break;case"right":h={x:a.x+a.width,y:f};break;case"left":h={x:a.x-r.width,y:f};break;default:h={x:a.x,y:a.y}}let y=Rn(t);return y&&(h[l]+=m*(y==="end"?1:-1)*(o&&u?-1:1)),h}async function kL(e,t){var o;t===void 0&&(t={});let{x:a,y:r,platform:n,rects:l,elements:i,strategy:s}=e,{boundary:u="clippingAncestors",rootBoundary:d="viewport",elementContext:f="floating",altBoundary:m=!1,padding:h=0}=Pa(t,e),y=Fg(h),x=i[m?f==="floating"?"reference":"floating":f],p=Tn(await n.getClippingRect({element:(o=await(n.isElement==null?void 0:n.isElement(x)))==null||o?x:x.contextElement||await(n.getDocumentElement==null?void 0:n.getDocumentElement(i.floating)),boundary:u,rootBoundary:d,strategy:s})),c=f==="floating"?{x:a,y:r,width:l.floating.width,height:l.floating.height}:l.reference,v=await(n.getOffsetParent==null?void 0:n.getOffsetParent(i.floating)),w=await(n.isElement==null?void 0:n.isElement(v))&&await(n.getScale==null?void 0:n.getScale(v))||{x:1,y:1},b=Tn(n.convertOffsetParentRelativeRectToViewportRelativeRect?await n.convertOffsetParentRelativeRectToViewportRelativeRect({elements:i,rect:c,offsetParent:v,strategy:s}):c);return{top:(p.top-b.top+y.top)/w.y,bottom:(b.bottom-p.bottom+y.bottom)/w.y,left:(p.left-b.left+y.left)/w.x,right:(b.right-p.right+y.right)/w.x}}var jD=50,IL=async(e,t,o)=>{let{placement:a="bottom",strategy:r="absolute",middleware:n=[],platform:l}=o,i=l.detectOverflow?l:{...l,detectOverflow:kL},s=await(l.isRTL==null?void 0:l.isRTL(t)),u=await l.getElementRects({reference:e,floating:t,strategy:r}),{x:d,y:f}=SL(u,a,s),m=a,h=0,y={};for(let g=0;g<n.length;g++){let x=n[g];if(!x)continue;let{name:p,fn:c}=x,{x:v,y:w,data:b,reset:L}=await c({x:d,y:f,initialPlacement:a,placement:m,strategy:r,middlewareData:y,rects:u,platform:i,elements:{reference:e,floating:t}});d=v??d,f=w??f,y[p]={...y[p],...b},L&&h<jD&&(h++,typeof L=="object"&&(L.placement&&(m=L.placement),L.rects&&(u=L.rects===!0?await l.getElementRects({reference:e,floating:t,strategy:r}):L.rects),{x:d,y:f}=SL(u,m,s)),g=-1)}return{x:d,y:f,placement:m,strategy:r,middlewareData:y}},RL=e=>({name:"arrow",options:e,async fn(t){let{x:o,y:a,placement:r,rects:n,platform:l,elements:i,middlewareData:s}=t,{element:u,padding:d=0}=Pa(e,t)||{};if(u==null)return{};let f=Fg(d),m={x:o,y:a},h=uc(r),y=sc(h),g=await l.getDimensions(u),x=h==="y",p=x?"top":"left",c=x?"bottom":"right",v=x?"clientHeight":"clientWidth",w=n.reference[y]+n.reference[h]-m[h]-n.floating[y],b=m[h]-n.reference[h],L=await(l.getOffsetParent==null?void 0:l.getOffsetParent(u)),C=L?L[v]:0;(!C||!await(l.isElement==null?void 0:l.isElement(L)))&&(C=i.floating[v]||n.floating[y]);let S=w/2-b/2,T=C/2-g[y]/2-1,P=Ra(f[p],T),q=Ra(f[c],T),M=C-g[y]-q,X=C/2-g[y]/2+S,R=Og(P,X,M),U=!s.arrow&&Rn(r)!=null&&X!==R&&n.reference[y]/2-(X<P?P:q)-g[y]/2<0,B=U?X<P?X-P:X-M:0;return{[h]:m[h]+B,data:{[h]:R,centerOffset:X-R-B,...U&&{alignmentOffset:B}},reset:U}}});var TL=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var o,a;let{placement:r,middlewareData:n,rects:l,initialPlacement:i,platform:s,elements:u}=t,{mainAxis:d=!0,crossAxis:f=!0,fallbackPlacements:m,fallbackStrategy:h="bestFit",fallbackAxisSideDirection:y="none",flipAlignment:g=!0,...x}=Pa(e,t);if((o=n.arrow)!=null&&o.alignmentOffset)return{};let p=or(r),c=aa(i),v=or(i)===i,w=await(s.isRTL==null?void 0:s.isRTL(u.floating)),b=m||(v||!g?[Ts(i)]:yL(i)),L=y!=="none";!m&&L&&b.push(...bL(i,g,y,w));let C=[i,...b],S=await s.detectOverflow(t,x),T=[],P=((a=n.flip)==null?void 0:a.overflows)||[];if(d&&T.push(S[p]),f){let R=wL(r,l,w);T.push(S[R[0]],S[R[1]])}if(P=[...P,{placement:r,overflows:T}],!T.every(R=>R<=0)){var q,M;let R=(((q=n.flip)==null?void 0:q.index)||0)+1,U=C[R];if(U&&(!(f==="alignment"?c!==aa(U):!1)||P.every(N=>aa(N.placement)===c?N.overflows[0]>0:!0)))return{data:{index:R,overflows:P},reset:{placement:U}};let B=(M=P.filter(A=>A.overflows[0]<=0).sort((A,N)=>A.overflows[1]-N.overflows[1])[0])==null?void 0:M.placement;if(!B)switch(h){case"bestFit":{var X;let A=(X=P.filter(N=>{if(L){let O=aa(N.placement);return O===c||O==="y"}return!0}).map(N=>[N.placement,N.overflows.filter(O=>O>0).reduce((O,Q)=>O+Q,0)]).sort((N,O)=>N[1]-O[1])[0])==null?void 0:X[0];A&&(B=A);break}case"initialPlacement":B=i;break}if(r!==B)return{reset:{placement:B}}}return{}}}};function CL(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function LL(e){return xL.some(t=>e[t]>=0)}var PL=function(e){return e===void 0&&(e={}),{name:"hide",options:e,async fn(t){let{rects:o,platform:a}=t,{strategy:r="referenceHidden",...n}=Pa(e,t);switch(r){case"referenceHidden":{let l=await a.detectOverflow(t,{...n,elementContext:"reference"}),i=CL(l,o.reference);return{data:{referenceHiddenOffsets:i,referenceHidden:LL(i)}}}case"escaped":{let l=await a.detectOverflow(t,{...n,altBoundary:!0}),i=CL(l,o.floating);return{data:{escapedOffsets:i,escaped:LL(i)}}}default:return{}}}}};var EL=new Set(["left","top"]);async function KD(e,t){let{placement:o,platform:a,elements:r}=e,n=await(a.isRTL==null?void 0:a.isRTL(r.floating)),l=or(o),i=Rn(o),s=aa(o)==="y",u=EL.has(l)?-1:1,d=n&&s?-1:1,f=Pa(t,e),{mainAxis:m,crossAxis:h,alignmentAxis:y}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return i&&typeof y=="number"&&(h=i==="end"?y*-1:y),s?{x:h*d,y:m*u}:{x:m*u,y:h*d}}var AL=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var o,a;let{x:r,y:n,placement:l,middlewareData:i}=t,s=await KD(t,e);return l===((o=i.offset)==null?void 0:o.placement)&&(a=i.arrow)!=null&&a.alignmentOffset?{}:{x:r+s.x,y:n+s.y,data:{...s,placement:l}}}}},DL=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){let{x:o,y:a,placement:r,platform:n}=t,{mainAxis:l=!0,crossAxis:i=!1,limiter:s={fn:c=>{let{x:v,y:w}=c;return{x:v,y:w}}},...u}=Pa(e,t),d={x:o,y:a},f=await n.detectOverflow(t,u),m=aa(r),h=ic(m),y=d[h],g=d[m],x=(c,v)=>Og(v+f[c==="y"?"top":"left"],v,v-f[c==="y"?"bottom":"right"]);l&&(y=x(h,y)),i&&(g=x(m,g));let p=s.fn({...t,[h]:y,[m]:g});return{...p,data:{x:p.x-o,y:p.y-a,enabled:{[h]:l,[m]:i}}}}}},NL=function(e){return e===void 0&&(e={}),{options:e,fn(t){var o,a;let{x:r,y:n,placement:l,rects:i,middlewareData:s}=t,{offset:u=0,mainAxis:d=!0,crossAxis:f=!0}=Pa(e,t),m={x:r,y:n},h=aa(l),y=ic(h),g=m[y],x=m[h],p=Pa(u,t),c=typeof p=="number"?{mainAxis:p,crossAxis:0}:{mainAxis:(o=p.mainAxis)!=null?o:0,crossAxis:(a=p.crossAxis)!=null?a:0};if(d){let b=y==="y"?"height":"width",L=i.reference[y]-i.floating[b]+c.mainAxis,C=i.reference[y]+i.reference[b]-c.mainAxis;g<L?g=L:g>C&&(g=C)}if(f){var v,w;let b=y==="y"?"width":"height",L=EL.has(or(l)),C=i.reference[h]-i.floating[b]+(L&&((v=s.offset)==null?void 0:v[h])||0)+(L?0:c.crossAxis),S=i.reference[h]+i.reference[b]+(L?0:((w=s.offset)==null?void 0:w[h])||0)-(L?c.crossAxis:0);x<C?x=C:x>S&&(x=S)}return{[y]:g,[h]:x}}}},ML=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){let{placement:o,rects:a,platform:r,elements:n}=t,{apply:l=()=>{},...i}=Pa(e,t),s=await r.detectOverflow(t,i),u=or(o),d=Rn(o),f=aa(o)==="y",{width:m,height:h}=a.floating,y,g;u==="top"||u==="bottom"?(y=u,g=d===(await(r.isRTL==null?void 0:r.isRTL(n.floating))?"start":"end")?"left":"right"):(g=u,y=d==="end"?"top":"bottom");let x=h-s.top-s.bottom,p=m-s.left-s.right,c=Ra(h-s[y],x),v=Ra(m-s[g],p),w=t.middlewareData.shift,b=!w,L=c,C=v;w!=null&&w.enabled.x&&(C=p),w!=null&&w.enabled.y&&(L=x),b&&!d&&(f?C=m-2*oa(s.left,s.right):L=h-2*oa(s.top,s.bottom)),await l({...t,availableWidth:C,availableHeight:L});let S=await r.getDimensions(n.floating);return m!==S.width||h!==S.height?{reset:{rects:!0}}:{}}}};function dc(){return typeof window<"u"}function An(e){return OL(e)?(e.nodeName||"").toLowerCase():"#document"}function Zt(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Ea(e){var t;return(t=(OL(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function OL(e){return dc()?e instanceof Node||e instanceof Zt(e).Node:!1}function ra(e){return dc()?e instanceof Element||e instanceof Zt(e).Element:!1}function ar(e){return dc()?e instanceof HTMLElement||e instanceof Zt(e).HTMLElement:!1}function BL(e){return!dc()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof Zt(e).ShadowRoot}function As(e){let{overflow:t,overflowX:o,overflowY:a,display:r}=na(e);return/auto|scroll|overlay|hidden|clip/.test(t+a+o)&&r!=="inline"&&r!=="contents"}function FL(e){return/^(table|td|th)$/.test(An(e))}function Ds(e){try{if(e.matches(":popover-open"))return!0}catch{}try{return e.matches(":modal")}catch{return!1}}var XD=/transform|translate|scale|rotate|perspective|filter/,YD=/paint|layout|strict|content/,Pn=e=>!!e&&e!=="none",_g;function cc(e){let t=ra(e)?na(e):e;return Pn(t.transform)||Pn(t.translate)||Pn(t.scale)||Pn(t.rotate)||Pn(t.perspective)||!fc()&&(Pn(t.backdropFilter)||Pn(t.filter))||XD.test(t.willChange||"")||YD.test(t.contain||"")}function _L(e){let t=Gr(e);for(;ar(t)&&!_l(t);){if(cc(t))return t;if(Ds(t))return null;t=Gr(t)}return null}function fc(){return _g==null&&(_g=typeof CSS<"u"&&CSS.supports&&CSS.supports("-webkit-backdrop-filter","none")),_g}function _l(e){return/^(html|body|#document)$/.test(An(e))}function na(e){return Zt(e).getComputedStyle(e)}function Ns(e){return ra(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function Gr(e){if(An(e)==="html")return e;let t=e.assignedSlot||e.parentNode||BL(e)&&e.host||Ea(e);return BL(t)?t.host:t}function HL(e){let t=Gr(e);return _l(t)?(e.ownerDocument||e).body:ar(t)&&As(t)?t:HL(t)}function En(e,t,o){var a;t===void 0&&(t=[]),o===void 0&&(o=!0);let r=HL(e),n=r===((a=e.ownerDocument)==null?void 0:a.body),l=Zt(r);if(n){let i=pc(l);return t.concat(l,l.visualViewport||[],As(r)?r:[],i&&o?En(i):[])}else return t.concat(r,En(r,[],o))}function pc(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function zL(e){let t=na(e),o=parseFloat(t.width)||0,a=parseFloat(t.height)||0,r=ar(e),n=r?e.offsetWidth:o,l=r?e.offsetHeight:a,i=Ps(o)!==n||Ps(a)!==l;return i&&(o=n,a=l),{width:o,height:a,$:i}}function qg(e){return ra(e)?e:e.contextElement}function Hl(e){let t=qg(e);if(!ar(t))return Ta(1);let o=t.getBoundingClientRect(),{width:a,height:r,$:n}=zL(t),l=(n?Ps(o.width):o.width)/a,i=(n?Ps(o.height):o.height)/r;return(!l||!Number.isFinite(l))&&(l=1),(!i||!Number.isFinite(i))&&(i=1),{x:l,y:i}}var QD=Ta(0);function VL(e){let t=Zt(e);return!fc()||!t.visualViewport?QD:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function ZD(e,t,o){return t===void 0&&(t=!1),!!o&&t&&o===Zt(e)}function Dn(e,t,o,a){t===void 0&&(t=!1),o===void 0&&(o=!1);let r=e.getBoundingClientRect(),n=qg(e),l=Ta(1);t&&(a?ra(a)&&(l=Hl(a)):l=Hl(e));let i=ZD(n,o,a)?VL(n):Ta(0),s=(r.left+i.x)/l.x,u=(r.top+i.y)/l.y,d=r.width/l.x,f=r.height/l.y;if(n&&a){let m=Zt(n),h=ra(a)?Zt(a):a,y=m,g=pc(y);for(;g&&h!==y;){let x=Hl(g),p=g.getBoundingClientRect(),c=na(g),v=p.left+(g.clientLeft+parseFloat(c.paddingLeft))*x.x,w=p.top+(g.clientTop+parseFloat(c.paddingTop))*x.y;s*=x.x,u*=x.y,d*=x.x,f*=x.y,s+=v,u+=w,y=Zt(g),g=pc(y)}}return Tn({width:d,height:f,x:s,y:u})}function mc(e,t){let o=Ns(e).scrollLeft;return t?t.left+o:Dn(Ea(e)).left+o}function WL(e,t){let o=e.getBoundingClientRect(),a=o.left+t.scrollLeft-mc(e,o),r=o.top+t.scrollTop;return{x:a,y:r}}function JD(e){let{elements:t,rect:o,offsetParent:a,strategy:r}=e,n=r==="fixed",l=Ea(a),i=t?Ds(t.floating):!1;if(a===l||i&&n)return o;let s={scrollLeft:0,scrollTop:0},u=Ta(1),d=Ta(0),f=ar(a);if((f||!n)&&((An(a)!=="body"||As(l))&&(s=Ns(a)),f)){let h=Dn(a);u=Hl(a),d.x=h.x+a.clientLeft,d.y=h.y+a.clientTop}let m=l&&!f&&!n?WL(l,s):Ta(0);return{width:o.width*u.x,height:o.height*u.y,x:o.x*u.x-s.scrollLeft*u.x+d.x+m.x,y:o.y*u.y-s.scrollTop*u.y+d.y+m.y}}function eN(e){return e.getClientRects?Array.from(e.getClientRects()):[]}function tN(e){let t=Ns(e),o=e.ownerDocument.body,a=oa(e.scrollWidth,e.clientWidth,o.scrollWidth,o.clientWidth),r=oa(e.scrollHeight,e.clientHeight,o.scrollHeight,o.clientHeight),n=-t.scrollLeft+mc(e),l=-t.scrollTop;return na(o).direction==="rtl"&&(n+=oa(e.clientWidth,o.clientWidth)-a),{width:a,height:r,x:n,y:l}}var oN=25;function aN(e,t,o){o===void 0&&(o="viewport");let a=o==="layoutViewport",r=Zt(e),n=Ea(e),l=r.visualViewport,i=n.clientWidth,s=n.clientHeight,u=0,d=0;if(l){let m=!fc()||t==="fixed";a?m||(u=-l.offsetLeft,d=-l.offsetTop):(i=l.width,s=l.height,m&&(u=l.offsetLeft,d=l.offsetTop))}if(mc(n)<=0){let m=n.ownerDocument,h=m.body,y=getComputedStyle(h),g=m.compatMode==="CSS1Compat"&&parseFloat(y.marginLeft)+parseFloat(y.marginRight)||0,x=Math.abs(n.clientWidth-h.clientWidth-g),p=getComputedStyle(n).scrollbarGutter==="stable both-edges"?x/2:x;p<=oN&&(i-=p)}return{width:i,height:s,x:u,y:d}}function rN(e,t){let o=Dn(e,!0,t==="fixed"),a=o.top+e.clientTop,r=o.left+e.clientLeft,n=Hl(e),l=e.clientWidth*n.x,i=e.clientHeight*n.y,s=r*n.x,u=a*n.y;return{width:l,height:i,x:s,y:u}}function qL(e,t,o){let a;if(t==="viewport"||t==="layoutViewport")a=aN(e,o,t);else if(t==="document")a=tN(Ea(e));else if(ra(t))a=rN(t,o);else{let r=VL(e);a={x:t.x-r.x,y:t.y-r.y,width:t.width,height:t.height}}return Tn(a)}function nN(e,t){let o=t.get(e);if(o)return o;let a=En(e,[],!1).filter(i=>ra(i)&&An(i)!=="body"),r=null,n=na(e).position==="fixed",l=n?Gr(e):e;for(;ra(l)&&!_l(l);){let i=na(l),s=cc(l),u=r?r.position:n?"fixed":"";!s&&(u==="fixed"||u==="absolute"&&i.position==="static")?a=a.filter(f=>f!==l):r=i,l=Gr(l)}return t.set(e,a),a}function lN(e){let{element:t,boundary:o,rootBoundary:a,strategy:r}=e,l=[...o==="clippingAncestors"?Ds(t)?[]:nN(t,this._c):[].concat(o),a],i=qL(t,l[0],r),s=i.top,u=i.right,d=i.bottom,f=i.left;for(let m=1;m<l.length;m++){let h=qL(t,l[m],r);s=oa(h.top,s),u=Ra(h.right,u),d=Ra(h.bottom,d),f=oa(h.left,f)}return{width:u-f,height:d-s,x:f,y:s}}function iN(e){let{width:t,height:o}=zL(e);return{width:t,height:o}}function sN(e,t,o){let a=ar(t),r=Ea(t),n=o==="fixed",l=Dn(e,!0,n,t),i={scrollLeft:0,scrollTop:0},s=Ta(0);if((a||!n)&&((An(t)!=="body"||As(r))&&(i=Ns(t)),a)){let m=Dn(t,!0,n,t);s.x=m.x+t.clientLeft,s.y=m.y+t.clientTop}!a&&r&&(s.x=mc(r));let u=r&&!a&&!n?WL(r,i):Ta(0),d=l.left+i.scrollLeft-s.x-u.x,f=l.top+i.scrollTop-s.y-u.y;return{x:d,y:f,width:l.width,height:l.height}}function Hg(e){return na(e).position==="static"}function UL(e,t){if(!ar(e)||na(e).position==="fixed")return null;if(t)return t(e);let o=e.offsetParent;return Ea(e)===o&&(o=o.ownerDocument.body),o}function $L(e,t){let o=Zt(e);if(Ds(e))return o;if(!ar(e)){let r=Gr(e);for(;r&&!_l(r);){if(ra(r)&&!Hg(r))return r;r=Gr(r)}return o}let a=UL(e,t);for(;a&&FL(a)&&Hg(a);)a=UL(a,t);return a&&_l(a)&&Hg(a)&&!cc(a)?o:a||_L(e)||o}var uN=async function(e){let t=this.getOffsetParent||$L,o=this.getDimensions,a=await o(e.floating);return{reference:sN(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:a.width,height:a.height}}};function dN(e){return na(e).direction==="rtl"}var GL={convertOffsetParentRelativeRectToViewportRelativeRect:JD,getDocumentElement:Ea,getClippingRect:lN,getOffsetParent:$L,getElementRects:uN,getClientRects:eN,getDimensions:iN,getScale:Hl,isElement:ra,isRTL:dN};function jL(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function cN(e,t,o){let a=null,r,n=Ea(e);function l(){var d;clearTimeout(r),(d=a)==null||d.disconnect(),a=null}function i(d,f){d===void 0&&(d=!1),f===void 0&&(f=1),l();let m=e.getBoundingClientRect(),{left:h,top:y,width:g,height:x}=m;if(d||t(),!g||!x)return;let p=Es(y),c=Es(n.clientWidth-(h+g)),v=Es(n.clientHeight-(y+x)),w=Es(h),L={rootMargin:-p+"px "+-c+"px "+-v+"px "+-w+"px",threshold:oa(0,Ra(1,f))||1},C=!0;function S(T){let P=T[0].intersectionRatio;if(!jL(m,e.getBoundingClientRect()))return i();if(P!==f){if(!C)return i();P?i(!1,P):r=setTimeout(()=>{i(!1,1e-7)},1e3)}C=!1}try{a=new IntersectionObserver(S,{...L,root:n.ownerDocument})}catch{a=new IntersectionObserver(S,L)}a.observe(e)}let s=Zt(e),u=()=>i(o);return s.addEventListener("resize",u),i(!0),()=>{s.removeEventListener("resize",u),l()}}function Ug(e,t,o,a){a===void 0&&(a={});let{ancestorScroll:r=!0,ancestorResize:n=!0,elementResize:l=typeof ResizeObserver=="function",layoutShift:i=typeof IntersectionObserver=="function",animationFrame:s=!1}=a,u=qg(e),d=r||n?[...u?En(u):[],...t?En(t):[]]:[];d.forEach(p=>{r&&p.addEventListener("scroll",o),n&&p.addEventListener("resize",o)});let f=u&&i?cN(u,o,n):null,m=-1,h=null;l&&(h=new ResizeObserver(p=>{let[c]=p;c&&c.target===u&&h&&t&&(h.unobserve(t),cancelAnimationFrame(m),m=requestAnimationFrame(()=>{var v;(v=h)==null||v.observe(t)})),o()}),u&&!s&&h.observe(u),t&&h.observe(t));let y,g=s?Dn(e):null;s&&x();function x(){let p=Dn(e);g&&!jL(g,p)&&o(),g=p,y=requestAnimationFrame(x)}return o(),()=>{var p;d.forEach(c=>{r&&c.removeEventListener("scroll",o),n&&c.removeEventListener("resize",o)}),f?.(),(p=h)==null||p.disconnect(),h=null,s&&cancelAnimationFrame(y)}}var KL=AL;var XL=DL,YL=TL,QL=ML,ZL=PL,zg=RL;var JL=NL,Vg=(e,t,o)=>{let a=new Map,r=o??{},n={...GL,...r.platform,_c:a};return IL(e,t,{...r,platform:n})};var yt=k(z(),1),tk=k(z(),1),ok=k(ga(),1),fN=typeof document<"u",pN=function(){},gc=fN?tk.useLayoutEffect:pN;function hc(e,t){if(e===t)return!0;if(typeof e!=typeof t)return!1;if(typeof e=="function"&&e.toString()===t.toString())return!0;let o,a,r;if(e&&t&&typeof e=="object"){if(Array.isArray(e)){if(o=e.length,o!==t.length)return!1;for(a=o;a--!==0;)if(!hc(e[a],t[a]))return!1;return!0}if(r=Object.keys(e),o=r.length,o!==Object.keys(t).length)return!1;for(a=o;a--!==0;)if(!{}.hasOwnProperty.call(t,r[a]))return!1;for(a=o;a--!==0;){let n=r[a];if(!(n==="_owner"&&e.$$typeof)&&!hc(e[n],t[n]))return!1}return!0}return e!==e&&t!==t}function ak(e){return typeof window>"u"?1:(e.ownerDocument.defaultView||window).devicePixelRatio||1}function ek(e,t){let o=ak(e);return Math.round(t*o)/o}function Wg(e){let t=yt.useRef(e);return gc(()=>{t.current=e}),t}function rk(e){e===void 0&&(e={});let{placement:t="bottom",strategy:o="absolute",middleware:a=[],platform:r,elements:{reference:n,floating:l}={},transform:i=!0,whileElementsMounted:s,open:u}=e,[d,f]=yt.useState({x:0,y:0,strategy:o,placement:t,middlewareData:{},isPositioned:!1}),[m,h]=yt.useState(a);hc(m,a)||h(a);let[y,g]=yt.useState(null),[x,p]=yt.useState(null),c=yt.useCallback(N=>{N!==L.current&&(L.current=N,g(N))},[]),v=yt.useCallback(N=>{N!==C.current&&(C.current=N,p(N))},[]),w=n||y,b=l||x,L=yt.useRef(null),C=yt.useRef(null),S=yt.useRef(d),T=s!=null,P=Wg(s),q=Wg(r),M=Wg(u),X=yt.useCallback(()=>{if(!L.current||!C.current)return;let N={placement:t,strategy:o,middleware:m};q.current&&(N.platform=q.current),Vg(L.current,C.current,N).then(O=>{let Q={...O,isPositioned:M.current!==!1};R.current&&!hc(S.current,Q)&&(S.current=Q,ok.flushSync(()=>{f(Q)}))})},[m,t,o,q,M]);gc(()=>{u===!1&&S.current.isPositioned&&(S.current.isPositioned=!1,f(N=>({...N,isPositioned:!1})))},[u]);let R=yt.useRef(!1);gc(()=>(R.current=!0,()=>{R.current=!1}),[]),gc(()=>{if(w&&(L.current=w),b&&(C.current=b),w&&b){if(P.current)return P.current(w,b,X);X()}},[w,b,X,P,T]);let U=yt.useMemo(()=>({reference:L,floating:C,setReference:c,setFloating:v}),[c,v]),B=yt.useMemo(()=>({reference:w,floating:b}),[w,b]),A=yt.useMemo(()=>{let N={position:o,left:0,top:0};if(!B.floating)return N;let O=ek(B.floating,d.x),Q=ek(B.floating,d.y);return i?{...N,transform:"translate("+O+"px, "+Q+"px)",...ak(B.floating)>=1.5&&{willChange:"transform"}}:{position:o,left:O,top:Q}},[o,i,B.floating,d.x,d.y]);return yt.useMemo(()=>({...d,update:X,refs:U,elements:B,floatingStyles:A}),[d,X,U,B,A])}var mN=e=>{function t(o){return{}.hasOwnProperty.call(o,"current")}return{name:"arrow",options:e,fn(o){let{element:a,padding:r}=typeof e=="function"?e(o):e;return a&&t(a)?a.current!=null?zg({element:a.current,padding:r}).fn(o):{}:a?zg({element:a,padding:r}).fn(o):{}}}},nk=(e,t)=>{let o=KL(e);return{name:o.name,fn:o.fn,options:[e,t]}},lk=(e,t)=>{let o=XL(e);return{name:o.name,fn:o.fn,options:[e,t]}},ik=(e,t)=>({fn:JL(e).fn,options:[e,t]}),sk=(e,t)=>{let o=YL(e);return{name:o.name,fn:o.fn,options:[e,t]}},uk=(e,t)=>{let o=QL(e);return{name:o.name,fn:o.fn,options:[e,t]}};var dk=(e,t)=>{let o=ZL(e);return{name:o.name,fn:o.fn,options:[e,t]}};var ck=(e,t)=>{let o=mN(e);return{name:o.name,fn:o.fn,options:[e,t]}};var fk=k(z(),1);var $g=k(H(),1),gN="Arrow",pk=fk.forwardRef((e,t)=>{let{children:o,width:a=10,height:r=5,...n}=e;return(0,$g.jsx)(te.svg,{...n,ref:t,width:a,height:r,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:e.asChild?o:(0,$g.jsx)("polygon",{points:"0,0 30,0 15,10"})})});pk.displayName=gN;var mk=pk;var gk=k(z(),1);function hk(e){let[t,o]=gk.useState(void 0);return He(()=>{if(e){o({width:e.offsetWidth,height:e.offsetHeight});let a=new ResizeObserver(r=>{if(!Array.isArray(r)||!r.length)return;let n=r[0],l,i;if("borderBoxSize"in n){let s=n.borderBoxSize,u=Array.isArray(s)?s[0]:s;l=u.inlineSize,i=u.blockSize}else l=e.offsetWidth,i=e.offsetHeight;o({width:l,height:i})});return a.observe(e,{box:"border-box"}),()=>a.unobserve(e)}else o(void 0)},[e]),t}var jr=k(H(),1);var Gg="Popper",[vk,ql]=dt(Gg),[vN,xk]=vk(Gg),wk=e=>{let{__scopePopper:t,children:o}=e,[a,r]=Io.useState(null);return(0,jr.jsx)(vN,{scope:t,anchor:a,onAnchorChange:r,children:o})};wk.displayName=Gg;var yk="PopperAnchor",bk=Io.forwardRef((e,t)=>{let{__scopePopper:o,virtualRef:a,...r}=e,n=xk(yk,o),l=Io.useRef(null),i=ue(t,l);return Io.useEffect(()=>{n.onAnchorChange(a?.current||l.current)}),a?null:(0,jr.jsx)(te.div,{...r,ref:i})});bk.displayName=yk;var jg="PopperContent",[xN,wN]=vk(jg),Sk=Io.forwardRef((e,t)=>{let{__scopePopper:o,side:a="bottom",sideOffset:r=0,align:n="center",alignOffset:l=0,arrowPadding:i=0,avoidCollisions:s=!0,collisionBoundary:u=[],collisionPadding:d=0,sticky:f="partial",hideWhenDetached:m=!1,updatePositionStrategy:h="optimized",onPlaced:y,...g}=e,x=xk(jg,o),[p,c]=Io.useState(null),v=ue(t,J=>c(J)),[w,b]=Io.useState(null),L=hk(w),C=L?.width??0,S=L?.height??0,T=a+(n!=="center"?"-"+n:""),P=typeof d=="number"?d:{top:0,right:0,bottom:0,left:0,...d},q=Array.isArray(u)?u:[u],M=q.length>0,X={padding:P,boundary:q.filter(bN),altBoundary:M},{refs:R,floatingStyles:U,placement:B,isPositioned:A,middlewareData:N}=rk({strategy:"fixed",placement:T,whileElementsMounted:(...J)=>Ug(...J,{animationFrame:h==="always"}),elements:{reference:x.anchor},middleware:[nk({mainAxis:r+S,alignmentAxis:l}),s&&lk({mainAxis:!0,crossAxis:!1,limiter:f==="partial"?ik():void 0,...X}),s&&sk({...X}),uk({...X,apply:({elements:J,rects:Fe,availableWidth:E,availableHeight:_})=>{let{width:se,height:le}=Fe.reference,Re=J.floating.style;Re.setProperty("--radix-popper-available-width",`${E}px`),Re.setProperty("--radix-popper-available-height",`${_}px`),Re.setProperty("--radix-popper-anchor-width",`${se}px`),Re.setProperty("--radix-popper-anchor-height",`${le}px`)}}),w&&ck({element:w,padding:i}),SN({arrowWidth:C,arrowHeight:S}),m&&dk({strategy:"referenceHidden",...X})]}),[O,Q]=kk(B),ae=De(y);He(()=>{A&&ae?.()},[A,ae]);let he=N.arrow?.x,pe=N.arrow?.y,de=N.arrow?.centerOffset!==0,[we,ct]=Io.useState();return He(()=>{p&&ct(window.getComputedStyle(p).zIndex)},[p]),(0,jr.jsx)("div",{ref:R.setFloating,"data-radix-popper-content-wrapper":"",style:{...U,transform:A?U.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:we,"--radix-popper-transform-origin":[N.transformOrigin?.x,N.transformOrigin?.y].join(" "),...N.hide?.referenceHidden&&{visibility:"hidden",pointerEvents:"none"}},dir:e.dir,children:(0,jr.jsx)(xN,{scope:o,placedSide:O,onArrowChange:b,arrowX:he,arrowY:pe,shouldHideArrow:de,children:(0,jr.jsx)(te.div,{"data-side":O,"data-align":Q,...g,ref:v,style:{...g.style,animation:A?void 0:"none"}})})})});Sk.displayName=jg;var Ck="PopperArrow",yN={top:"bottom",right:"left",bottom:"top",left:"right"},Lk=Io.forwardRef(function(t,o){let{__scopePopper:a,...r}=t,n=wN(Ck,a),l=yN[n.placedSide];return(0,jr.jsx)("span",{ref:n.onArrowChange,style:{position:"absolute",left:n.arrowX,top:n.arrowY,[l]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[n.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[n.placedSide],visibility:n.shouldHideArrow?"hidden":void 0},children:(0,jr.jsx)(mk,{...r,ref:o,style:{...r.style,display:"block"}})})});Lk.displayName=Ck;function bN(e){return e!==null}var SN=e=>({name:"transformOrigin",options:e,fn(t){let{placement:o,rects:a,middlewareData:r}=t,l=r.arrow?.centerOffset!==0,i=l?0:e.arrowWidth,s=l?0:e.arrowHeight,[u,d]=kk(o),f={start:"0%",center:"50%",end:"100%"}[d],m=(r.arrow?.x??0)+i/2,h=(r.arrow?.y??0)+s/2,y="",g="";return u==="bottom"?(y=l?f:`${m}px`,g=`${-s}px`):u==="top"?(y=l?f:`${m}px`,g=`${a.floating.height+s}px`):u==="right"?(y=`${-s}px`,g=l?f:`${h}px`):u==="left"&&(y=`${a.floating.width+s}px`,g=l?f:`${h}px`),{data:{x:y,y:g}}}});function kk(e){let[t,o="center"]=e.split("-");return[t,o]}var vc=wk,Ms=bk,xc=Sk,wc=Lk;var yc=k(z(),1);function Rk(e){let t=yc.useRef({value:e,previous:e});return yc.useMemo(()=>(t.current.value!==e&&(t.current.previous=t.current.value,t.current.value=e),t.current.previous),[e])}var re=k(H(),1),CN=[" ","Enter","ArrowUp","ArrowDown"],LN=[" ","Enter"],Os="Select",[Sc,Cc,kN]=Mr(Os),[Ul,iq]=dt(Os,[kN,ql]),Lc=ql(),[IN,Kr]=Ul(Os),[RN,TN]=Ul(Os),Tk=e=>{let{__scopeSelect:t,children:o,open:a,defaultOpen:r,onOpenChange:n,value:l,defaultValue:i,onValueChange:s,dir:u,name:d,autoComplete:f,disabled:m,required:h,form:y}=e,g=Lc(t),[x,p]=G.useState(null),[c,v]=G.useState(null),[w,b]=G.useState(!1),L=ha(u),[C=!1,S]=Et({prop:a,defaultProp:r,onChange:n}),[T,P]=Et({prop:l,defaultProp:i,onChange:s}),q=G.useRef(null),M=x?y||!!x.closest("form"):!0,[X,R]=G.useState(new Set),U=Array.from(X).map(B=>B.props.value).join(";");return(0,re.jsx)(vc,{...g,children:(0,re.jsxs)(IN,{required:h,scope:t,trigger:x,onTriggerChange:p,valueNode:c,onValueNodeChange:v,valueNodeHasChildren:w,onValueNodeHasChildrenChange:b,contentId:Pt(),value:T,onValueChange:P,open:C,onOpenChange:S,dir:L,triggerPointerDownPosRef:q,disabled:m,children:[(0,re.jsx)(Sc.Provider,{scope:t,children:(0,re.jsx)(RN,{scope:e.__scopeSelect,onNativeOptionAdd:G.useCallback(B=>{R(A=>new Set(A).add(B))},[]),onNativeOptionRemove:G.useCallback(B=>{R(A=>{let N=new Set(A);return N.delete(B),N})},[]),children:o})}),M?(0,re.jsxs)(Jk,{"aria-hidden":!0,required:h,tabIndex:-1,name:d,autoComplete:f,value:T,onChange:B=>P(B.target.value),disabled:m,form:y,children:[T===void 0?(0,re.jsx)("option",{value:""}):null,Array.from(X)]},U):null]})})};Tk.displayName=Os;var Pk="SelectTrigger",Ek=G.forwardRef((e,t)=>{let{__scopeSelect:o,disabled:a=!1,...r}=e,n=Lc(o),l=Kr(Pk,o),i=l.disabled||a,s=ue(t,l.onTriggerChange),u=Cc(o),d=G.useRef("touch"),[f,m,h]=eI(g=>{let x=u().filter(v=>!v.disabled),p=x.find(v=>v.value===l.value),c=tI(x,g,p);c!==void 0&&l.onValueChange(c.value)}),y=g=>{i||(l.onOpenChange(!0),h()),g&&(l.triggerPointerDownPosRef.current={x:Math.round(g.pageX),y:Math.round(g.pageY)})};return(0,re.jsx)(Ms,{asChild:!0,...n,children:(0,re.jsx)(te.button,{type:"button",role:"combobox","aria-controls":l.contentId,"aria-expanded":l.open,"aria-required":l.required,"aria-autocomplete":"none",dir:l.dir,"data-state":l.open?"open":"closed",disabled:i,"data-disabled":i?"":void 0,"data-placeholder":Zk(l.value)?"":void 0,...r,ref:s,onClick:Y(r.onClick,g=>{g.currentTarget.focus(),d.current!=="mouse"&&y(g)}),onPointerDown:Y(r.onPointerDown,g=>{d.current=g.pointerType;let x=g.target;x.hasPointerCapture(g.pointerId)&&x.releasePointerCapture(g.pointerId),g.button===0&&g.ctrlKey===!1&&g.pointerType==="mouse"&&(y(g),g.preventDefault())}),onKeyDown:Y(r.onKeyDown,g=>{let x=f.current!=="";!(g.ctrlKey||g.altKey||g.metaKey)&&g.key.length===1&&m(g.key),!(x&&g.key===" ")&&CN.includes(g.key)&&(y(),g.preventDefault())})})})});Ek.displayName=Pk;var Ak="SelectValue",Dk=G.forwardRef((e,t)=>{let{__scopeSelect:o,className:a,style:r,children:n,placeholder:l="",...i}=e,s=Kr(Ak,o),{onValueNodeHasChildrenChange:u}=s,d=n!==void 0,f=ue(t,s.onValueNodeChange);return He(()=>{u(d)},[u,d]),(0,re.jsx)(te.span,{...i,ref:f,style:{pointerEvents:"none"},children:Zk(s.value)?(0,re.jsx)(re.Fragment,{children:l}):n})});Dk.displayName=Ak;var PN="SelectIcon",Nk=G.forwardRef((e,t)=>{let{__scopeSelect:o,children:a,...r}=e;return(0,re.jsx)(te.span,{"aria-hidden":!0,...r,ref:t,children:a||"\u25BC"})});Nk.displayName=PN;var EN="SelectPortal",Mk=e=>(0,re.jsx)(Qa,{asChild:!0,...e});Mk.displayName=EN;var Nn="SelectContent",Bk=G.forwardRef((e,t)=>{let o=Kr(Nn,e.__scopeSelect),[a,r]=G.useState();if(He(()=>{r(new DocumentFragment)},[]),!o.open){let n=a;return n?Jg.createPortal((0,re.jsx)(Ok,{scope:e.__scopeSelect,children:(0,re.jsx)(Sc.Slot,{scope:e.__scopeSelect,children:(0,re.jsx)("div",{children:e.children})})}),n):null}return(0,re.jsx)(Fk,{...e,ref:t})});Bk.displayName=Nn;var la=10,[Ok,Xr]=Ul(Nn),AN="SelectContentImpl",Fk=G.forwardRef((e,t)=>{let{__scopeSelect:o,position:a="item-aligned",onCloseAutoFocus:r,onEscapeKeyDown:n,onPointerDownOutside:l,side:i,sideOffset:s,align:u,alignOffset:d,arrowPadding:f,collisionBoundary:m,collisionPadding:h,sticky:y,hideWhenDetached:g,avoidCollisions:x,...p}=e,c=Kr(Nn,o),[v,w]=G.useState(null),[b,L]=G.useState(null),C=ue(t,J=>w(J)),[S,T]=G.useState(null),[P,q]=G.useState(null),M=Cc(o),[X,R]=G.useState(!1),U=G.useRef(!1);G.useEffect(()=>{if(v)return Tl(v)},[v]),Cl();let B=G.useCallback(J=>{let[Fe,...E]=M().map(le=>le.ref.current),[_]=E.slice(-1),se=document.activeElement;for(let le of J)if(le===se||(le?.scrollIntoView({block:"nearest"}),le===Fe&&b&&(b.scrollTop=0),le===_&&b&&(b.scrollTop=b.scrollHeight),le?.focus(),document.activeElement!==se))return},[M,b]),A=G.useCallback(()=>B([S,v]),[B,S,v]);G.useEffect(()=>{X&&A()},[X,A]);let{onOpenChange:N,triggerPointerDownPosRef:O}=c;G.useEffect(()=>{if(v){let J={x:0,y:0},Fe=_=>{J={x:Math.abs(Math.round(_.pageX)-(O.current?.x??0)),y:Math.abs(Math.round(_.pageY)-(O.current?.y??0))}},E=_=>{J.x<=10&&J.y<=10?_.preventDefault():v.contains(_.target)||N(!1),document.removeEventListener("pointermove",Fe),O.current=null};return O.current!==null&&(document.addEventListener("pointermove",Fe),document.addEventListener("pointerup",E,{capture:!0,once:!0})),()=>{document.removeEventListener("pointermove",Fe),document.removeEventListener("pointerup",E,{capture:!0})}}},[v,N,O]),G.useEffect(()=>{let J=()=>N(!1);return window.addEventListener("blur",J),window.addEventListener("resize",J),()=>{window.removeEventListener("blur",J),window.removeEventListener("resize",J)}},[N]);let[Q,ae]=eI(J=>{let Fe=M().filter(se=>!se.disabled),E=Fe.find(se=>se.ref.current===document.activeElement),_=tI(Fe,J,E);_&&setTimeout(()=>_.ref.current.focus())}),he=G.useCallback((J,Fe,E)=>{let _=!U.current&&!E;(c.value!==void 0&&c.value===Fe||_)&&(T(J),_&&(U.current=!0))},[c.value]),pe=G.useCallback(()=>v?.focus(),[v]),de=G.useCallback((J,Fe,E)=>{let _=!U.current&&!E;(c.value!==void 0&&c.value===Fe||_)&&q(J)},[c.value]),we=a==="popper"?Kg:_k,ct=we===Kg?{side:i,sideOffset:s,align:u,alignOffset:d,arrowPadding:f,collisionBoundary:m,collisionPadding:h,sticky:y,hideWhenDetached:g,avoidCollisions:x}:{};return(0,re.jsx)(Ok,{scope:o,content:v,viewport:b,onViewportChange:L,itemRefCallback:he,selectedItem:S,onItemLeave:pe,itemTextRefCallback:de,focusSelectedItem:A,selectedItemText:P,position:a,isPositioned:X,searchRef:Q,children:(0,re.jsx)(kn,{as:so,allowPinchZoom:!0,children:(0,re.jsx)(bn,{asChild:!0,trapped:c.open,onMountAutoFocus:J=>{J.preventDefault()},onUnmountAutoFocus:Y(r,J=>{c.trigger?.focus({preventScroll:!0}),J.preventDefault()}),children:(0,re.jsx)(Fr,{asChild:!0,disableOutsidePointerEvents:!0,onEscapeKeyDown:n,onPointerDownOutside:l,onFocusOutside:J=>J.preventDefault(),onDismiss:()=>c.onOpenChange(!1),children:(0,re.jsx)(we,{role:"listbox",id:c.contentId,"data-state":c.open?"open":"closed",dir:c.dir,onContextMenu:J=>J.preventDefault(),...p,...ct,onPlaced:()=>R(!0),ref:C,style:{display:"flex",flexDirection:"column",outline:"none",...p.style},onKeyDown:Y(p.onKeyDown,J=>{let Fe=J.ctrlKey||J.altKey||J.metaKey;if(J.key==="Tab"&&J.preventDefault(),!Fe&&J.key.length===1&&ae(J.key),["ArrowUp","ArrowDown","Home","End"].includes(J.key)){let _=M().filter(se=>!se.disabled).map(se=>se.ref.current);if(["ArrowUp","End"].includes(J.key)&&(_=_.slice().reverse()),["ArrowUp","ArrowDown"].includes(J.key)){let se=J.target,le=_.indexOf(se);_=_.slice(le+1)}setTimeout(()=>B(_)),J.preventDefault()}})})})})})})});Fk.displayName=AN;var DN="SelectItemAlignedPosition",_k=G.forwardRef((e,t)=>{let{__scopeSelect:o,onPlaced:a,...r}=e,n=Kr(Nn,o),l=Xr(Nn,o),[i,s]=G.useState(null),[u,d]=G.useState(null),f=ue(t,C=>d(C)),m=Cc(o),h=G.useRef(!1),y=G.useRef(!0),{viewport:g,selectedItem:x,selectedItemText:p,focusSelectedItem:c}=l,v=G.useCallback(()=>{if(n.trigger&&n.valueNode&&i&&u&&g&&x&&p){let C=n.trigger.getBoundingClientRect(),S=u.getBoundingClientRect(),T=n.valueNode.getBoundingClientRect(),P=p.getBoundingClientRect();if(n.dir!=="rtl"){let se=P.left-S.left,le=T.left-se,Re=C.left-le,st=C.width+Re,Ue=Math.max(st,S.width),jt=window.innerWidth-la,ia=Rs(le,[la,Math.max(la,jt-Ue)]);i.style.minWidth=st+"px",i.style.left=ia+"px"}else{let se=S.right-P.right,le=window.innerWidth-T.right-se,Re=window.innerWidth-C.right-le,st=C.width+Re,Ue=Math.max(st,S.width),jt=window.innerWidth-la,ia=Rs(le,[la,Math.max(la,jt-Ue)]);i.style.minWidth=st+"px",i.style.right=ia+"px"}let q=m(),M=window.innerHeight-la*2,X=g.scrollHeight,R=window.getComputedStyle(u),U=parseInt(R.borderTopWidth,10),B=parseInt(R.paddingTop,10),A=parseInt(R.borderBottomWidth,10),N=parseInt(R.paddingBottom,10),O=U+B+X+N+A,Q=Math.min(x.offsetHeight*5,O),ae=window.getComputedStyle(g),he=parseInt(ae.paddingTop,10),pe=parseInt(ae.paddingBottom,10),de=C.top+C.height/2-la,we=M-de,ct=x.offsetHeight/2,J=x.offsetTop+ct,Fe=U+B+J,E=O-Fe;if(Fe<=de){let se=q.length>0&&x===q[q.length-1].ref.current;i.style.bottom="0px";let le=u.clientHeight-g.offsetTop-g.offsetHeight,Re=Math.max(we,ct+(se?pe:0)+le+A),st=Fe+Re;i.style.height=st+"px"}else{let se=q.length>0&&x===q[0].ref.current;i.style.top="0px";let Re=Math.max(de,U+g.offsetTop+(se?he:0)+ct)+E;i.style.height=Re+"px",g.scrollTop=Fe-de+g.offsetTop}i.style.margin=`${la}px 0`,i.style.minHeight=Q+"px",i.style.maxHeight=M+"px",a?.(),requestAnimationFrame(()=>h.current=!0)}},[m,n.trigger,n.valueNode,i,u,g,x,p,n.dir,a]);He(()=>v(),[v]);let[w,b]=G.useState();He(()=>{u&&b(window.getComputedStyle(u).zIndex)},[u]);let L=G.useCallback(C=>{C&&y.current===!0&&(v(),c?.(),y.current=!1)},[v,c]);return(0,re.jsx)(MN,{scope:o,contentWrapper:i,shouldExpandOnScrollRef:h,onScrollButtonChange:L,children:(0,re.jsx)("div",{ref:s,style:{display:"flex",flexDirection:"column",position:"fixed",zIndex:w},children:(0,re.jsx)(te.div,{...r,ref:f,style:{boxSizing:"border-box",maxHeight:"100%",...r.style}})})})});_k.displayName=DN;var NN="SelectPopperPosition",Kg=G.forwardRef((e,t)=>{let{__scopeSelect:o,align:a="start",collisionPadding:r=la,...n}=e,l=Lc(o);return(0,re.jsx)(xc,{...l,...n,ref:t,align:a,collisionPadding:r,style:{boxSizing:"border-box",...n.style,"--radix-select-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-select-content-available-width":"var(--radix-popper-available-width)","--radix-select-content-available-height":"var(--radix-popper-available-height)","--radix-select-trigger-width":"var(--radix-popper-anchor-width)","--radix-select-trigger-height":"var(--radix-popper-anchor-height)"}})});Kg.displayName=NN;var[MN,eh]=Ul(Nn,{}),Xg="SelectViewport",Hk=G.forwardRef((e,t)=>{let{__scopeSelect:o,nonce:a,...r}=e,n=Xr(Xg,o),l=eh(Xg,o),i=ue(t,n.onViewportChange),s=G.useRef(0);return(0,re.jsxs)(re.Fragment,{children:[(0,re.jsx)("style",{dangerouslySetInnerHTML:{__html:"[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}"},nonce:a}),(0,re.jsx)(Sc.Slot,{scope:o,children:(0,re.jsx)(te.div,{"data-radix-select-viewport":"",role:"presentation",...r,ref:i,style:{position:"relative",flex:1,overflow:"hidden auto",...r.style},onScroll:Y(r.onScroll,u=>{let d=u.currentTarget,{contentWrapper:f,shouldExpandOnScrollRef:m}=l;if(m?.current&&f){let h=Math.abs(s.current-d.scrollTop);if(h>0){let y=window.innerHeight-la*2,g=parseFloat(f.style.minHeight),x=parseFloat(f.style.height),p=Math.max(g,x);if(p<y){let c=p+h,v=Math.min(y,c),w=c-v;f.style.height=v+"px",f.style.bottom==="0px"&&(d.scrollTop=w>0?w:0,f.style.justifyContent="flex-end")}}}s.current=d.scrollTop})})})]})});Hk.displayName=Xg;var qk="SelectGroup",[BN,ON]=Ul(qk),FN=G.forwardRef((e,t)=>{let{__scopeSelect:o,...a}=e,r=Pt();return(0,re.jsx)(BN,{scope:o,id:r,children:(0,re.jsx)(te.div,{role:"group","aria-labelledby":r,...a,ref:t})})});FN.displayName=qk;var Uk="SelectLabel",zk=G.forwardRef((e,t)=>{let{__scopeSelect:o,...a}=e,r=ON(Uk,o);return(0,re.jsx)(te.div,{id:r.id,...a,ref:t})});zk.displayName=Uk;var bc="SelectItem",[_N,Vk]=Ul(bc),Wk=G.forwardRef((e,t)=>{let{__scopeSelect:o,value:a,disabled:r=!1,textValue:n,...l}=e,i=Kr(bc,o),s=Xr(bc,o),u=i.value===a,[d,f]=G.useState(n??""),[m,h]=G.useState(!1),y=ue(t,c=>s.itemRefCallback?.(c,a,r)),g=Pt(),x=G.useRef("touch"),p=()=>{r||(i.onValueChange(a),i.onOpenChange(!1))};if(a==="")throw new Error("A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.");return(0,re.jsx)(_N,{scope:o,value:a,disabled:r,textId:g,isSelected:u,onItemTextChange:G.useCallback(c=>{f(v=>v||(c?.textContent??"").trim())},[]),children:(0,re.jsx)(Sc.ItemSlot,{scope:o,value:a,disabled:r,textValue:d,children:(0,re.jsx)(te.div,{role:"option","aria-labelledby":g,"data-highlighted":m?"":void 0,"aria-selected":u&&m,"data-state":u?"checked":"unchecked","aria-disabled":r||void 0,"data-disabled":r?"":void 0,tabIndex:r?void 0:-1,...l,ref:y,onFocus:Y(l.onFocus,()=>h(!0)),onBlur:Y(l.onBlur,()=>h(!1)),onClick:Y(l.onClick,()=>{x.current!=="mouse"&&p()}),onPointerUp:Y(l.onPointerUp,()=>{x.current==="mouse"&&p()}),onPointerDown:Y(l.onPointerDown,c=>{x.current=c.pointerType}),onPointerMove:Y(l.onPointerMove,c=>{x.current=c.pointerType,r?s.onItemLeave?.():x.current==="mouse"&&c.currentTarget.focus({preventScroll:!0})}),onPointerLeave:Y(l.onPointerLeave,c=>{c.currentTarget===document.activeElement&&s.onItemLeave?.()}),onKeyDown:Y(l.onKeyDown,c=>{s.searchRef?.current!==""&&c.key===" "||(LN.includes(c.key)&&p(),c.key===" "&&c.preventDefault())})})})})});Wk.displayName=bc;var Bs="SelectItemText",$k=G.forwardRef((e,t)=>{let{__scopeSelect:o,className:a,style:r,...n}=e,l=Kr(Bs,o),i=Xr(Bs,o),s=Vk(Bs,o),u=TN(Bs,o),[d,f]=G.useState(null),m=ue(t,p=>f(p),s.onItemTextChange,p=>i.itemTextRefCallback?.(p,s.value,s.disabled)),h=d?.textContent,y=G.useMemo(()=>(0,re.jsx)("option",{value:s.value,disabled:s.disabled,children:h},s.value),[s.disabled,s.value,h]),{onNativeOptionAdd:g,onNativeOptionRemove:x}=u;return He(()=>(g(y),()=>x(y)),[g,x,y]),(0,re.jsxs)(re.Fragment,{children:[(0,re.jsx)(te.span,{id:s.textId,...n,ref:m}),s.isSelected&&l.valueNode&&!l.valueNodeHasChildren?Jg.createPortal(n.children,l.valueNode):null]})});$k.displayName=Bs;var Gk="SelectItemIndicator",jk=G.forwardRef((e,t)=>{let{__scopeSelect:o,...a}=e;return Vk(Gk,o).isSelected?(0,re.jsx)(te.span,{"aria-hidden":!0,...a,ref:t}):null});jk.displayName=Gk;var Yg="SelectScrollUpButton",Kk=G.forwardRef((e,t)=>{let o=Xr(Yg,e.__scopeSelect),a=eh(Yg,e.__scopeSelect),[r,n]=G.useState(!1),l=ue(t,a.onScrollButtonChange);return He(()=>{if(o.viewport&&o.isPositioned){let s=function(){let d=u.scrollTop>0;n(d)};var i=s;let u=o.viewport;return s(),u.addEventListener("scroll",s),()=>u.removeEventListener("scroll",s)}},[o.viewport,o.isPositioned]),r?(0,re.jsx)(Yk,{...e,ref:l,onAutoScroll:()=>{let{viewport:i,selectedItem:s}=o;i&&s&&(i.scrollTop=i.scrollTop-s.offsetHeight)}}):null});Kk.displayName=Yg;var Qg="SelectScrollDownButton",Xk=G.forwardRef((e,t)=>{let o=Xr(Qg,e.__scopeSelect),a=eh(Qg,e.__scopeSelect),[r,n]=G.useState(!1),l=ue(t,a.onScrollButtonChange);return He(()=>{if(o.viewport&&o.isPositioned){let s=function(){let d=u.scrollHeight-u.clientHeight,f=Math.ceil(u.scrollTop)<d;n(f)};var i=s;let u=o.viewport;return s(),u.addEventListener("scroll",s),()=>u.removeEventListener("scroll",s)}},[o.viewport,o.isPositioned]),r?(0,re.jsx)(Yk,{...e,ref:l,onAutoScroll:()=>{let{viewport:i,selectedItem:s}=o;i&&s&&(i.scrollTop=i.scrollTop+s.offsetHeight)}}):null});Xk.displayName=Qg;var Yk=G.forwardRef((e,t)=>{let{__scopeSelect:o,onAutoScroll:a,...r}=e,n=Xr("SelectScrollButton",o),l=G.useRef(null),i=Cc(o),s=G.useCallback(()=>{l.current!==null&&(window.clearInterval(l.current),l.current=null)},[]);return G.useEffect(()=>()=>s(),[s]),He(()=>{i().find(d=>d.ref.current===document.activeElement)?.ref.current?.scrollIntoView({block:"nearest"})},[i]),(0,re.jsx)(te.div,{"aria-hidden":!0,...r,ref:t,style:{flexShrink:0,...r.style},onPointerDown:Y(r.onPointerDown,()=>{l.current===null&&(l.current=window.setInterval(a,50))}),onPointerMove:Y(r.onPointerMove,()=>{n.onItemLeave?.(),l.current===null&&(l.current=window.setInterval(a,50))}),onPointerLeave:Y(r.onPointerLeave,()=>{s()})})}),HN="SelectSeparator",Qk=G.forwardRef((e,t)=>{let{__scopeSelect:o,...a}=e;return(0,re.jsx)(te.div,{"aria-hidden":!0,...a,ref:t})});Qk.displayName=HN;var Zg="SelectArrow",qN=G.forwardRef((e,t)=>{let{__scopeSelect:o,...a}=e,r=Lc(o),n=Kr(Zg,o),l=Xr(Zg,o);return n.open&&l.position==="popper"?(0,re.jsx)(wc,{...r,...a,ref:t}):null});qN.displayName=Zg;function Zk(e){return e===""||e===void 0}var Jk=G.forwardRef((e,t)=>{let{value:o,...a}=e,r=G.useRef(null),n=ue(t,r),l=Rk(o);return G.useEffect(()=>{let i=r.current,s=window.HTMLSelectElement.prototype,d=Object.getOwnPropertyDescriptor(s,"value").set;if(l!==o&&d){let f=new Event("change",{bubbles:!0});d.call(i,o),i.dispatchEvent(f)}},[l,o]),(0,re.jsx)(bl,{asChild:!0,children:(0,re.jsx)("select",{...a,ref:n,defaultValue:o})})});Jk.displayName="BubbleSelect";function eI(e){let t=De(e),o=G.useRef(""),a=G.useRef(0),r=G.useCallback(l=>{let i=o.current+l;t(i),function s(u){o.current=u,window.clearTimeout(a.current),u!==""&&(a.current=window.setTimeout(()=>s(""),1e3))}(i)},[t]),n=G.useCallback(()=>{o.current="",window.clearTimeout(a.current)},[]);return G.useEffect(()=>()=>window.clearTimeout(a.current),[]),[o,r,n]}function tI(e,t,o){let r=t.length>1&&Array.from(t).every(u=>u===t[0])?t[0]:t,n=o?e.indexOf(o):-1,l=UN(e,Math.max(n,0));r.length===1&&(l=l.filter(u=>u!==o));let s=l.find(u=>u.textValue.toLowerCase().startsWith(r.toLowerCase()));return s!==o?s:void 0}function UN(e,t){return e.map((o,a)=>e[(t+a)%e.length])}var oI=Tk,th=Ek,aI=Dk,rI=Nk,nI=Mk,oh=Bk,lI=Hk;var ah=zk,rh=Wk,iI=$k,sI=jk,nh=Kk,lh=Xk,ih=Qk;var ht=k(H()),po=oI;var mo=aI,Jt=Yr.forwardRef(({className:e,children:t,...o},a)=>(0,ht.jsxs)(th,{ref:a,className:K("flex h-control w-full items-center justify-between whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm transition-colors data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",e),...o,children:[t,(0,ht.jsx)(rI,{asChild:!0,children:(0,ht.jsx)(_r,{className:"h-3.5 w-3.5 opacity-60"})})]}));Jt.displayName=th.displayName;var uI=Yr.forwardRef(({className:e,...t},o)=>(0,ht.jsx)(nh,{ref:o,className:K("flex cursor-default items-center justify-center py-1",e),...t,children:(0,ht.jsx)(ds,{className:"h-3.5 w-3.5"})}));uI.displayName=nh.displayName;var dI=Yr.forwardRef(({className:e,...t},o)=>(0,ht.jsx)(lh,{ref:o,className:K("flex cursor-default items-center justify-center py-1",e),...t,children:(0,ht.jsx)(_r,{className:"h-3.5 w-3.5"})}));dI.displayName=lh.displayName;var eo=Yr.forwardRef(({className:e,children:t,position:o="popper",...a},r)=>{let n=xa();return(0,ht.jsx)(nI,{container:n??void 0,children:(0,ht.jsxs)(oh,{ref:r,className:K("relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",o==="popper"&&"data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",e),position:o,...a,children:[(0,ht.jsx)(uI,{}),(0,ht.jsx)(lI,{className:K("p-1",o==="popper"&&"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),children:t}),(0,ht.jsx)(dI,{})]})})});eo.displayName=oh.displayName;var VN=Yr.forwardRef(({className:e,...t},o)=>(0,ht.jsx)(ah,{ref:o,className:K("px-2 py-1.5 text-xs text-muted-foreground",e),...t}));VN.displayName=ah.displayName;var it=Yr.forwardRef(({className:e,children:t,...o},a)=>(0,ht.jsxs)(rh,{ref:a,className:K("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-7 text-xs outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",e),...o,children:[(0,ht.jsx)("span",{className:"absolute right-2 flex h-3.5 w-3.5 items-center justify-center",children:(0,ht.jsx)(sI,{children:(0,ht.jsx)(wn,{className:"h-3.5 w-3.5"})})}),(0,ht.jsx)(iI,{children:t})]}));it.displayName=rh.displayName;var WN=Yr.forwardRef(({className:e,...t},o)=>(0,ht.jsx)(ih,{ref:o,className:K("-mx-1 my-1 h-px bg-border",e),...t}));WN.displayName=ih.displayName;var LI=k(z());var et=k(z(),1);var bt=k(H(),1),sh="Popover",[cI,Tq]=dt(sh,[ql]),Fs=ql(),[$N,Qr]=cI(sh),fI=e=>{let{__scopePopover:t,children:o,open:a,defaultOpen:r,onOpenChange:n,modal:l=!1}=e,i=Fs(t),s=et.useRef(null),[u,d]=et.useState(!1),[f=!1,m]=Et({prop:a,defaultProp:r,onChange:n});return(0,bt.jsx)(vc,{...i,children:(0,bt.jsx)($N,{scope:t,contentId:Pt(),triggerRef:s,open:f,onOpenChange:m,onOpenToggle:et.useCallback(()=>m(h=>!h),[m]),hasCustomAnchor:u,onCustomAnchorAdd:et.useCallback(()=>d(!0),[]),onCustomAnchorRemove:et.useCallback(()=>d(!1),[]),modal:l,children:o})})};fI.displayName=sh;var pI="PopoverAnchor",GN=et.forwardRef((e,t)=>{let{__scopePopover:o,...a}=e,r=Qr(pI,o),n=Fs(o),{onCustomAnchorAdd:l,onCustomAnchorRemove:i}=r;return et.useEffect(()=>(l(),()=>i()),[l,i]),(0,bt.jsx)(Ms,{...n,...a,ref:t})});GN.displayName=pI;var mI="PopoverTrigger",gI=et.forwardRef((e,t)=>{let{__scopePopover:o,...a}=e,r=Qr(mI,o),n=Fs(o),l=ue(t,r.triggerRef),i=(0,bt.jsx)(te.button,{type:"button","aria-haspopup":"dialog","aria-expanded":r.open,"aria-controls":r.contentId,"data-state":yI(r.open),...a,ref:l,onClick:Y(e.onClick,r.onOpenToggle)});return r.hasCustomAnchor?i:(0,bt.jsx)(Ms,{asChild:!0,...n,children:i})});gI.displayName=mI;var uh="PopoverPortal",[jN,KN]=cI(uh,{forceMount:void 0}),hI=e=>{let{__scopePopover:t,forceMount:o,children:a,container:r}=e,n=Qr(uh,t);return(0,bt.jsx)(jN,{scope:t,forceMount:o,children:(0,bt.jsx)(kt,{present:o||n.open,children:(0,bt.jsx)(Qa,{asChild:!0,container:r,children:a})})})};hI.displayName=uh;var zl="PopoverContent",vI=et.forwardRef((e,t)=>{let o=KN(zl,e.__scopePopover),{forceMount:a=o.forceMount,...r}=e,n=Qr(zl,e.__scopePopover);return(0,bt.jsx)(kt,{present:a||n.open,children:n.modal?(0,bt.jsx)(XN,{...r,ref:t}):(0,bt.jsx)(YN,{...r,ref:t})})});vI.displayName=zl;var XN=et.forwardRef((e,t)=>{let o=Qr(zl,e.__scopePopover),a=et.useRef(null),r=ue(t,a),n=et.useRef(!1);return et.useEffect(()=>{let l=a.current;if(l)return Tl(l)},[]),(0,bt.jsx)(kn,{as:so,allowPinchZoom:!0,children:(0,bt.jsx)(xI,{...e,ref:r,trapFocus:o.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:Y(e.onCloseAutoFocus,l=>{l.preventDefault(),n.current||o.triggerRef.current?.focus()}),onPointerDownOutside:Y(e.onPointerDownOutside,l=>{let i=l.detail.originalEvent,s=i.button===0&&i.ctrlKey===!0,u=i.button===2||s;n.current=u},{checkForDefaultPrevented:!1}),onFocusOutside:Y(e.onFocusOutside,l=>l.preventDefault(),{checkForDefaultPrevented:!1})})})}),YN=et.forwardRef((e,t)=>{let o=Qr(zl,e.__scopePopover),a=et.useRef(!1),r=et.useRef(!1);return(0,bt.jsx)(xI,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:n=>{e.onCloseAutoFocus?.(n),n.defaultPrevented||(a.current||o.triggerRef.current?.focus(),n.preventDefault()),a.current=!1,r.current=!1},onInteractOutside:n=>{e.onInteractOutside?.(n),n.defaultPrevented||(a.current=!0,n.detail.originalEvent.type==="pointerdown"&&(r.current=!0));let l=n.target;o.triggerRef.current?.contains(l)&&n.preventDefault(),n.detail.originalEvent.type==="focusin"&&r.current&&n.preventDefault()}})}),xI=et.forwardRef((e,t)=>{let{__scopePopover:o,trapFocus:a,onOpenAutoFocus:r,onCloseAutoFocus:n,disableOutsidePointerEvents:l,onEscapeKeyDown:i,onPointerDownOutside:s,onFocusOutside:u,onInteractOutside:d,...f}=e,m=Qr(zl,o),h=Fs(o);return Cl(),(0,bt.jsx)(bn,{asChild:!0,loop:!0,trapped:a,onMountAutoFocus:r,onUnmountAutoFocus:n,children:(0,bt.jsx)(Fr,{asChild:!0,disableOutsidePointerEvents:l,onInteractOutside:d,onEscapeKeyDown:i,onPointerDownOutside:s,onFocusOutside:u,onDismiss:()=>m.onOpenChange(!1),children:(0,bt.jsx)(xc,{"data-state":yI(m.open),role:"dialog",id:m.contentId,...h,...f,ref:t,style:{...f.style,"--radix-popover-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-popover-content-available-width":"var(--radix-popper-available-width)","--radix-popover-content-available-height":"var(--radix-popper-available-height)","--radix-popover-trigger-width":"var(--radix-popper-anchor-width)","--radix-popover-trigger-height":"var(--radix-popper-anchor-height)"}})})})}),wI="PopoverClose",QN=et.forwardRef((e,t)=>{let{__scopePopover:o,...a}=e,r=Qr(wI,o);return(0,bt.jsx)(te.button,{type:"button",...a,ref:t,onClick:Y(e.onClick,()=>r.onOpenChange(!1))})});QN.displayName=wI;var ZN="PopoverArrow",JN=et.forwardRef((e,t)=>{let{__scopePopover:o,...a}=e,r=Fs(o);return(0,bt.jsx)(wc,{...r,...a,ref:t})});JN.displayName=ZN;function yI(e){return e?"open":"closed"}var bI=fI;var SI=gI,CI=hI,dh=vI;var ch=k(H()),Vl=bI,Wl=SI;var Mn=LI.forwardRef(({className:e,align:t="center",sideOffset:o=4,...a},r)=>{let n=xa();return(0,ch.jsx)(CI,{container:n??void 0,children:(0,ch.jsx)(dh,{ref:r,align:t,sideOffset:o,className:K("z-50 w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",e),...a})})});Mn.displayName=dh.displayName;var rr=k(z());function $l(){let e=new Date;return new Date(e.getFullYear(),e.getMonth(),e.getDate())}function fh(e,t){return new Date(e.getFullYear(),e.getMonth()+t,e.getDate())}function kI(e,t){let o=e.getFullYear(),a=e.getMonth(),r=e.getDate(),n=t.getFullYear(),l=t.getMonth(),i=t.getDate();return o!==n?o<n:a!==l?a<l:r<i}function II(e,t){let a=new Date(e,t,1).getDay(),r=new Date(e,t,1-a),n=[];for(let l=0;l<6;l++){let i=[];for(let s=0;s<7;s++){let u=l*7+s,d=new Date(r.getFullYear(),r.getMonth(),r.getDate()+u);i.push({date:d,inMonth:d.getMonth()===t})}n.push(i)}return n}var Ro=k(H()),tM=["January","February","March","April","May","June","July","August","September","October","November","December"],oM=["Su","Mo","Tu","We","Th","Fr","Sa"],aM=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function RI(e){let t=e.getFullYear(),o=String(e.getMonth()+1).padStart(2,"0"),a=String(e.getDate()).padStart(2,"0");return`${t}-${o}-${a}`}function rM(e,t){return!!e&&e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()&&e.getDate()===t.getDate()}function kc({selected:e,onSelect:t,minDate:o}){let a=o??$l(),r=e??a,[n,l]=rr.useState(()=>new Date(r.getFullYear(),r.getMonth(),1));rr.useEffect(()=>{e&&l(new Date(e.getFullYear(),e.getMonth(),1))},[e]);let i=rr.useMemo(()=>II(n.getFullYear(),n.getMonth()),[n]),s=rr.useCallback(()=>l(d=>TI(fh(d,-1))),[]),u=rr.useCallback(()=>l(d=>TI(fh(d,1))),[]);return(0,Ro.jsxs)("div",{className:"lintel-calendar","data-testid":"lintel-calendar",children:[(0,Ro.jsxs)("div",{className:"lintel-calendar-head",children:[(0,Ro.jsx)("button",{type:"button",onClick:s,"aria-label":"Previous month","data-testid":"lintel-calendar-prev",className:"lintel-calendar-nav",children:(0,Ro.jsx)(ss,{className:"h-4 w-4","aria-hidden":!0})}),(0,Ro.jsxs)("span",{className:"lintel-calendar-title","aria-live":"polite",children:[tM[n.getMonth()]," ",n.getFullYear()]}),(0,Ro.jsx)("button",{type:"button",onClick:u,"aria-label":"Next month","data-testid":"lintel-calendar-next",className:"lintel-calendar-nav",children:(0,Ro.jsx)(us,{className:"h-4 w-4","aria-hidden":!0})})]}),(0,Ro.jsx)("div",{className:"lintel-calendar-weekdays","aria-hidden":!0,children:oM.map((d,f)=>(0,Ro.jsx)("span",{className:"lintel-calendar-weekday",children:d},f))}),(0,Ro.jsx)("div",{className:"lintel-calendar-grid",role:"grid",children:i.map((d,f)=>d.map(m=>{let h=kI(m.date,a),y=rM(e,m.date),g=`${m.date.getDate()} ${aM[m.date.getMonth()]} ${m.date.getFullYear()}`;return(0,Ro.jsx)("button",{type:"button",role:"gridcell","data-testid":"lintel-calendar-day","data-date":RI(m.date),"data-outside":m.inMonth?void 0:"","data-selected":y?"":void 0,"aria-label":g,"aria-disabled":h||void 0,"aria-pressed":y,disabled:h,tabIndex:h?-1:0,onClick:()=>{h||t(m.date)},className:K("lintel-calendar-day",!m.inMonth&&"lintel-calendar-day--outside",h&&"lintel-calendar-day--disabled",y&&"lintel-calendar-day--selected"),children:m.date.getDate()},RI(m.date))}))})]})}function TI(e){return new Date(e.getFullYear(),e.getMonth(),1)}var Ee=k(H()),Gl="__all_buildings__",_s="__all__";function PI({value:e,options:t,onChange:o,className:a,testId:r="lintel-building"}){return(0,Ee.jsxs)(po,{value:e,onValueChange:o,children:[(0,Ee.jsx)(Jt,{className:K("lintel-control w-full md:w-[150px]",a),"data-testid":r,children:(0,Ee.jsx)(mo,{placeholder:"Building"})}),(0,Ee.jsxs)(eo,{children:[(0,Ee.jsx)(it,{value:Gl,children:"All buildings"}),t.map((n,l)=>(0,Ee.jsx)(it,{value:n.value||Gl,children:n.text},`${n.value||n.text}-${l}`))]})]})}function EI({value:e,options:t,onChange:o,className:a,testId:r="lintel-roomtype"}){return(0,Ee.jsxs)(po,{value:e,onValueChange:o,children:[(0,Ee.jsx)(Jt,{className:K("lintel-control w-full md:w-[160px]",a),"data-testid":r,children:(0,Ee.jsx)(mo,{placeholder:"All rooms"})}),(0,Ee.jsxs)(eo,{children:[(0,Ee.jsx)(it,{value:_s,children:"All rooms"}),t.map((n,l)=>(0,Ee.jsx)(it,{value:n.value||n.text,children:n.text},`${n.value||n.text}-${l}`))]})]})}function Ic({start:e,end:t,fromOptions:o,toOptions:a,onStartChange:r,onEndChange:n}){return(0,Ee.jsxs)("div",{className:"flex w-full items-center gap-1",children:[(0,Ee.jsxs)(po,{value:e,onValueChange:r,children:[(0,Ee.jsx)(Jt,{className:"lintel-control w-full flex-1 md:w-[88px] md:flex-none lintel-mono","data-testid":"lintel-window-start",children:(0,Ee.jsx)(mo,{placeholder:"start"})}),(0,Ee.jsx)(eo,{children:o.map(l=>(0,Ee.jsx)(it,{value:l,className:"lintel-mono",children:l},l))})]}),(0,Ee.jsx)("span",{className:"text-muted-foreground",children:"-"}),(0,Ee.jsxs)(po,{value:t,onValueChange:n,children:[(0,Ee.jsx)(Jt,{className:"lintel-control w-full flex-1 md:w-[88px] md:flex-none lintel-mono","data-testid":"lintel-window-end",children:(0,Ee.jsx)(mo,{placeholder:"end"})}),(0,Ee.jsx)(eo,{children:a.map(l=>(0,Ee.jsx)(it,{value:l,className:"lintel-mono",children:l},l))})]})]})}function AI({selected:e,onSelect:t,triggerLabel:o,testId:a="lintel-date-picker"}){return(0,Ee.jsxs)(Vl,{children:[(0,Ee.jsx)(Wl,{asChild:!0,children:(0,Ee.jsx)("button",{type:"button","data-testid":a,"aria-label":"Pick a date",className:"lintel-date-picker-trigger lintel-control lintel-press flex shrink-0 flex-col items-center justify-center whitespace-nowrap border border-border bg-transparent px-2.5 text-[12px] leading-tight text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",children:o})}),(0,Ee.jsx)(Mn,{align:"start",className:"w-auto p-2",children:(0,Ee.jsx)(kc,{selected:e,minDate:$l(),onSelect:t})})]})}var tt=k(z());function MI(e){let t=(e||"").trim();return!!(!t||/^-+$/.test(t)||/please\s*select/i.test(t)||/^resource\s*type$/i.test(t)||/^all\s+buildings$/i.test(t)||/^all\s+campus$/i.test(t)||/^select(\s|$)/i.test(t))}function DI(e){let t=[],o=e.options?Array.from(e.options):[];for(let a of o){let r=(a.textContent||"").trim();MI(r)||t.push({value:a.value??"",text:r})}return t}function NI(e){let t=[];try{e.querySelectorAll('.select2-results__option, li[role="option"], .select2-selection__rendered [data-value]').forEach(a=>{let r=a,n=(r.textContent||"").trim();if(MI(n))return;let l=r.getAttribute("data-value")||r.getAttribute("data-select2-id")||n;t.push({value:l,text:n})})}catch{}return t}function nM(e){let t=new Set,o=[];for(let a of e)for(let r of a){let n=r.value||r.text;t.has(n)||(t.add(n),o.push(r))}return o}function lM(e,t){let o=new RegExp(e,"i");return Array.from(document.querySelectorAll("select")).filter(r=>r.id===t?!1:o.test(r.id||"")||o.test(r.getAttribute("name")||""))}function ph(e,t){let o=[],a=document.getElementById(e),r=a?a.tagName:"none";a&&a.options&&o.push(DI(a));let n=new Set;for(let u of t)for(let d of lM(u,e))n.add(d);for(let u of n)o.push(DI(u));a&&a.parentElement&&o.push(NI(a.parentElement));let l=document.getElementById(`select2-${e}-container`)?.closest(".select2");l&&o.push(NI(l));let i=nM(o),s={options:i};return i.length===0&&(s.diagnostics={id:e,tag:r,count:0,sampleTexts:[],source:"none"}),s}function mh(e){try{let t=document.getElementById(e);if(!t)return;t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0}))}catch{}}function BI(e){let t=(r,n,l)=>{if(r)try{r.dispatchEvent(new Event(n,{bubbles:!0,cancelable:!0,...l}))}catch{}},o=(r,n)=>{if(r)try{r.dispatchEvent(new MouseEvent(n,{bubbles:!0,cancelable:!0}))}catch{t(r,n)}},a=r=>{if(r){try{r.focus?.({preventScroll:!0})}catch{}try{r.dispatchEvent(new FocusEvent("focus",{bubbles:!1})),r.dispatchEvent(new FocusEvent("focusin",{bubbles:!0}))}catch{}}};try{let r=e.form?document.getElementById(e.form):null;r&&(t(r,"rbs:engage"),o(r,"mousedown"),t(r,"focusin"));for(let n of[e.campus,e.building,e.resourceType]){let l=document.getElementById(n);l&&(a(l),o(l,"mousedown"),o(l,"mouseup"),t(l,"input"),t(l,"change"))}}catch{}}function gh(e,t){try{console.info(`[rbs-diag] ${e}: id=#${t.id} tag=${t.tag} count=${t.count} sample=[${t.sampleTexts.join(", ")}]`)}catch{}}var V=k(H()),To="__all__",to="__all_buildings__",Bn="__all_labs__";function Rc(e){let t=e.find(o=>/discussion/i.test(o.text));return t?t.value||t.text:To}function _I(e){let t=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e);if(!t)return null;let[,o,a,r]=t;return new Date(Number(o),Number(a)-1,Number(r))}var iM=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function jl(e){let t=/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec((e||"").trim());if(!t)return null;let o=Number(t[1]),a=iM.indexOf(t[2]),r=Number(t[3]);return a<0?null:new Date(r,a,o)}function xh(e){if(!e||Number.isNaN(e.getTime()))return"";let t=e.getFullYear(),o=String(e.getMonth()+1).padStart(2,"0"),a=String(e.getDate()).padStart(2,"0");return`${t}-${o}-${a}`}function OI(e){let t=document.getElementById(e);return{id:e,tag:t?t.tagName:"none",count:t&&t.options?t.options.length:0,sampleTexts:t?Array.from(t.options).slice(0,4).map(o=>(o.textContent||"").trim()):[],source:"none"}}function Hs(){let e=ph(gt.building,["building"]),t=ph(gt.resourceType,["resourcetype","resource","type"]);return{buildings:e.options,roomTypes:t.options,buildingDiag:e.options.length===0?OI(gt.building):void 0,roomTypeDiag:t.options.length===0?OI(gt.resourceType):void 0}}function HI({searching:e,onForm:t,onForceReload:o,onSearch:a,loadOnDateChange:r,statusLine:n,searchRef:l,initialForm:i,onBuildingDrilldown:s}){let u=tt.useMemo(()=>MC(7),[]),d=tt.useRef(i?.roomType?{value:i.roomType,text:i.roomTypeLabel}:null),f=E=>{let _=d.current;return!_||E.some(se=>(se.value||se.text)===_.value)?E:[...E,_]},[m,h]=tt.useState(()=>{let E=Hs();return{...E,roomTypes:f(E.roomTypes)}}),{buildings:y,roomTypes:g,buildingDiag:x,roomTypeDiag:p}=m,[c,v]=tt.useState(()=>{let E=Hs(),_=u.findIndex(Ue=>Ue.isToday)>=0?u.findIndex(Ue=>Ue.isToday):0,se=Fl(),le=nc({fromOptions:se,toOptions:se,fallback:Ml}),Re=le.start||Ml.start,st=le.end||Ml.end;if(i){let Ue=jl(i.dateLabel)?.getTime(),jt=u.findIndex(ia=>jl(ia.label)?.getTime()===Ue);return{category:"facility",location:Bn,building:i.building||to,roomType:i.roomType||To,capacity:"0",search:"",dateIndex:jt>=0?jt:-1,pickedLabel:jt>=0?"":i.dateLabel,windowStart:i.windowStart||Re,windowEnd:i.windowEnd||st,sort:"name"}}return{category:"facility",location:Bn,building:to,roomType:Rc(E.roomTypes),capacity:"0",search:"",dateIndex:_,pickedLabel:"",windowStart:Re,windowEnd:st,sort:"name"}}),w=tt.useRef({start:c.windowStart,end:c.windowEnd});w.current={start:c.windowStart,end:c.windowEnd};let b=tt.useMemo(()=>Fl(c.windowStart,c.windowEnd),[c.windowStart,c.windowEnd]),L=tt.useRef(!!i),[C,S]=tt.useState(!1),[T,P]=tt.useState([]),[q,M]=tt.useState([]),[X,R]=tt.useState(""),U=tt.useRef(!1),B=tt.useCallback((E,_)=>{let se=f(_);h(le=>({...le,buildings:E,roomTypes:se,buildingDiag:void 0,roomTypeDiag:void 0})),v(le=>{let Re=le.category==="equipment"||le.roomType===To||se.some(jt=>(jt.value||jt.text)===le.roomType),st=le.building===to||E.some(jt=>jt.value===le.building),Ue;return!L.current&&le.roomType===To?Ue=Rc(se):Re?Ue=le.roomType:Ue=To,{...le,building:st?le.building:to,roomType:Ue}})},[]);tt.useEffect(()=>{let E=!1;return(async()=>{let _=await rc();if(E)return;_&&_.buildings.length>0&&_.roomTypes.length>0&&(U.current=!0,B(_.buildings,_.roomTypes),!i&&(_.windowStart||_.windowEnd)&&v(le=>({...le,windowStart:_.windowStart||le.windowStart,windowEnd:_.windowEnd||le.windowEnd})));let se={building:"",roomType:"",minCapacity:0,search:"",date:fL(new Date),window:{start:$t.start,end:$t.end},sort:"name"};try{let le=await bg(se);if(E)return;let Re=cL(le);pL(Re)||(U.current=!0,B(Re.buildings,Re.roomTypes),Bg({buildings:Re.buildings,roomTypes:Re.roomTypes,windowStart:_?.windowStart??w.current.start,windowEnd:_?.windowEnd??w.current.end}))}catch{}})(),()=>{E=!0}},[]),tt.useEffect(()=>{let E=!1,_=()=>{if(E)return;let $e=Hs();U.current||($e.roomTypes=f($e.roomTypes),h($e),v(ot=>{let qn=ot.category==="equipment"||ot.roomType===To||$e.roomTypes.some($=>($.value||$.text)===ot.roomType),sa=ot.building===to||$e.buildings.some($=>$.value===ot.building),Oa;return!L.current&&ot.roomType===To?Oa=Rc($e.roomTypes):qn?Oa=ot.roomType:Oa=To,{...ot,building:sa?ot.building:to,roomType:Oa}}))},se=Nl(),le=se?se.subscribe(_):()=>{},Re=[gt.campus,gt.building,gt.resourceType],st=()=>_(),Ue=[];for(let $e of Re){let ot=document.getElementById($e);ot&&(ot.addEventListener("change",st),Ue.push(ot))}document.addEventListener("rbs:ready",st);let jt=[gt.building,gt.resourceType],ia=3,en={},li=4,Ws=0,$s=()=>{Ws>=li||(Ws+=1,BI({form:"nativeForm",campus:gt.campus,building:gt.building,resourceType:gt.resourceType}))},Gs=()=>{let $e=Hs();if(($e.buildings.length===0||$e.roomTypes.length===0)&&$s(),$e.buildings.length===0){let ot=en[gt.building]??0;ot<ia&&(en[gt.building]=ot+1,mh(gt.building))}if($e.roomTypes.length===0){let ot=en[gt.resourceType]??0;ot<ia&&(en[gt.resourceType]=ot+1,mh(gt.resourceType))}},Ba=null,lr,Hn;try{if($s(),Ba=typeof MutationObserver<"u"?new MutationObserver(()=>{E||_()}):null,Ba)for(let sa of Re){let Oa=document.getElementById(sa);Oa&&Ba.observe(Oa,{childList:!0,subtree:!0})}let $e=200,ot=3e3,qn=0;lr=setInterval(()=>{E||(qn+=$e,Gs(),_(),qn>=ot&&lr&&clearInterval(lr))},$e),Hn=setTimeout(()=>{if(E)return;let sa=Hs();sa.buildingDiag&&gh("building",sa.buildingDiag),sa.roomTypeDiag&&gh("resourceType",sa.roomTypeDiag),_()},5e3)}catch($e){console.error("[rbs-lintel] cascade-kick/discovery failed",$e)}return()=>{E=!0,lr&&clearInterval(lr),Hn&&clearTimeout(Hn),Ba?.disconnect(),le();for(let $e of Ue)$e.removeEventListener("change",st);document.removeEventListener("rbs:ready",st)}},[]);let A=tt.useCallback(E=>({category:E.category,location:E.location===Bn?"":E.location,building:E.building===to?"":E.building,roomType:E.roomType===To?"":hh(E.roomType,E.category==="equipment"?T:g),minCapacity:Number(E.capacity)||0,search:E.search,date:E.dateIndex===-1?E.pickedLabel:u[E.dateIndex]?.label??"",window:{start:E.windowStart,end:E.windowEnd},sort:E.sort}),[u,g,T]),N=tt.useRef(!1);tt.useEffect(()=>{if(N.current)return;if(N.current=!0,i){de();return}let E=A(c);Nl()?.applyForm(E),t(E)},[]);let O=tt.useCallback(E=>{v(_=>{let se={..._,...E},le=A(se);return Nl()?.applyForm(le),t(le),se})},[A,t]);function Q(E){E&&pe({dateIndex:-1,pickedLabel:E})}async function ae(E){M([]);try{M(await wC(E)),R("")}catch(_){R(`Could not load labs: ${_.message}`)}}async function he(E){if(E===c.category)return;if(E==="facility"){O({category:E,roomType:Rc(g),location:Bn}),R("");return}let _=T;try{_.length===0&&(_=await xC())}catch(st){R(`Could not load equipment: ${st.message}`);return}if(_.length===0){R("RBS returned no equipment types.");return}R(""),P(_);let se=_[0].value,le={...c,category:E,roomType:se,location:Bn,building:to};v(le);let Re={...A(le),roomType:_[0].text};Nl()?.applyForm(Re),t(Re),ae(se)}function pe(E){let _={...c,...E};if(!r){O(E);return}A(_).date!==A(c).date&&(v(_),de(_))}function de(E=c){let _=A(E);Nl()?.applyForm(_),t(_),a?.(E.category==="equipment"?void 0:we(E)),o?.(),y.length>0&&g.length>0&&Bg({buildings:y,roomTypes:g,windowStart:E.windowStart,windowEnd:E.windowEnd})}function we(E){let _=E.dateIndex===-1?E.pickedLabel:u[E.dateIndex]?.label??"",se=xh(jl(_));return{building:c.building===to?"":c.building,buildingLabel:c.building===to?"":vh(c.building,y),roomType:{value:c.roomType===To?"":c.roomType,text:c.roomType===To?"":hh(c.roomType,g)},dateIso:se,dateLabel:_,windowStart:c.windowStart,windowEnd:c.windowEnd}}let ct=c.category==="equipment",J=hh(c.roomType,ct?T:g),Fe=ct?q.find(E=>E.value===c.location)?.text??"All labs":vh(c.building,y);return(0,V.jsxs)("div",{"data-testid":"lintel-topbar",className:"lintel-topbar flex flex-col gap-3 bg-card pb-3 pt-5",children:[(0,V.jsxs)("div",{children:[(0,V.jsx)("h1",{className:"lintel-topbar-title",children:"New Booking"}),(0,V.jsxs)("p",{"data-testid":"lintel-statusbar",className:"lintel-screen-sub flex flex-wrap items-center gap-x-4",role:"status","aria-live":"polite",children:[(0,V.jsx)("span",{children:(c.dateIndex===-1?c.pickedLabel:u[c.dateIndex]?.label)||"-"}),(0,V.jsx)("span",{children:J}),(0,V.jsxs)("span",{children:[c.windowStart,"-",c.windowEnd]}),n]})]}),(0,V.jsxs)("button",{type:"button","data-testid":"lintel-filters-toggle","aria-expanded":C,onClick:()=>S(E=>!E),className:"lintel-control flex w-full items-center justify-between gap-2 rounded-md border border-border bg-secondary px-3 text-[13px] text-foreground md:hidden",children:[(0,V.jsxs)("span",{className:"min-w-0 truncate",children:[Fe,", ",J,","," ",(0,V.jsxs)("span",{className:"lintel-mono",children:[c.windowStart,"-",c.windowEnd]})]}),(0,V.jsx)(_r,{className:K("h-4 w-4 shrink-0 transition-transform",C&&"rotate-180"),"aria-hidden":!0})]}),(0,V.jsxs)("div",{className:K("flex-wrap items-end gap-x-3 gap-y-2 md:!flex",C?"flex":"hidden"),children:[(0,V.jsxs)("div",{className:"flex w-full flex-wrap items-end gap-2 md:w-auto","data-testid":"lintel-group-filters",role:"group","aria-label":"Filters",children:[(0,V.jsxs)(Zr,{label:"Category",children:[(0,V.jsxs)("div",{"data-testid":"lintel-category-toggle",role:"group","aria-label":"Booking category",className:"lintel-segmented inline-flex items-center rounded-md border border-border bg-secondary p-0.5",children:[(0,V.jsx)("button",{type:"button","data-testid":"lintel-category-facility","aria-pressed":c.category==="facility",onClick:()=>he("facility"),className:K("lintel-segmented-btn px-2.5 py-1 text-[13px] font-medium transition-colors",c.category==="facility"?"lintel-segmented-btn--active":"text-muted-foreground"),children:"Facility"}),(0,V.jsx)("button",{type:"button","data-testid":"lintel-category-equipment","aria-pressed":c.category==="equipment",onClick:()=>he("equipment"),className:K("lintel-segmented-btn px-2.5 py-1 text-[13px] font-medium transition-colors",c.category==="equipment"?"lintel-segmented-btn--active":"text-muted-foreground"),children:"Equipment"})]}),X&&(0,V.jsx)("div",{role:"alert",className:"mt-1 text-[12px] text-destructive","data-testid":"lintel-equipment-error",children:X})]}),c.category==="equipment"&&(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(Zr,{label:"Type",children:(0,V.jsxs)(po,{value:c.roomType,onValueChange:E=>{O({roomType:E,location:Bn}),ae(E)},children:[(0,V.jsx)(Jt,{className:"lintel-control w-full md:w-[160px]","data-testid":"lintel-equipment-type",children:(0,V.jsx)(mo,{placeholder:"Type"})}),(0,V.jsx)(eo,{children:T.map(E=>(0,V.jsx)(it,{value:E.value,children:E.text},E.value))})]})}),(0,V.jsx)(Zr,{label:"Lab",children:(0,V.jsxs)(po,{value:c.location,onValueChange:E=>O({location:E}),children:[(0,V.jsx)(Jt,{className:"lintel-control w-full md:w-[220px]","data-testid":"lintel-equipment-lab",children:(0,V.jsx)(mo,{placeholder:"All labs"})}),(0,V.jsxs)(eo,{children:[(0,V.jsx)(it,{value:Bn,children:"All labs"}),q.map(E=>(0,V.jsx)(it,{value:E.value,children:E.text},E.value))]})]})})]}),c.category==="facility"&&(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(Zr,{label:"Building",children:(0,V.jsxs)(po,{value:c.building,onValueChange:E=>{let _=E===to;O({building:_?to:E}),s?.(_?"":E,_?"":vh(E,y))},children:[(0,V.jsx)(Jt,{className:"lintel-control w-full md:w-[150px]","data-testid":"lintel-building",children:(0,V.jsx)(mo,{placeholder:"Building"})}),(0,V.jsxs)(eo,{children:[(0,V.jsx)(it,{value:to,children:"All buildings"}),y.map((E,_)=>(0,V.jsx)(it,{value:E.value||to,children:E.text},`${E.value||E.text}-${_}`))]})]})}),(0,V.jsx)(Zr,{label:"Type",children:(0,V.jsxs)(po,{value:c.roomType,onValueChange:E=>{L.current=!0,O({roomType:E})},children:[(0,V.jsx)(Jt,{className:"lintel-control w-full md:w-[160px]","data-testid":"lintel-roomtype",children:(0,V.jsx)(mo,{placeholder:"All rooms"})}),(0,V.jsxs)(eo,{children:[(0,V.jsx)(it,{value:To,children:"All rooms"}),g.map((E,_)=>(0,V.jsx)(it,{value:E.value||E.text,children:E.text},`${E.value||E.text}-${_}`))]})]})})]}),(0,V.jsx)(Zr,{label:"Find",children:(0,V.jsx)(Lo,{ref:l,type:"text",placeholder:c.category==="equipment"?"item name":"room name",value:c.search,onChange:E=>O({search:E.target.value}),className:"lintel-control w-full md:w-[150px]","data-testid":"lintel-search"})}),(x||p)&&(0,V.jsxs)("div",{"data-testid":"lintel-filter-diag",className:"basis-full text-[12px] leading-tight text-muted-foreground",role:"note",children:[x&&(0,V.jsx)(FI,{label:"building",d:x}),p&&(0,V.jsx)(FI,{label:"type",d:p})]})]}),(0,V.jsxs)("div",{className:"flex w-full flex-wrap items-end gap-2 md:ml-auto md:w-auto","data-testid":"lintel-group-query",role:"group","aria-label":"Query",children:[(0,V.jsx)(Zr,{label:"Window",children:(0,V.jsx)(Ic,{start:c.windowStart,end:c.windowEnd,fromOptions:b,toOptions:b,onStartChange:E=>O({windowStart:E}),onEndChange:E=>O({windowEnd:E})})}),(0,V.jsx)(Zr,{label:"Sort",children:(0,V.jsxs)(po,{value:c.sort,onValueChange:E=>O({sort:E}),children:[(0,V.jsx)(Jt,{className:"lintel-control w-full md:w-[150px]","data-testid":"lintel-sort",children:(0,V.jsx)(mo,{})}),(0,V.jsxs)(eo,{children:[(0,V.jsx)(it,{value:"name",children:"Room name"}),(0,V.jsx)(it,{value:"capacity",children:"Capacity (desc)"})]})]})}),(0,V.jsxs)(ee,{className:"w-full md:w-auto md:min-w-[116px]",onClick:e?void 0:()=>de(),"aria-busy":e||void 0,"data-testid":"lintel-search-btn",children:[e?(0,V.jsx)(va,{className:"h-3.5 w-3.5 animate-spin motion-reduce:animate-none"}):(0,V.jsx)(gs,{className:"h-3.5 w-3.5"}),e?"Searching\u2026":"Search"]})]})]}),(0,V.jsxs)("div",{className:"flex flex-nowrap items-center gap-1 overflow-x-auto md:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden","data-testid":"lintel-datechips",children:[u.map((E,_)=>(0,V.jsxs)("button",{type:"button","aria-pressed":c.dateIndex===_,onClick:()=>pe({dateIndex:_,pickedLabel:""}),className:K("lintel-press flex h-11 min-w-[64px] shrink-0 flex-col items-center justify-center border px-2 text-[12px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",c.dateIndex===_?"border-foreground bg-foreground text-background":"border-transparent bg-transparent text-foreground hover:bg-accent"),children:[(0,V.jsx)("span",{className:"opacity-70",children:E.weekday}),(0,V.jsx)("span",{className:"lintel-mono font-medium",children:E.label.replace(/ \d{4}$/,"")})]},E.label)),c.dateIndex===-1&&c.pickedLabel&&(0,V.jsx)("span",{"data-testid":"lintel-date-pill","aria-current":"date",className:"lintel-date-pill flex h-11 shrink-0 items-center whitespace-nowrap border border-foreground bg-foreground px-2.5 text-[12px] font-medium leading-tight text-background lintel-mono",children:c.pickedLabel}),(0,V.jsxs)(Vl,{children:[(0,V.jsx)(Wl,{asChild:!0,children:(0,V.jsxs)("button",{type:"button","data-testid":"lintel-date-picker","aria-label":"Pick another date",className:"lintel-date-picker-trigger lintel-press flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border border-border bg-transparent px-3 text-[13px] text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",children:[(0,V.jsx)(is,{className:"h-4 w-4","aria-hidden":!0}),"Pick date"]})}),(0,V.jsx)(Mn,{align:"start",className:"w-auto p-2",children:(0,V.jsx)(kc,{selected:c.dateIndex===-1?jl(c.pickedLabel):null,minDate:$l(),onSelect:E=>Q(Wr(E))})})]})]})]})}function hh(e,t){if(e===To)return"All rooms";let o=t.find(a=>(a.value||a.text)===e);return o?o.text:e}function vh(e,t){if(e===to)return"All buildings";let o=t.find(a=>(a.value||a.text)===e);return o?o.text:e}function FI({label:e,d:t}){return(0,V.jsxs)("div",{"data-testid":`lintel-filter-diag-${e}`,children:[e,": tried #",t.id," (",t.tag,"), ",t.count," option",t.count===1?"":"s",t.sampleTexts.length?`: ${t.sampleTexts.join(", ")}`:": none found"]})}function Zr({label:e,children:t}){return(0,V.jsxs)("div",{className:"flex w-full flex-col gap-1 md:w-auto",children:[(0,V.jsx)(mt,{children:e}),t]})}var Kl=k(z()),qI="(max-width:767px)";function Xl(){let e=Kl.useCallback(()=>{if(typeof window>"u"||typeof window.matchMedia!="function")return!1;try{return window.matchMedia(qI).matches}catch{return!1}},[]),[t,o]=Kl.useState(e);return Kl.useEffect(()=>{if(typeof window>"u"||typeof window.matchMedia!="function")return;let a;try{a=window.matchMedia(qI)}catch{return}let r=()=>o(a.matches);return r(),a.addEventListener("change",r),()=>a.removeEventListener("change",r)},[]),t}var I=k(H()),Tc=["Resource Name","Date","Time","Supporter","Purpose","Status","Booking ID","Action"],sM=[{label:"Upcoming",value:"current"},{label:"Pending",value:"pending"},{label:"Past",value:"past"}];function Pc({label:e,children:t}){return(0,I.jsxs)("div",{className:"mt-1 flex gap-2 text-[12px]",children:[(0,I.jsx)("span",{className:"shrink-0 text-muted-foreground",children:e}),(0,I.jsx)("span",{className:"min-w-0 text-foreground",children:t})]})}function uM({navigate:e,onSessionExpired:t}){let[o,a]=ye.useState("current"),[r,n]=ye.useState(1),[l,i]=ye.useState({kind:"init"}),[s,u]=ye.useState(0),[d,f]=ye.useState(null),[m,h]=ye.useState(null),y=Xl(),{toasts:g,push:x,dismiss:p}=er(),[c,v]=ye.useState({});ye.useEffect(()=>{let S=!1,T=jC(o,r),P=q=>{$C({bookingStatus:o,resourceCategoryID:r}).then(M=>{S||(q!==null&&!KC(q,M.rows)&&x("My Bookings updated","Your bookings were refreshed with the latest from RBS."),i({kind:"ready",rows:M.rows}),Is().then(X=>{let R=X?{byKey:{...X.byKey},side:X.side}:{byKey:{}};R.byKey[T]={rows:M.rows,ts:Date.now()},Tg(R)}))}).catch(M=>{if(!S){if(M instanceof Se&&M.sessionExpired){i({kind:"session-expired"}),t();return}i({kind:"error",message:M.message||"could not load bookings"})}})};return Is().then(q=>{if(S)return;let M=q?.byKey[T];M?(i({kind:"ready",rows:M.rows}),P(M.rows)):(i({kind:"loading"}),P(null))}),()=>{S=!0}},[o,r,s,x,t]);let w=ye.useMemo(()=>l.kind!=="ready"?[]:l.rows.map(S=>{let T=Array.isArray(S)?S.map(M=>M==null?"":String(M)):[],P=OC(S),q=P!==null&&FC(T[Bl]??"",o);return{cells:T,plainId:P,cancellable:q}}),[l,o]);ye.useEffect(()=>{if(w.length===0){v({});return}let S=!1;return Al().then(T=>{if(S)return;let P={};for(let q of w){let M=q.cells[0]??"";!M||P[M]!==void 0||(P[M]=sC(T,M))}v(P)}),()=>{S=!0}},[w]);let b=ye.useCallback((S,T)=>{if(!T.plainId||m!==null)return;h(S);let P=`${T.cells[0]??"Booking"} \xB7 ${T.cells[1]??""} ${T.cells[2]??""}`.trim();SC(T.plainId).then(q=>{f({encryptedId:q,label:P})}).catch(q=>{x("Could not start cancellation",q instanceof Error?q.message:String(q))}).finally(()=>h(null))},[m,x]),L=ye.useCallback((S,T)=>{T?x("Cancellation successful","Your bookings have been refreshed to reflect the result."):x("Cancellation sent, awaiting confirmation","We could not confirm the result; your bookings will refresh to show the real outcome."),u(P=>P+1)},[x]);return(0,I.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-dash-bookings",children:[(0,I.jsxs)(Fo,{className:"lintel-dash-panel-head flex flex-wrap items-center justify-between gap-2",children:[(0,I.jsx)(_o,{children:"My Bookings"}),(0,I.jsx)(ee,{size:"sm","data-testid":"lintel-dash-new-booking",onClick:()=>e($r),children:"New Booking"})]}),(0,I.jsx)(Rm,{value:o,onValueChange:S=>a(S),className:"mb-2.5",children:(0,I.jsx)(Id,{"data-testid":"lintel-dash-tabs",className:"flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap",children:sM.map(S=>(0,I.jsx)(ns,{value:S.value,"data-testid":`lintel-dash-tab-${S.value}`,className:"min-h-[44px] shrink-0 md:min-h-0",children:S.label},S.value))})}),(0,I.jsx)(Rm,{value:String(r),onValueChange:S=>n(Number(S)),className:"mb-3 inline-flex",children:(0,I.jsxs)(Id,{className:"lintel-dash-toggle","data-testid":"lintel-dash-category",children:[(0,I.jsx)(ns,{value:"1",className:"lintel-dash-toggle-btn","data-testid":"lintel-dash-category-facility",children:"Facility"}),(0,I.jsx)(ns,{value:"2",className:"lintel-dash-toggle-btn","data-testid":"lintel-dash-category-equipment",children:"Equipment"})]})}),y?(0,I.jsxs)("div",{className:"flex flex-col gap-2","data-testid":"lintel-dash-cardlist",children:[l.kind==="ready"&&w.map((S,T)=>{let P=/^\s*cancelled/i.test(S.cells[Bl]??"");return(0,I.jsxs)("div",{"data-testid":"lintel-dash-row",className:K("lintel-dash-bookingcard",P&&"lintel-dash-row-cancelled"),children:[(0,I.jsxs)("div",{className:"flex items-start justify-between gap-2",children:[(0,I.jsxs)("div",{className:"flex min-w-0 items-center gap-2 font-semibold text-foreground",children:[(0,I.jsx)(ks,{src:c[S.cells[0]??""]??"",roomCode:S.cells[0]??"",equipment:r===2}),(0,I.jsx)("span",{className:"min-w-0",children:S.cells[0]??""})]}),(0,I.jsx)("span",{className:"lintel-dash-status shrink-0","data-testid":"lintel-dash-status",children:S.cells[Bl]??""})]}),(0,I.jsxs)(Pc,{label:"Date \xB7 Time",children:[S.cells[1]??""," \xB7 ",S.cells[2]??""]}),(0,I.jsx)(Pc,{label:"Supporter",children:S.cells[3]??""}),(0,I.jsx)(Pc,{label:"Purpose",children:S.cells[4]??""}),(0,I.jsx)(Pc,{label:"Booking ID",children:(0,I.jsx)("span",{className:"lintel-mono break-all text-muted-foreground",children:S.cells[6]??""})}),(0,I.jsx)("div",{className:"mt-1",children:S.cancellable?(0,I.jsx)(ee,{size:"sm",variant:"outline",className:"w-full border-destructive/60 text-destructive hover:bg-destructive/10",onClick:()=>b(T,S),disabled:m!==null,"aria-busy":m===T||void 0,"data-testid":"lintel-dash-cancel",children:m===T?"Preparing\u2026":"Cancel"}):(0,I.jsx)(ee,{size:"sm",variant:"outline",className:"w-full",disabled:!0,title:"This booking cannot be cancelled","data-testid":"lintel-dash-cancel-disabled",children:"Cancel"})})]},T)}),l.kind==="ready"&&l.rows.length===0&&(0,I.jsx)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-dash-empty-row",children:(0,I.jsxs)("div",{className:"lintel-dash-empty-state",children:[(0,I.jsx)("div",{className:"lintel-dash-empty-title",children:"No bookings made"}),(0,I.jsx)("p",{className:"lintel-dash-empty-note",children:"Nothing here yet. Start one from New Booking."})]})}),l.kind==="loading"&&Array.from({length:3}).map((S,T)=>(0,I.jsxs)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-dash-loading-row",children:[(0,I.jsx)(wt,{className:"h-4 w-2/3"}),(0,I.jsx)(wt,{className:"mt-2 h-4 w-full"}),(0,I.jsx)(wt,{className:"mt-2 h-4 w-1/2"})]},T)),l.kind==="error"&&(0,I.jsxs)("div",{className:"lintel-dash-bookingcard lintel-dash-empty-cell",children:["Could not load bookings (",l.message,")."]})]}):(0,I.jsx)("div",{className:"overflow-auto",children:(0,I.jsxs)(Er,{className:"lintel-dash-table","data-testid":"lintel-dash-table",children:[(0,I.jsx)(Ar,{children:(0,I.jsx)(pt,{children:Tc.map(S=>(0,I.jsx)(Ho,{children:S},S))})}),(0,I.jsxs)(Dr,{children:[l.kind==="ready"&&w.map((S,T)=>{let P=/^\s*cancelled/i.test(S.cells[Bl]??"");return(0,I.jsxs)(pt,{"data-testid":"lintel-dash-row",className:P?"lintel-dash-row-cancelled":void 0,children:[(0,I.jsx)(Le,{children:(0,I.jsxs)("span",{className:"flex items-center gap-2",children:[(0,I.jsx)(ks,{src:c[S.cells[0]??""]??"",roomCode:S.cells[0]??"",equipment:r===2}),(0,I.jsx)("span",{className:"min-w-0",children:S.cells[0]??""})]})}),(0,I.jsx)(Le,{className:"whitespace-nowrap",children:S.cells[1]??""}),(0,I.jsx)(Le,{className:"whitespace-nowrap",children:S.cells[2]??""}),(0,I.jsx)(Le,{children:S.cells[3]??""}),(0,I.jsx)(Le,{children:S.cells[4]??""}),(0,I.jsx)(Le,{className:"whitespace-nowrap",children:(0,I.jsx)("span",{className:"lintel-dash-status","data-testid":"lintel-dash-status",children:S.cells[Bl]??""})}),(0,I.jsx)(Le,{className:"lintel-mono whitespace-nowrap",children:S.cells[6]??""}),(0,I.jsx)(Le,{className:"whitespace-nowrap",children:S.cancellable?(0,I.jsx)(ee,{size:"sm",variant:"outline",className:"border-destructive/60 text-destructive hover:bg-destructive/10",onClick:()=>b(T,S),disabled:m!==null,"aria-busy":m===T||void 0,"data-testid":"lintel-dash-cancel",children:m===T?"Preparing\u2026":"Cancel"}):(0,I.jsx)(ee,{size:"sm",variant:"outline",disabled:!0,title:"This booking cannot be cancelled","data-testid":"lintel-dash-cancel-disabled",children:"Cancel"})})]},T)}),l.kind==="ready"&&l.rows.length===0&&(0,I.jsx)(pt,{"data-testid":"lintel-dash-empty-row",children:(0,I.jsx)(Le,{colSpan:Tc.length,className:"lintel-dash-empty-cell",children:(0,I.jsxs)("div",{className:"lintel-dash-empty-state",children:[(0,I.jsx)("div",{className:"lintel-dash-empty-title",children:"No bookings made"}),(0,I.jsx)("p",{className:"lintel-dash-empty-note",children:"Nothing here yet. Start one from New Booking."})]})})}),l.kind==="loading"&&Array.from({length:3}).map((S,T)=>(0,I.jsx)(pt,{"data-testid":"lintel-dash-loading-row",children:Tc.map(P=>(0,I.jsx)(Le,{children:(0,I.jsx)(wt,{className:"h-4 w-full"})},P))},T)),l.kind==="error"&&(0,I.jsx)(pt,{children:(0,I.jsxs)(Le,{colSpan:Tc.length,className:"lintel-dash-empty-cell",children:["Could not load bookings (",l.message,")."]})})]})]})}),(0,I.jsx)(HC,{encryptedId:d?.encryptedId??null,roomLabel:d?.label,open:d!==null,onOpenChange:S=>{S||f(null)},onCancelled:L}),g.map(S=>(0,I.jsxs)(ya,{open:!0,onOpenChange:T=>{T||p(S.id)},...S.title==="My Bookings updated"?{"data-testid":"lintel-dash-updated-toast"}:{},children:[(0,I.jsxs)("div",{className:"flex flex-col gap-0.5",children:[(0,I.jsx)(ba,{children:S.title}),S.description&&(0,I.jsx)(Sa,{children:S.description})]}),(0,I.jsx)(Bd,{})]},S.id)),(0,I.jsx)(wa,{})]})}function dM({onRevealNative:e,onSessionExpired:t}){let[o,a]=ye.useState({kind:"init"}),{toasts:r,push:n,dismiss:l}=er();if(ye.useEffect(()=>{let d=!1,f=m=>{GC().then(h=>{d||(m&&!XC(m,h)&&n("Credits updated","Your credits and supporter requests were refreshed."),a({kind:"ready",data:h}),Is().then(y=>{let g=y?{byKey:{...y.byKey},side:y.side}:{byKey:{}};g.side={credits:h.credits,supporterRequests:h.supporterRequests,ts:Date.now()},Tg(g)}))}).catch(h=>{if(!d){if(h instanceof Se&&h.sessionExpired){a({kind:"session-expired"}),t();return}a({kind:"error",message:h.message||"could not load credits"})}})};return Is().then(m=>{if(d)return;let h=m?.side;h?(a({kind:"ready",data:{credits:h.credits,supporterRequests:h.supporterRequests}}),f({credits:h.credits,supporterRequests:h.supporterRequests})):(a({kind:"loading"}),f(null))}),()=>{d=!0}},[n,t]),o.kind==="session-expired")return(0,I.jsx)("aside",{className:"lintel-dash-side","data-testid":"lintel-dash-side-expired"});if(o.kind==="init")return(0,I.jsx)("aside",{className:"lintel-dash-side","data-testid":"lintel-dash-side-init"});if(o.kind==="loading")return(0,I.jsxs)("aside",{className:"lintel-dash-side","data-testid":"lintel-dash-side-loading",children:[(0,I.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-dash-credits",children:[(0,I.jsx)(Fo,{className:"lintel-dash-panel-head",children:(0,I.jsx)(_o,{children:"Available Credits"})}),(0,I.jsx)("div",{className:"flex flex-col gap-3",children:Array.from({length:3}).map((d,f)=>(0,I.jsxs)("div",{className:"flex flex-col gap-1.5",children:[(0,I.jsx)(wt,{className:"h-3.5 w-1/2"}),(0,I.jsx)(wt,{className:"h-3 w-3/4"})]},f))})]}),(0,I.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-dash-supporter",children:[(0,I.jsx)(Fo,{className:"lintel-dash-panel-head",children:(0,I.jsx)(_o,{children:"Supporter Requests"})}),(0,I.jsxs)("div",{className:"lintel-dash-supporter-row",children:[(0,I.jsx)(wt,{className:"h-11 w-11 rounded-full"}),(0,I.jsx)(wt,{className:"h-4 w-20"})]})]})]});if(o.kind==="error")return(0,I.jsx)("aside",{className:"lintel-dash-side","data-testid":"lintel-dash-side-error",children:(0,I.jsxs)(Ot,{className:"lintel-dash-panel",children:[(0,I.jsxs)("p",{className:"text-sm text-muted-foreground",children:["Lintel could not load your credits (",o.message,")."]}),(0,I.jsx)(ee,{className:"mt-3",variant:"outline",onClick:e,"data-testid":"lintel-dash-side-reveal",children:"Show the native page"})]})});let{credits:i,supporterRequests:s,seeMoreHref:u}=o.data;return(0,I.jsxs)("aside",{className:"lintel-dash-side","data-testid":"lintel-dash-side",children:[(0,I.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-dash-credits",children:[(0,I.jsxs)(Fo,{className:"lintel-dash-panel-head flex items-center justify-between",children:[(0,I.jsx)(_o,{children:"Available Credits"}),u&&(0,I.jsx)("a",{className:"lintel-link text-xs",href:u,rel:"noopener noreferrer","data-testid":"lintel-dash-seemore",children:"See more"})]}),(0,I.jsx)("ul",{className:"lintel-dash-credit-list","data-testid":"lintel-dash-credit-list",children:i.map((d,f)=>(0,I.jsxs)("li",{className:"lintel-dash-credit","data-testid":"lintel-dash-credit-row",children:[(0,I.jsx)("div",{className:"lintel-dash-credit-label",children:d.label}),(0,I.jsx)("div",{className:"lintel-dash-credit-detail",children:d.detail})]},f))})]}),(0,I.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-dash-supporter",children:[(0,I.jsx)(Fo,{className:"lintel-dash-panel-head",children:(0,I.jsx)(_o,{children:"Supporter Requests"})}),(0,I.jsxs)("div",{className:"lintel-dash-supporter-row",children:[(0,I.jsx)("span",{className:"lintel-dash-supporter-num","data-testid":"lintel-dash-supporter-num",children:s||"0"}),(0,I.jsx)("span",{className:"text-sm text-muted-foreground",children:"Requests"})]})]}),r.map(d=>(0,I.jsxs)(ya,{open:!0,onOpenChange:f=>{f||l(d.id)},...d.title==="Credits updated"?{"data-testid":"lintel-dash-updated-toast"}:{},children:[(0,I.jsxs)("div",{className:"flex flex-col gap-0.5",children:[(0,I.jsx)(ba,{children:d.title}),d.description&&(0,I.jsx)(Sa,{children:d.description})]}),(0,I.jsx)(Bd,{})]},d.id)),(0,I.jsx)(wa,{})]})}function cM({navigate:e}){let[t,o]=ye.useState(null),[a,r]=ye.useState([]),[n,l]=ye.useState([]),[i,s]=ye.useState(Gl),[u,d]=ye.useState({value:"",text:""}),[f,m]=ye.useState(""),[h,y]=ye.useState(""),[g,x]=ye.useState(""),[p,c]=ye.useState("");ye.useEffect(()=>{let S=!1;return Promise.all([oL(),rc()]).then(([T,P])=>{if(S||!T){S||o(T);return}let q=P?.buildings??[],M=P?.roomTypes??[];r(q),l(M),o(T),s(T.building||Gl),d(T.roomType.value?T.roomType:{value:"",text:""}),m(T.dateIso),y(T.dateLabel);let X=Fl(T.windowStart,T.windowEnd),R=nc({fromOptions:X,toOptions:X,seed:{start:T.windowStart,end:T.windowEnd},fallback:Ml});x(R.start),c(R.end)}),()=>{S=!0}},[]);let v=ye.useMemo(()=>Fl(g,p),[g,p]),w=ye.useMemo(()=>a.length>0?a:t&&t.building&&t.buildingLabel?[{value:t.building,text:t.buildingLabel}]:[],[a,t]),b=ye.useMemo(()=>n.length>0?n:t&&t.roomType.value&&t.roomType.text?[{value:t.roomType.value,text:t.roomType.text}]:[],[n,t]),L=ye.useCallback(()=>{if(!t)return;let S={building:i===Gl?"":i,roomType:u.value&&u.value!==_s?u:{value:"",text:""},dateIso:f,windowStart:g,windowEnd:p,ts:Date.now()};sL(S),e($r)},[t,i,u,f,g,p,e]);if(!t)return null;let C=f?jl(h)||fM(f):null;return(0,I.jsxs)(Ot,{className:"lintel-dash-recent","data-testid":"lintel-dash-recent",children:[(0,I.jsx)("div",{className:"lintel-dash-recent-label",children:"Recent search"}),(0,I.jsxs)("div",{className:"lintel-dash-recent-fields flex flex-wrap items-end gap-2 pt-1.5","data-testid":"lintel-dash-recent-fields",children:[(0,I.jsxs)("div",{className:"flex w-full flex-col gap-1 md:w-auto",children:[(0,I.jsx)(mt,{children:"Building"}),(0,I.jsx)(PI,{value:i,options:w,onChange:s,testId:"lintel-dash-recent-building"})]}),(0,I.jsxs)("div",{className:"flex w-full flex-col gap-1 md:w-auto",children:[(0,I.jsx)(mt,{children:"Type"}),(0,I.jsx)(EI,{value:u.value||_s,options:b,onChange:S=>{if(S===_s)d({value:"",text:""});else{let T=b.find(P=>(P.value||P.text)===S);d({value:S,text:T?T.text:S})}},testId:"lintel-dash-recent-roomtype"})]}),(0,I.jsxs)("div",{className:"flex w-full flex-col gap-1 md:w-auto",children:[(0,I.jsx)(mt,{children:"Date"}),(0,I.jsx)(AI,{selected:C,onSelect:S=>{y(Wr(S)),m(xh(S))},triggerLabel:(0,I.jsx)("span",{className:"lintel-mono","data-testid":"lintel-dash-recent-datelabel",children:h||"Pick\u2026"}),testId:"lintel-dash-recent-date"})]}),(0,I.jsxs)("div",{className:"flex w-full flex-col gap-1 md:w-auto",children:[(0,I.jsx)(mt,{children:"Window"}),(0,I.jsx)(Ic,{start:g,end:p,fromOptions:v,toOptions:v,onStartChange:x,onEndChange:c})]}),(0,I.jsxs)("div",{className:"flex w-full flex-col gap-1 md:w-auto",children:[(0,I.jsx)(mt,{className:"opacity-0 select-none","aria-hidden":!0,children:"\xA0"}),(0,I.jsx)(ee,{size:"sm",className:"shrink-0",onClick:L,"data-testid":"lintel-dash-recent-again",children:"Search again"})]})]})]})}function fM(e){let t=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e);return t?new Date(Number(t[1]),Number(t[2])-1,Number(t[3])):null}function UI({navigate:e,onRevealNative:t}){let[o,a]=ye.useState(!1),[r,n]=ye.useState(0),l=ye.useCallback(()=>a(!0),[]),i=ye.useCallback(()=>{a(!1),n(s=>s+1)},[]);return(0,I.jsx)("div",{className:"lintel-canvas h-full min-h-0 w-full overflow-auto","data-testid":"lintel-dashboard",children:(0,I.jsxs)("div",{className:"w-full max-w-[1400px]",children:[(0,I.jsx)("div",{className:"lintel-screen-head",children:(0,I.jsxs)("div",{children:[(0,I.jsx)("h1",{className:"lintel-screen-title",children:"Dashboard"}),(0,I.jsx)("p",{className:"lintel-screen-sub",children:"Your bookings, credits and supporter requests."})]})}),o?(0,I.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-dash-session-expired",children:[(0,I.jsx)(Fo,{className:"lintel-dash-panel-head",children:(0,I.jsx)(_o,{children:"Session expired"})}),(0,I.jsx)("p",{className:"text-sm text-muted-foreground",children:"Your SIT session has expired, so RBS returned its sign-in page instead of your dashboard. Sign back in on the native page, then reload."}),(0,I.jsxs)("div",{className:"mt-3 flex gap-2",children:[(0,I.jsx)(ee,{variant:"outline",onClick:i,"data-testid":"lintel-dash-reload",children:"Reload"}),(0,I.jsx)(ee,{onClick:t,"data-testid":"lintel-dash-reveal",children:"Show the native page"})]})]}):(0,I.jsxs)("div",{className:"lintel-dash-grid",children:[(0,I.jsxs)("div",{className:"lintel-dash-main",children:[(0,I.jsx)(cM,{navigate:e}),(0,I.jsx)(Ja,{swipeDirection:"right",duration:6e3,children:(0,I.jsx)(uM,{navigate:e,onSessionExpired:l})})]}),(0,I.jsx)(Ja,{swipeDirection:"right",duration:6e3,children:(0,I.jsx)(dM,{onRevealNative:t,onSessionExpired:l})})]},r)]})})}var oo=k(z());var Nc=k(z());var Po=k(z(),1);var Ft=k(z(),1);var On=k(H(),1),wh="Collapsible",[pM,yh]=dt(wh),[mM,bh]=pM(wh),zI=Ft.forwardRef((e,t)=>{let{__scopeCollapsible:o,open:a,defaultOpen:r,disabled:n,onOpenChange:l,...i}=e,[s=!1,u]=Et({prop:a,defaultProp:r,onChange:l});return(0,On.jsx)(mM,{scope:o,disabled:n,contentId:Pt(),open:s,onOpenToggle:Ft.useCallback(()=>u(d=>!d),[u]),children:(0,On.jsx)(te.div,{"data-state":Ch(s),"data-disabled":n?"":void 0,...i,ref:t})})});zI.displayName=wh;var VI="CollapsibleTrigger",WI=Ft.forwardRef((e,t)=>{let{__scopeCollapsible:o,...a}=e,r=bh(VI,o);return(0,On.jsx)(te.button,{type:"button","aria-controls":r.contentId,"aria-expanded":r.open||!1,"data-state":Ch(r.open),"data-disabled":r.disabled?"":void 0,disabled:r.disabled,...a,ref:t,onClick:Y(e.onClick,r.onOpenToggle)})});WI.displayName=VI;var Sh="CollapsibleContent",$I=Ft.forwardRef((e,t)=>{let{forceMount:o,...a}=e,r=bh(Sh,e.__scopeCollapsible);return(0,On.jsx)(kt,{present:o||r.open,children:({present:n})=>(0,On.jsx)(gM,{...a,ref:t,present:n})})});$I.displayName=Sh;var gM=Ft.forwardRef((e,t)=>{let{__scopeCollapsible:o,present:a,children:r,...n}=e,l=bh(Sh,o),[i,s]=Ft.useState(a),u=Ft.useRef(null),d=ue(t,u),f=Ft.useRef(0),m=f.current,h=Ft.useRef(0),y=h.current,g=l.open||i,x=Ft.useRef(g),p=Ft.useRef(void 0);return Ft.useEffect(()=>{let c=requestAnimationFrame(()=>x.current=!1);return()=>cancelAnimationFrame(c)},[]),He(()=>{let c=u.current;if(c){p.current=p.current||{transitionDuration:c.style.transitionDuration,animationName:c.style.animationName},c.style.transitionDuration="0s",c.style.animationName="none";let v=c.getBoundingClientRect();f.current=v.height,h.current=v.width,x.current||(c.style.transitionDuration=p.current.transitionDuration,c.style.animationName=p.current.animationName),s(a)}},[l.open,a]),(0,On.jsx)(te.div,{"data-state":Ch(l.open),"data-disabled":l.disabled?"":void 0,id:l.contentId,hidden:!g,...n,ref:d,style:{"--radix-collapsible-content-height":m?`${m}px`:void 0,"--radix-collapsible-content-width":y?`${y}px`:void 0,...e.style},children:g&&r})});function Ch(e){return e?"open":"closed"}var GI=zI,jI=WI,KI=$I;var It=k(H(),1),nr="Accordion",vM=["Home","End","ArrowDown","ArrowUp","ArrowLeft","ArrowRight"],[kh,xM,wM]=Mr(nr),[Ac,YU]=dt(nr,[wM,yh]),Ih=yh(),XI=Po.default.forwardRef((e,t)=>{let{type:o,...a}=e,r=a,n=a;return(0,It.jsx)(kh.Provider,{scope:e.__scopeAccordion,children:o==="multiple"?(0,It.jsx)(CM,{...n,ref:t}):(0,It.jsx)(SM,{...r,ref:t})})});XI.displayName=nr;var[YI,yM]=Ac(nr),[QI,bM]=Ac(nr,{collapsible:!1}),SM=Po.default.forwardRef((e,t)=>{let{value:o,defaultValue:a,onValueChange:r=()=>{},collapsible:n=!1,...l}=e,[i,s]=Et({prop:o,defaultProp:a,onChange:r});return(0,It.jsx)(YI,{scope:e.__scopeAccordion,value:i?[i]:[],onItemOpen:s,onItemClose:Po.default.useCallback(()=>n&&s(""),[n,s]),children:(0,It.jsx)(QI,{scope:e.__scopeAccordion,collapsible:n,children:(0,It.jsx)(ZI,{...l,ref:t})})})}),CM=Po.default.forwardRef((e,t)=>{let{value:o,defaultValue:a,onValueChange:r=()=>{},...n}=e,[l=[],i]=Et({prop:o,defaultProp:a,onChange:r}),s=Po.default.useCallback(d=>i((f=[])=>[...f,d]),[i]),u=Po.default.useCallback(d=>i((f=[])=>f.filter(m=>m!==d)),[i]);return(0,It.jsx)(YI,{scope:e.__scopeAccordion,value:l,onItemOpen:s,onItemClose:u,children:(0,It.jsx)(QI,{scope:e.__scopeAccordion,collapsible:!0,children:(0,It.jsx)(ZI,{...n,ref:t})})})}),[LM,Dc]=Ac(nr),ZI=Po.default.forwardRef((e,t)=>{let{__scopeAccordion:o,disabled:a,dir:r,orientation:n="vertical",...l}=e,i=Po.default.useRef(null),s=ue(i,t),u=xM(o),f=ha(r)==="ltr",m=Y(e.onKeyDown,h=>{if(!vM.includes(h.key))return;let y=h.target,g=u().filter(S=>!S.ref.current?.disabled),x=g.findIndex(S=>S.ref.current===y),p=g.length;if(x===-1)return;h.preventDefault();let c=x,v=0,w=p-1,b=()=>{c=x+1,c>w&&(c=v)},L=()=>{c=x-1,c<v&&(c=w)};switch(h.key){case"Home":c=v;break;case"End":c=w;break;case"ArrowRight":n==="horizontal"&&(f?b():L());break;case"ArrowDown":n==="vertical"&&b();break;case"ArrowLeft":n==="horizontal"&&(f?L():b());break;case"ArrowUp":n==="vertical"&&L();break}let C=c%p;g[C].ref.current?.focus()});return(0,It.jsx)(LM,{scope:o,disabled:a,direction:r,orientation:n,children:(0,It.jsx)(kh.Slot,{scope:o,children:(0,It.jsx)(te.div,{...l,"data-orientation":n,ref:s,onKeyDown:a?void 0:m})})})}),Ec="AccordionItem",[kM,Rh]=Ac(Ec),JI=Po.default.forwardRef((e,t)=>{let{__scopeAccordion:o,value:a,...r}=e,n=Dc(Ec,o),l=yM(Ec,o),i=Ih(o),s=Pt(),u=a&&l.value.includes(a)||!1,d=n.disabled||e.disabled;return(0,It.jsx)(kM,{scope:o,open:u,disabled:d,triggerId:s,children:(0,It.jsx)(GI,{"data-orientation":n.orientation,"data-state":nR(u),...i,...r,ref:t,disabled:d,open:u,onOpenChange:f=>{f?l.onItemOpen(a):l.onItemClose(a)}})})});JI.displayName=Ec;var eR="AccordionHeader",tR=Po.default.forwardRef((e,t)=>{let{__scopeAccordion:o,...a}=e,r=Dc(nr,o),n=Rh(eR,o);return(0,It.jsx)(te.h3,{"data-orientation":r.orientation,"data-state":nR(n.open),"data-disabled":n.disabled?"":void 0,...a,ref:t})});tR.displayName=eR;var Lh="AccordionTrigger",oR=Po.default.forwardRef((e,t)=>{let{__scopeAccordion:o,...a}=e,r=Dc(nr,o),n=Rh(Lh,o),l=bM(Lh,o),i=Ih(o);return(0,It.jsx)(kh.ItemSlot,{scope:o,children:(0,It.jsx)(jI,{"aria-disabled":n.open&&!l.collapsible||void 0,"data-orientation":r.orientation,id:n.triggerId,...i,...a,ref:t})})});oR.displayName=Lh;var aR="AccordionContent",rR=Po.default.forwardRef((e,t)=>{let{__scopeAccordion:o,...a}=e,r=Dc(nr,o),n=Rh(aR,o),l=Ih(o);return(0,It.jsx)(KI,{role:"region","aria-labelledby":n.triggerId,"data-orientation":r.orientation,...l,...a,ref:t,style:{"--radix-accordion-content-height":"var(--radix-collapsible-content-height)","--radix-accordion-content-width":"var(--radix-collapsible-content-width)",...e.style}})});rR.displayName=aR;function nR(e){return e?"open":"closed"}var lR=XI,iR=JI,sR=tR,uR=oR,dR=rR;var Aa=k(H()),cR=lR,Th=Nc.forwardRef(({className:e,...t},o)=>(0,Aa.jsx)(iR,{ref:o,className:K("lintel-faq-item",e),...t}));Th.displayName="AccordionItem";var Ph=Nc.forwardRef(({className:e,children:t,...o},a)=>(0,Aa.jsx)(sR,{className:"m-0",children:(0,Aa.jsxs)(uR,{ref:a,className:K("lintel-faq-header group",e),...o,children:[(0,Aa.jsx)("span",{className:"lintel-faq-q",children:t}),(0,Aa.jsxs)("span",{"aria-hidden":!0,className:"lintel-faq-chevron",children:[(0,Aa.jsx)(ms,{className:"h-3.5 w-3.5 group-data-[state=open]:hidden"}),(0,Aa.jsx)(fs,{className:"hidden h-3.5 w-3.5 group-data-[state=open]:block"})]})]})}));Ph.displayName="AccordionTrigger";var Eh=Nc.forwardRef(({className:e,children:t,...o},a)=>(0,Aa.jsx)(dR,{ref:a,className:K("lintel-faq-body",e),...o,children:t}));Eh.displayName="AccordionContent";var Fn={id:"69a74e84874f",builtAt:"2026-10-31T21:51:27+08:00"};function fR(){return(Fn.id||"").slice(0,7)||"dev"}function RM(e){let t=/T(\d{2}):(\d{2})/.exec(e||"");return t?`${t[1]}:${t[2]}`:""}function pR(){let e=RM(Fn.builtAt);return`build ${fR()}${e?` \xB7 ${e}`:""}`}function mR(){return`build ${fR()} \xB7 ${Fn.builtAt}`}var gR="\xA9 2026 Lee Guan Feng \xB7 All rights reserved";function hR(){try{let e=window;e.__rbsBuild={id:Fn.id,builtAt:Fn.builtAt},e.__rbsBuildLogged||(e.__rbsBuildLogged=!0,console.info(`[rbs] build ${Fn.id} ${Fn.builtAt}`))}catch{}}var _h=k(z());var oe=k(z(),1);var vR=k(z(),1),DM=k(ga(),1);var _t=k(z(),1);var Yl=k(H(),1),Dh=_t.forwardRef((e,t)=>{let{children:o,...a}=e,r=_t.Children.toArray(o),n=r.find(PM);if(n){let l=n.props.children,i=r.map(s=>s===n?_t.Children.count(l)>1?_t.Children.only(null):_t.isValidElement(l)?l.props.children:null:s);return(0,Yl.jsx)(Ah,{...a,ref:t,children:_t.isValidElement(l)?_t.cloneElement(l,void 0,i):null})}return(0,Yl.jsx)(Ah,{...a,ref:t,children:o})});Dh.displayName="Slot";var Ah=_t.forwardRef((e,t)=>{let{children:o,...a}=e;if(_t.isValidElement(o)){let r=AM(o);return _t.cloneElement(o,{...EM(a,o.props),ref:t?es(t,r):r})}return _t.Children.count(o)>1?_t.Children.only(null):null});Ah.displayName="SlotClone";var TM=({children:e})=>(0,Yl.jsx)(Yl.Fragment,{children:e});function PM(e){return _t.isValidElement(e)&&e.type===TM}function EM(e,t){let o={...t};for(let a in t){let r=e[a],n=t[a];/^on[A-Z]/.test(a)?r&&n?o[a]=(...i)=>{n(...i),r(...i)}:r&&(o[a]=r):a==="style"?o[a]={...r,...n}:a==="className"&&(o[a]=[r,n].filter(Boolean).join(" "))}return{...e,...o}}function AM(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}var xR=k(H(),1),NM=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","span","svg","ul"],Ql=NM.reduce((e,t)=>{let o=vR.forwardRef((a,r)=>{let{asChild:n,...l}=a,i=n?Dh:t;return typeof window<"u"&&(window[Symbol.for("radix-ui")]=!0),(0,xR.jsx)(i,{...l,ref:r})});return o.displayName=`Primitive.${t}`,{...e,[t]:o}},{});var yR=k(z(),1),Ae=k(H(),1);function MM(e,t){return yR.useReducer((o,a)=>t[o][a]??o,e)}var Nh="ScrollArea",[bR,m4]=dt(Nh),[BM,Vo]=bR(Nh),SR=oe.forwardRef((e,t)=>{let{__scopeScrollArea:o,type:a="hover",dir:r,scrollHideDelay:n=600,...l}=e,[i,s]=oe.useState(null),[u,d]=oe.useState(null),[f,m]=oe.useState(null),[h,y]=oe.useState(null),[g,x]=oe.useState(null),[p,c]=oe.useState(0),[v,w]=oe.useState(0),[b,L]=oe.useState(!1),[C,S]=oe.useState(!1),T=ue(t,q=>s(q)),P=ha(r);return(0,Ae.jsx)(BM,{scope:o,type:a,dir:P,scrollHideDelay:n,scrollArea:i,viewport:u,onViewportChange:d,content:f,onContentChange:m,scrollbarX:h,onScrollbarXChange:y,scrollbarXEnabled:b,onScrollbarXEnabledChange:L,scrollbarY:g,onScrollbarYChange:x,scrollbarYEnabled:C,onScrollbarYEnabledChange:S,onCornerWidthChange:c,onCornerHeightChange:w,children:(0,Ae.jsx)(Ql.div,{dir:P,...l,ref:T,style:{position:"relative","--radix-scroll-area-corner-width":p+"px","--radix-scroll-area-corner-height":v+"px",...e.style}})})});SR.displayName=Nh;var CR="ScrollAreaViewport",LR=oe.forwardRef((e,t)=>{let{__scopeScrollArea:o,children:a,nonce:r,...n}=e,l=Vo(CR,o),i=oe.useRef(null),s=ue(t,i,l.onViewportChange);return(0,Ae.jsxs)(Ae.Fragment,{children:[(0,Ae.jsx)("style",{dangerouslySetInnerHTML:{__html:"[data-radix-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-scroll-area-viewport]::-webkit-scrollbar{display:none}"},nonce:r}),(0,Ae.jsx)(Ql.div,{"data-radix-scroll-area-viewport":"",...n,ref:s,style:{overflowX:l.scrollbarXEnabled?"scroll":"hidden",overflowY:l.scrollbarYEnabled?"scroll":"hidden",...e.style},children:(0,Ae.jsx)("div",{ref:l.onContentChange,style:{minWidth:"100%",display:"table"},children:a})})]})});LR.displayName=CR;var Da="ScrollAreaScrollbar",Oc=oe.forwardRef((e,t)=>{let{forceMount:o,...a}=e,r=Vo(Da,e.__scopeScrollArea),{onScrollbarXEnabledChange:n,onScrollbarYEnabledChange:l}=r,i=e.orientation==="horizontal";return oe.useEffect(()=>(i?n(!0):l(!0),()=>{i?n(!1):l(!1)}),[i,n,l]),r.type==="hover"?(0,Ae.jsx)(OM,{...a,ref:t,forceMount:o}):r.type==="scroll"?(0,Ae.jsx)(FM,{...a,ref:t,forceMount:o}):r.type==="auto"?(0,Ae.jsx)(kR,{...a,ref:t,forceMount:o}):r.type==="always"?(0,Ae.jsx)(Mh,{...a,ref:t}):null});Oc.displayName=Da;var OM=oe.forwardRef((e,t)=>{let{forceMount:o,...a}=e,r=Vo(Da,e.__scopeScrollArea),[n,l]=oe.useState(!1);return oe.useEffect(()=>{let i=r.scrollArea,s=0;if(i){let u=()=>{window.clearTimeout(s),l(!0)},d=()=>{s=window.setTimeout(()=>l(!1),r.scrollHideDelay)};return i.addEventListener("pointerenter",u),i.addEventListener("pointerleave",d),()=>{window.clearTimeout(s),i.removeEventListener("pointerenter",u),i.removeEventListener("pointerleave",d)}}},[r.scrollArea,r.scrollHideDelay]),(0,Ae.jsx)(kt,{present:o||n,children:(0,Ae.jsx)(kR,{"data-state":n?"visible":"hidden",...a,ref:t})})}),FM=oe.forwardRef((e,t)=>{let{forceMount:o,...a}=e,r=Vo(Da,e.__scopeScrollArea),n=e.orientation==="horizontal",l=_c(()=>s("SCROLL_END"),100),[i,s]=MM("hidden",{hidden:{SCROLL:"scrolling"},scrolling:{SCROLL_END:"idle",POINTER_ENTER:"interacting"},interacting:{SCROLL:"interacting",POINTER_LEAVE:"idle"},idle:{HIDE:"hidden",SCROLL:"scrolling",POINTER_ENTER:"interacting"}});return oe.useEffect(()=>{if(i==="idle"){let u=window.setTimeout(()=>s("HIDE"),r.scrollHideDelay);return()=>window.clearTimeout(u)}},[i,r.scrollHideDelay,s]),oe.useEffect(()=>{let u=r.viewport,d=n?"scrollLeft":"scrollTop";if(u){let f=u[d],m=()=>{let h=u[d];f!==h&&(s("SCROLL"),l()),f=h};return u.addEventListener("scroll",m),()=>u.removeEventListener("scroll",m)}},[r.viewport,n,s,l]),(0,Ae.jsx)(kt,{present:o||i!=="hidden",children:(0,Ae.jsx)(Mh,{"data-state":i==="hidden"?"hidden":"visible",...a,ref:t,onPointerEnter:Y(e.onPointerEnter,()=>s("POINTER_ENTER")),onPointerLeave:Y(e.onPointerLeave,()=>s("POINTER_LEAVE"))})})}),kR=oe.forwardRef((e,t)=>{let o=Vo(Da,e.__scopeScrollArea),{forceMount:a,...r}=e,[n,l]=oe.useState(!1),i=e.orientation==="horizontal",s=_c(()=>{if(o.viewport){let u=o.viewport.offsetWidth<o.viewport.scrollWidth,d=o.viewport.offsetHeight<o.viewport.scrollHeight;l(i?u:d)}},10);return Zl(o.viewport,s),Zl(o.content,s),(0,Ae.jsx)(kt,{present:a||n,children:(0,Ae.jsx)(Mh,{"data-state":n?"visible":"hidden",...r,ref:t})})}),Mh=oe.forwardRef((e,t)=>{let{orientation:o="vertical",...a}=e,r=Vo(Da,e.__scopeScrollArea),n=oe.useRef(null),l=oe.useRef(0),[i,s]=oe.useState({content:0,viewport:0,scrollbar:{size:0,paddingStart:0,paddingEnd:0}}),u=PR(i.viewport,i.content),d={...a,sizes:i,onSizesChange:s,hasThumb:u>0&&u<1,onThumbChange:m=>n.current=m,onThumbPointerUp:()=>l.current=0,onThumbPointerDown:m=>l.current=m};function f(m,h){return VM(m,l.current,i,h)}return o==="horizontal"?(0,Ae.jsx)(_M,{...d,ref:t,onThumbPositionChange:()=>{if(r.viewport&&n.current){let m=r.viewport.scrollLeft,h=wR(m,i,r.dir);n.current.style.transform=`translate3d(${h}px, 0, 0)`}},onWheelScroll:m=>{r.viewport&&(r.viewport.scrollLeft=m)},onDragScroll:m=>{r.viewport&&(r.viewport.scrollLeft=f(m,r.dir))}}):o==="vertical"?(0,Ae.jsx)(HM,{...d,ref:t,onThumbPositionChange:()=>{if(r.viewport&&n.current){let m=r.viewport.scrollTop,h=wR(m,i);n.current.style.transform=`translate3d(0, ${h}px, 0)`}},onWheelScroll:m=>{r.viewport&&(r.viewport.scrollTop=m)},onDragScroll:m=>{r.viewport&&(r.viewport.scrollTop=f(m))}}):null}),_M=oe.forwardRef((e,t)=>{let{sizes:o,onSizesChange:a,...r}=e,n=Vo(Da,e.__scopeScrollArea),[l,i]=oe.useState(),s=oe.useRef(null),u=ue(t,s,n.onScrollbarXChange);return oe.useEffect(()=>{s.current&&i(getComputedStyle(s.current))},[s]),(0,Ae.jsx)(RR,{"data-orientation":"horizontal",...r,ref:u,sizes:o,style:{bottom:0,left:n.dir==="rtl"?"var(--radix-scroll-area-corner-width)":0,right:n.dir==="ltr"?"var(--radix-scroll-area-corner-width)":0,"--radix-scroll-area-thumb-width":Fc(o)+"px",...e.style},onThumbPointerDown:d=>e.onThumbPointerDown(d.x),onDragScroll:d=>e.onDragScroll(d.x),onWheelScroll:(d,f)=>{if(n.viewport){let m=n.viewport.scrollLeft+d.deltaX;e.onWheelScroll(m),AR(m,f)&&d.preventDefault()}},onResize:()=>{s.current&&n.viewport&&l&&a({content:n.viewport.scrollWidth,viewport:n.viewport.offsetWidth,scrollbar:{size:s.current.clientWidth,paddingStart:Bc(l.paddingLeft),paddingEnd:Bc(l.paddingRight)}})}})}),HM=oe.forwardRef((e,t)=>{let{sizes:o,onSizesChange:a,...r}=e,n=Vo(Da,e.__scopeScrollArea),[l,i]=oe.useState(),s=oe.useRef(null),u=ue(t,s,n.onScrollbarYChange);return oe.useEffect(()=>{s.current&&i(getComputedStyle(s.current))},[s]),(0,Ae.jsx)(RR,{"data-orientation":"vertical",...r,ref:u,sizes:o,style:{top:0,right:n.dir==="ltr"?0:void 0,left:n.dir==="rtl"?0:void 0,bottom:"var(--radix-scroll-area-corner-height)","--radix-scroll-area-thumb-height":Fc(o)+"px",...e.style},onThumbPointerDown:d=>e.onThumbPointerDown(d.y),onDragScroll:d=>e.onDragScroll(d.y),onWheelScroll:(d,f)=>{if(n.viewport){let m=n.viewport.scrollTop+d.deltaY;e.onWheelScroll(m),AR(m,f)&&d.preventDefault()}},onResize:()=>{s.current&&n.viewport&&l&&a({content:n.viewport.scrollHeight,viewport:n.viewport.offsetHeight,scrollbar:{size:s.current.clientHeight,paddingStart:Bc(l.paddingTop),paddingEnd:Bc(l.paddingBottom)}})}})}),[qM,IR]=bR(Da),RR=oe.forwardRef((e,t)=>{let{__scopeScrollArea:o,sizes:a,hasThumb:r,onThumbChange:n,onThumbPointerUp:l,onThumbPointerDown:i,onThumbPositionChange:s,onDragScroll:u,onWheelScroll:d,onResize:f,...m}=e,h=Vo(Da,o),[y,g]=oe.useState(null),x=ue(t,T=>g(T)),p=oe.useRef(null),c=oe.useRef(""),v=h.viewport,w=a.content-a.viewport,b=De(d),L=De(s),C=_c(f,10);function S(T){if(p.current){let P=T.clientX-p.current.left,q=T.clientY-p.current.top;u({x:P,y:q})}}return oe.useEffect(()=>{let T=P=>{let q=P.target;y?.contains(q)&&b(P,w)};return document.addEventListener("wheel",T,{passive:!1}),()=>document.removeEventListener("wheel",T,{passive:!1})},[v,y,w,b]),oe.useEffect(L,[a,L]),Zl(y,C),Zl(h.content,C),(0,Ae.jsx)(qM,{scope:o,scrollbar:y,hasThumb:r,onThumbChange:De(n),onThumbPointerUp:De(l),onThumbPositionChange:L,onThumbPointerDown:De(i),children:(0,Ae.jsx)(Ql.div,{...m,ref:x,style:{position:"absolute",...m.style},onPointerDown:Y(e.onPointerDown,T=>{T.button===0&&(T.target.setPointerCapture(T.pointerId),p.current=y.getBoundingClientRect(),c.current=document.body.style.webkitUserSelect,document.body.style.webkitUserSelect="none",h.viewport&&(h.viewport.style.scrollBehavior="auto"),S(T))}),onPointerMove:Y(e.onPointerMove,S),onPointerUp:Y(e.onPointerUp,T=>{let P=T.target;P.hasPointerCapture(T.pointerId)&&P.releasePointerCapture(T.pointerId),document.body.style.webkitUserSelect=c.current,h.viewport&&(h.viewport.style.scrollBehavior=""),p.current=null})})})}),Mc="ScrollAreaThumb",Bh=oe.forwardRef((e,t)=>{let{forceMount:o,...a}=e,r=IR(Mc,e.__scopeScrollArea);return(0,Ae.jsx)(kt,{present:o||r.hasThumb,children:(0,Ae.jsx)(UM,{ref:t,...a})})}),UM=oe.forwardRef((e,t)=>{let{__scopeScrollArea:o,style:a,...r}=e,n=Vo(Mc,o),l=IR(Mc,o),{onThumbPositionChange:i}=l,s=ue(t,f=>l.onThumbChange(f)),u=oe.useRef(void 0),d=_c(()=>{u.current&&(u.current(),u.current=void 0)},100);return oe.useEffect(()=>{let f=n.viewport;if(f){let m=()=>{if(d(),!u.current){let h=WM(f,i);u.current=h,i()}};return i(),f.addEventListener("scroll",m),()=>f.removeEventListener("scroll",m)}},[n.viewport,d,i]),(0,Ae.jsx)(Ql.div,{"data-state":l.hasThumb?"visible":"hidden",...r,ref:s,style:{width:"var(--radix-scroll-area-thumb-width)",height:"var(--radix-scroll-area-thumb-height)",...a},onPointerDownCapture:Y(e.onPointerDownCapture,f=>{let h=f.target.getBoundingClientRect(),y=f.clientX-h.left,g=f.clientY-h.top;l.onThumbPointerDown({x:y,y:g})}),onPointerUp:Y(e.onPointerUp,l.onThumbPointerUp)})});Bh.displayName=Mc;var Oh="ScrollAreaCorner",TR=oe.forwardRef((e,t)=>{let o=Vo(Oh,e.__scopeScrollArea),a=!!(o.scrollbarX&&o.scrollbarY);return o.type!=="scroll"&&a?(0,Ae.jsx)(zM,{...e,ref:t}):null});TR.displayName=Oh;var zM=oe.forwardRef((e,t)=>{let{__scopeScrollArea:o,...a}=e,r=Vo(Oh,o),[n,l]=oe.useState(0),[i,s]=oe.useState(0),u=!!(n&&i);return Zl(r.scrollbarX,()=>{let d=r.scrollbarX?.offsetHeight||0;r.onCornerHeightChange(d),s(d)}),Zl(r.scrollbarY,()=>{let d=r.scrollbarY?.offsetWidth||0;r.onCornerWidthChange(d),l(d)}),u?(0,Ae.jsx)(Ql.div,{...a,ref:t,style:{width:n,height:i,position:"absolute",right:r.dir==="ltr"?0:void 0,left:r.dir==="rtl"?0:void 0,bottom:0,...e.style}}):null});function Bc(e){return e?parseInt(e,10):0}function PR(e,t){let o=e/t;return isNaN(o)?0:o}function Fc(e){let t=PR(e.viewport,e.content),o=e.scrollbar.paddingStart+e.scrollbar.paddingEnd,a=(e.scrollbar.size-o)*t;return Math.max(a,18)}function VM(e,t,o,a="ltr"){let r=Fc(o),n=r/2,l=t||n,i=r-l,s=o.scrollbar.paddingStart+l,u=o.scrollbar.size-o.scrollbar.paddingEnd-i,d=o.content-o.viewport,f=a==="ltr"?[0,d]:[d*-1,0];return ER([s,u],f)(e)}function wR(e,t,o="ltr"){let a=Fc(t),r=t.scrollbar.paddingStart+t.scrollbar.paddingEnd,n=t.scrollbar.size-r,l=t.content-t.viewport,i=n-a,s=o==="ltr"?[0,l]:[l*-1,0],u=Rs(e,s);return ER([0,l],[0,i])(u)}function ER(e,t){return o=>{if(e[0]===e[1]||t[0]===t[1])return t[0];let a=(t[1]-t[0])/(e[1]-e[0]);return t[0]+a*(o-e[0])}}function AR(e,t){return e>0&&e<t}var WM=(e,t=()=>{})=>{let o={left:e.scrollLeft,top:e.scrollTop},a=0;return function r(){let n={left:e.scrollLeft,top:e.scrollTop},l=o.left!==n.left,i=o.top!==n.top;(l||i)&&t(),o=n,a=window.requestAnimationFrame(r)}(),()=>window.cancelAnimationFrame(a)};function _c(e,t){let o=De(e),a=oe.useRef(0);return oe.useEffect(()=>()=>window.clearTimeout(a.current),[]),oe.useCallback(()=>{window.clearTimeout(a.current),a.current=window.setTimeout(o,t)},[o,t])}function Zl(e,t){let o=De(t);He(()=>{let a=0;if(e){let r=new ResizeObserver(()=>{cancelAnimationFrame(a),a=window.requestAnimationFrame(o)});return r.observe(e),()=>{window.cancelAnimationFrame(a),r.unobserve(e)}}},[e,o])}var Fh=SR,DR=LR;var NR=TR;var Jr=k(H()),Hh=_h.forwardRef(({className:e,viewportClassName:t,viewportRef:o,children:a,...r},n)=>(0,Jr.jsxs)(Fh,{ref:n,className:K("relative overflow-hidden",e),...r,children:[(0,Jr.jsx)(DR,{ref:o,className:K("h-full w-full rounded-[inherit]",t),children:a}),(0,Jr.jsx)(MR,{}),(0,Jr.jsx)(NR,{})]}));Hh.displayName=Fh.displayName;var MR=_h.forwardRef(({className:e,orientation:t="vertical",...o},a)=>(0,Jr.jsx)(Oc,{ref:a,orientation:t,className:K("flex touch-none select-none transition-colors",t==="vertical"&&"h-full w-2 border-l border-l-transparent p-[1px]",t==="horizontal"&&"h-2 flex-col border-t border-t-transparent p-[1px]",e),...o,children:(0,Jr.jsx)(Bh,{className:"relative flex-1 rounded-full bg-border"})}));MR.displayName=Oc.displayName;var qh=k(z());function qs(e,t){if(e.type==="text")return e.text;let o=e.children.map((a,r)=>qs(a,r));return e.tag==="a"?qh.createElement("a",{key:t,href:e.href,target:e.target,rel:e.rel,className:"lintel-link"},o.length?o:void 0):qh.createElement(e.tag,{key:t},o.length?o:void 0)}function BR(e,t){return e.length===t.length?[]:t}function OR(e,t){return e.length===t.length}var GM="guide.html";function Uh(){try{let e=globalThis.chrome?.runtime;if(e&&typeof e.getURL=="function")return e.getURL(GM)}catch{}return null}var jM=["user-guide","faq","support"],zh="lintel.help.cache.v1";function Vh(e){if(e===null)return"null";if(Array.isArray(e))return"["+e.map(Vh).join(",")+"]";if(typeof e==="object"){let o=e;return"{"+Object.keys(o).sort().map(r=>JSON.stringify(r)+":"+Vh(o[r])).join(",")+"}"}return JSON.stringify(e)??"undefined"}function Hc(e){let t=Vh(e),o=2166136261;for(let a=0;a<t.length;a++)o^=t.charCodeAt(a),o=o+((o<<1)+(o<<4)+(o<<7)+(o<<8)+(o<<24))>>>0;return t.length.toString(36)+"."+o.toString(16)}function FR(e,t){let o=[];for(let a of jM){let r=e[a],n=t[a];r===void 0||n===void 0||r!==n&&o.push(a)}return o}function _R(){return globalThis.chrome?.storage?.local}function KM(e){return!!e&&typeof e=="object"&&typeof e.content=="object"&&typeof e.hashes=="object"}function HR(){let e=_R();return e?new Promise(t=>{let o=!1,a=r=>{if(o)return;o=!0;let n=r?r[zh]:void 0;t(KM(n)?n:null)};try{let r=e.get(zh,n=>a(n));r&&typeof r.then=="function"&&r.then(a).catch(()=>a(void 0))}catch{a(void 0)}}):Promise.resolve(null)}function qR(e){let t=_R();if(t)try{let o=t.set({[zh]:e});o&&typeof o.catch=="function"&&o.catch(()=>{})}catch{}}var j=k(H()),Wh=[{id:"user-guide",label:"User Guide",domId:"lintel-help-user-guide"},{id:"faq",label:"FAQ",domId:"lintel-help-faq"},{id:"support",label:"Support",domId:"lintel-help-support"},{id:"extension",label:"Extension",domId:"lintel-help-extension"}],XM={"user-guide":"User Guide",faq:"FAQ",support:"Support"};function UR({lines:e=3}){return(0,j.jsxs)("div",{className:"flex flex-col gap-2.5","data-testid":"lintel-help-skeleton",children:[(0,j.jsx)(wt,{className:"h-4 w-1/3"}),Array.from({length:e}).map((t,o)=>(0,j.jsx)(wt,{className:o===e-1?"h-3.5 w-2/3":"h-3.5 w-full"},o))]})}function $h({message:e,onRevealNative:t,testid:o}){return(0,j.jsxs)("div",{className:"flex flex-col items-start gap-3 text-sm","data-testid":o,children:[(0,j.jsxs)("p",{className:"text-muted-foreground",children:["Lintel could not load this section (",e,"). The untouched RBS page is one click away."]}),(0,j.jsx)(ee,{variant:"outline",onClick:t,children:"Show the native page"})]})}function zR(e,t){let o=t.trim().toLowerCase(),a=!1;function r(n){let l=[];for(let i of n){if(a||i.type==="text"){l.push(i);continue}if(/^h[1-6]$/.test(i.tag)&&WR(i).trim().toLowerCase()===o){a=!0;continue}l.push({...i,children:r(i.children)})}return l}return r(e)}function WR(e){return e.type==="text"?e.text:e.children.map(WR).join("")}function YM({onRevealNative:e}){let[t,o]=oo.useState(!1),a=Uh(),r=oo.useCallback(()=>{let n=Uh();if(n){window.open(n,"_blank","noopener");return}o(!0)},[]);return(0,j.jsxs)("div",{className:"lintel-help-guide-cta",children:[(0,j.jsx)(ee,{onClick:r,"data-testid":"lintel-help-full-guide",children:"Open the full guide in a new tab"}),t&&!a&&(0,j.jsxs)("p",{className:"mt-2 text-[13px] text-muted-foreground","data-testid":"lintel-help-full-guide-fallback",children:["The full guide page ships with the browser extension. In this build you can follow the short steps above, or"," ",(0,j.jsx)("button",{type:"button",className:"lintel-link",onClick:e,children:"open the native RBS page"}),"."]})]})}function VR(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}function $R({route:e,onRevealNative:t}){let o=oo.useRef(null),[a,r]=oo.useState({kind:"loading"}),[n,l]=oo.useState({kind:"loading"}),[i,s]=oo.useState({kind:"loading"}),[u,d]=oo.useState([]),{toasts:f,push:m,dismiss:h}=er();oo.useEffect(()=>{i.kind==="ready"&&d(i.items.map((x,p)=>`faq-${p}`))},[i.kind]),oo.useEffect(()=>{let x=!1;async function p(){let c=await HR();!x&&c&&(c.content["user-guide"]&&r({kind:"ready",nodes:c.content["user-guide"]}),c.content.faq&&s({kind:"ready",items:c.content.faq}),c.content.support&&l({kind:"ready",nodes:c.content.support}));let v=c?c.hashes:{},w=c?{...c.content}:{},b=c?{...c.hashes}:{};try{let C=(await Ig(ac)).nodes;x||(r({kind:"ready",nodes:C}),w["user-guide"]=C,b["user-guide"]=Hc(C))}catch(C){!x&&!(c&&c.content["user-guide"])&&r({kind:"error",message:C.message||"could not load this page"})}if(x)return;try{let C=await VC(Pg);x||(s({kind:"ready",items:C}),w.faq=C,b.faq=Hc(C))}catch(C){!x&&!(c&&c.content.faq)&&s({kind:"error",message:C.message||"could not load the FAQ"})}if(x)return;try{let C=(await Ig(Eg)).nodes;x||(l({kind:"ready",nodes:C}),w.support=C,b.support=Hc(C))}catch(C){!x&&!(c&&c.content.support)&&l({kind:"error",message:C.message||"could not load this page"})}if(x)return;let L=FR(v,b);for(let C of L)m(`${XM[C]} updated`,"This section was refreshed with the latest content.");qR({content:w,hashes:b})}return p(),()=>{x=!0}},[]);let y=e.section;oo.useEffect(()=>{let x=Wh[0],p=Wh.find(v=>v.id===y);if(!y||!p||p.domId===x.domId)return;let c=setTimeout(()=>{let v=o.current?.querySelector(`#${p.domId}`);v&&typeof v.scrollIntoView=="function"&&v.scrollIntoView({behavior:VR(),block:"start"})},150);return()=>clearTimeout(c)},[y]);let g=oo.useCallback(x=>{let p=o.current?.querySelector(`#${x}`);p&&typeof p.scrollIntoView=="function"&&p.scrollIntoView({behavior:VR(),block:"start"})},[]);return(0,j.jsxs)(Ja,{swipeDirection:"right",duration:6e3,children:[(0,j.jsx)(Hh,{ref:o,className:"lintel-canvas h-full min-h-0 w-full",viewportClassName:"lintel-help-viewport","data-testid":"lintel-help",children:(0,j.jsxs)("div",{className:"lintel-help-layout",children:[(0,j.jsxs)("div",{className:"lintel-help-header",children:[(0,j.jsx)("div",{className:"lintel-screen-head",children:(0,j.jsxs)("div",{children:[(0,j.jsx)("h1",{className:"lintel-screen-title",children:"Help"}),(0,j.jsx)("p",{className:"lintel-screen-sub",children:"User guide, answers to common questions, and how to get support, all in one place."})]})}),(0,j.jsx)("nav",{className:"lintel-help-nav","aria-label":"Help sections","data-testid":"lintel-help-nav",children:Wh.map(x=>(0,j.jsx)("button",{type:"button",className:"lintel-help-nav-link",onClick:()=>g(x.domId),"data-testid":`lintel-help-nav-${x.id}`,children:x.label},x.id))})]}),(0,j.jsxs)("section",{id:"lintel-help-user-guide",className:"lintel-help-section","data-testid":"lintel-help-section-user-guide",children:[(0,j.jsx)("h2",{className:"lintel-help-section-title",children:"User Guide"}),(0,j.jsxs)("div",{className:"lintel-prose lintel-static-panel",children:[a.kind==="loading"&&(0,j.jsx)(UR,{lines:2}),a.kind==="error"&&(0,j.jsx)($h,{message:a.message,onRevealNative:t,testid:"lintel-help-user-guide-error"}),a.kind==="ready"&&(0,j.jsx)("div",{className:"lintel-fade-in",children:zR(a.nodes,"User Guide").map((x,p)=>qs(x,p))})]})]}),(0,j.jsxs)("section",{id:"lintel-help-faq",className:"lintel-help-section","data-testid":"lintel-help-section-faq",children:[(()=>{let x=i.kind==="ready"?i.items.map((c,v)=>`faq-${v}`):[],p=OR(u,x);return(0,j.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,j.jsx)("h2",{className:"lintel-help-section-title",children:"Frequently Asked Questions"}),i.kind==="ready"&&(0,j.jsx)(ee,{variant:"outline",size:"sm","data-testid":"lintel-faq-toggle-all","aria-expanded":p,onClick:()=>d(BR(u,x)),children:p?"Collapse all":"Expand all"})]})})(),i.kind==="loading"&&(0,j.jsx)("div",{className:"flex flex-col gap-2",children:Array.from({length:4}).map((x,p)=>(0,j.jsx)(wt,{className:"h-11 w-full","data-testid":"lintel-help-faq-skeleton"},p))}),i.kind==="error"&&(0,j.jsx)($h,{message:i.message,onRevealNative:t,testid:"lintel-help-faq-error"}),i.kind==="ready"&&(0,j.jsx)(cR,{type:"multiple",value:u,onValueChange:d,className:"lintel-fade-in flex flex-col gap-2","data-testid":"lintel-faq-list",children:i.items.map((x,p)=>(0,j.jsxs)(Th,{value:`faq-${p}`,"data-testid":"lintel-faq-item",children:[(0,j.jsx)(Ph,{"data-testid":"lintel-faq-header",children:x.question}),(0,j.jsx)(Eh,{"data-testid":"lintel-faq-body",children:(0,j.jsx)("div",{className:"lintel-faq-body-inner",children:x.answer.length?x.answer.map((c,v)=>qs(c,v)):(0,j.jsx)("p",{className:"text-muted-foreground",children:"No further details."})})})]},p))})]}),(0,j.jsxs)("section",{id:"lintel-help-support",className:"lintel-help-section","data-testid":"lintel-help-section-support",children:[(0,j.jsx)("h2",{className:"lintel-help-section-title",children:"Support"}),(0,j.jsxs)("div",{className:"lintel-prose lintel-static-panel",children:[n.kind==="loading"&&(0,j.jsx)(UR,{lines:2}),n.kind==="error"&&(0,j.jsx)($h,{message:n.message,onRevealNative:t,testid:"lintel-help-support-error"}),n.kind==="ready"&&(0,j.jsx)("div",{className:"lintel-fade-in",children:zR(n.nodes,"Support").map((x,p)=>qs(x,p))})]})]}),(0,j.jsxs)("section",{id:"lintel-help-extension",className:"lintel-help-section","data-testid":"lintel-help-section-extension",children:[(0,j.jsx)("h2",{className:"lintel-help-section-title",children:"Extension"}),(0,j.jsxs)("div",{className:"lintel-prose lintel-static-panel lintel-help-brief","data-testid":"lintel-help-guide-brief",children:[(0,j.jsx)("p",{children:"New here? The short version:"}),(0,j.jsxs)("ol",{children:[(0,j.jsxs)("li",{children:["Open ",(0,j.jsx)("strong",{children:"Make a New Booking"}),", pick a building, room type, day and time, then press ",(0,j.jsx)("strong",{children:"Search"}),"."]}),(0,j.jsxs)("li",{children:["Tap the ",(0,j.jsx)("strong",{children:"free"})," slots you want. Tap more to book a longer block or extra rooms."]}),(0,j.jsxs)("li",{children:["Review your picks in the cart, then ",(0,j.jsx)("strong",{children:"confirm"})," to book. Lintel never books for you until you confirm."]}),(0,j.jsxs)("li",{children:["See or ",(0,j.jsx)("strong",{children:"cancel"})," bookings from the ",(0,j.jsx)("strong",{children:"Dashboard"}),"."]}),(0,j.jsxs)("li",{children:["Use the toolbar ",(0,j.jsx)("strong",{children:"popup quick-search"})," to jump straight to a search, or switch to the native page any time if you need it."]})]}),(0,j.jsx)(YM,{onRevealNative:t}),(0,j.jsx)("p",{className:"text-[12px] text-muted-foreground","data-testid":"lintel-build-stamp",children:pR()})]})]})]})}),f.map(x=>(0,j.jsx)(ya,{open:!0,onOpenChange:p=>{p||h(x.id)},children:(0,j.jsxs)("div",{className:"flex flex-col gap-0.5",children:[(0,j.jsx)(ba,{children:x.title}),x.description&&(0,j.jsx)(Sa,{children:x.description})]})},x.id)),(0,j.jsx)(wa,{})]})}var Gt=k(z());var D=k(H()),qc=["Resource Type Category","Resource Type","Frequency","Total Credit (Mins)","Credit Used (Mins)","Credit Balance (Mins)","View Bookings"],QM=new Set(["Total Credit (Mins)","Credit Used (Mins)","Credit Balance (Mins)"]),ti=["Date","Resource Type","Resource Name","Time","Campus","Capacity","Status"],Gh=5,Jl="__all__";function ZM(e){let t=Array.isArray(e)?e.map(a=>a==null?"":String(a)):[],o=t[6];return{category:t[0]??"",type:t[1]??"",frequency:t[2]??"",total:t[3]??"",used:t[4]??"",balance:t[5]??"",typeId:typeof o=="string"&&o.trim()!==""?o.trim():null}}function JM(e){let t=Array.isArray(e)?e.map(o=>o==null?"":String(o)):[];return ti.map((o,a)=>t[a]??"")}function GR(){let e=new Date;return e.setHours(0,0,0,0),e}function e2(e){let t=e.getFullYear(),o=String(e.getMonth()+1).padStart(2,"0"),a=String(e.getDate()).padStart(2,"0");return`${t}-${o}-${a}`}function jR(e,t){return{resourceTypeCategory:e.category,resourceType:t!==void 0?t:e.type,searchDate:Wr(e.date)}}function KR({onRevealNative:e}){let[t,o]=Gt.useState(()=>({category:"",type:"",date:GR()})),[a,r]=Gt.useState(t),[n,l]=Gt.useState(null),[i,s]=Gt.useState({kind:"loading"}),[u,d]=Gt.useState({kind:"loading"}),[f,m]=Gt.useState(0),h=Xl();Gt.useEffect(()=>{let w=!1;s({kind:"loading"}),d({kind:"loading"});let b=jR(t,n!==null?n:void 0);return(async()=>{try{let L=await PC(jR(t));if(w)return;s({kind:"ready",rows:L.map(ZM)})}catch(L){if(w)return;let C=L instanceof Se?L:null;s({kind:"error",message:L instanceof Error?L.message:"could not load quota",sessionExpired:C?.sessionExpired??!1})}try{let L=await EC(b);if(w)return;d({kind:"ready",rows:L.map(JM)})}catch(L){if(w)return;let C=L instanceof Se?L:null;d({kind:"error",message:L instanceof Error?L.message:"could not load credit usage",sessionExpired:C?.sessionExpired??!1})}})(),()=>{w=!0}},[t,n,f]);let y=Gt.useMemo(()=>{if(i.kind!=="ready")return[];let w=new Set;for(let b of i.rows)b.category&&w.add(b.category);return Array.from(w).sort()},[i]),g=Gt.useMemo(()=>{if(i.kind!=="ready")return[];let w=new Set;for(let b of i.rows)b.type&&w.add(b.type);return Array.from(w).sort()},[i]),x=Gt.useCallback(()=>{l(null),o(a),m(w=>w+1)},[a]),p=Gt.useCallback(()=>{let w={category:"",type:"",date:GR()};r(w),o(w),l(null),m(b=>b+1)},[]),c=Gt.useCallback(w=>{l(w),m(b=>b+1)},[]),v=i.kind==="error"&&i.sessionExpired||u.kind==="error"&&u.sessionExpired;return(0,D.jsx)("div",{className:"lintel-canvas h-full min-h-0 w-full overflow-auto","data-testid":"lintel-mycredit",children:(0,D.jsxs)("div",{className:"w-full max-w-[1400px]",children:[(0,D.jsx)("div",{className:"lintel-screen-head",children:(0,D.jsxs)("div",{children:[(0,D.jsx)("h1",{className:"lintel-screen-title",children:"My Credit"}),(0,D.jsx)("p",{className:"lintel-screen-sub",children:"Your booking credit allowance per resource type, and the bookings that used it."})]})}),v?(0,D.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-mycredit-session-expired",children:[(0,D.jsx)(Fo,{className:"lintel-dash-panel-head",children:(0,D.jsx)(_o,{children:"Session expired"})}),(0,D.jsx)("p",{className:"text-sm text-muted-foreground",children:"Your SIT session has expired, so RBS returned its sign-in page instead of your credit data. Sign back in on the native page, then reload."}),(0,D.jsxs)("div",{className:"mt-3 flex gap-2",children:[(0,D.jsx)(ee,{variant:"outline",onClick:()=>m(w=>w+1),"data-testid":"lintel-mycredit-reload",children:"Reload"}),(0,D.jsx)(ee,{onClick:e,"data-testid":"lintel-mycredit-reveal",children:"Show the native page"})]})]}):(0,D.jsxs)("div",{className:"flex flex-col gap-5",children:[(0,D.jsx)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-mycredit-filter",children:(0,D.jsxs)("form",{className:"flex flex-wrap items-end gap-3",onSubmit:w=>{w.preventDefault(),x()},children:[(0,D.jsxs)("div",{className:"flex min-w-[180px] flex-col gap-1",children:[(0,D.jsx)(mt,{htmlFor:"lintel-mycredit-category",children:"Resource Type Category"}),(0,D.jsxs)(po,{value:a.category===""?Jl:a.category,onValueChange:w=>r(b=>({...b,category:w===Jl?"":w})),children:[(0,D.jsx)(Jt,{id:"lintel-mycredit-category","data-testid":"lintel-mycredit-category",children:(0,D.jsx)(mo,{placeholder:"All"})}),(0,D.jsxs)(eo,{children:[(0,D.jsx)(it,{value:Jl,children:"All"}),y.map(w=>(0,D.jsx)(it,{value:w,children:w},w))]})]})]}),(0,D.jsxs)("div",{className:"flex min-w-[180px] flex-col gap-1",children:[(0,D.jsx)(mt,{htmlFor:"lintel-mycredit-type",children:"Resource Type"}),(0,D.jsxs)(po,{value:a.type===""?Jl:a.type,onValueChange:w=>r(b=>({...b,type:w===Jl?"":w})),children:[(0,D.jsx)(Jt,{id:"lintel-mycredit-type","data-testid":"lintel-mycredit-type",children:(0,D.jsx)(mo,{placeholder:"All"})}),(0,D.jsxs)(eo,{children:[(0,D.jsx)(it,{value:Jl,children:"All"}),g.map(w=>(0,D.jsx)(it,{value:w,children:w},w))]})]})]}),(0,D.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,D.jsx)(mt,{htmlFor:"lintel-mycredit-date",children:"Date"}),(0,D.jsx)(Lo,{id:"lintel-mycredit-date",type:"date",className:"w-[160px]",value:e2(a.date),onChange:w=>{let b=w.target.value,L=/^(\d{4})-(\d{2})-(\d{2})$/.exec(b);if(!L)return;let C=new Date(Number(L[1]),Number(L[2])-1,Number(L[3]));C.setHours(0,0,0,0),r(S=>({...S,date:C}))},"data-testid":"lintel-mycredit-date"})]}),(0,D.jsxs)("div",{className:"flex gap-2",children:[(0,D.jsx)(ee,{type:"submit","data-testid":"lintel-mycredit-filter-apply",children:"Filter"}),(0,D.jsx)(ee,{type:"button",variant:"outline",onClick:p,"data-testid":"lintel-mycredit-filter-clear",children:"Clear"})]})]})}),(0,D.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-mycredit-quota",children:[(0,D.jsx)(Fo,{className:"lintel-dash-panel-head",children:(0,D.jsx)(_o,{children:"Credit Allowance"})}),!h&&(0,D.jsx)("div",{className:"overflow-auto",children:(0,D.jsxs)(Er,{className:"lintel-dash-table","data-testid":"lintel-mycredit-quota-table",children:[(0,D.jsx)(Ar,{children:(0,D.jsx)(pt,{children:qc.map(w=>(0,D.jsx)(Ho,{className:QM.has(w)?"lintel-num":void 0,children:w},w))})}),(0,D.jsxs)(Dr,{children:[i.kind==="ready"&&i.rows.map((w,b)=>(0,D.jsxs)(pt,{"data-testid":"lintel-mycredit-quota-row",children:[(0,D.jsx)(Le,{children:w.category}),(0,D.jsx)(Le,{children:w.type}),(0,D.jsx)(Le,{className:"whitespace-nowrap",children:w.frequency}),(0,D.jsx)(Le,{className:"lintel-num whitespace-nowrap",children:w.total}),(0,D.jsx)(Le,{className:"lintel-num whitespace-nowrap",children:w.used}),(0,D.jsx)(Le,{className:"lintel-num whitespace-nowrap",children:(0,D.jsx)("span",{className:"lintel-dash-status","data-testid":"lintel-mycredit-balance",children:w.balance})}),(0,D.jsx)(Le,{className:"whitespace-nowrap",children:w.typeId?(0,D.jsx)(ee,{size:"sm",variant:"outline",onClick:()=>c(w.typeId),"data-testid":"lintel-mycredit-view-bookings",children:"View Bookings"}):(0,D.jsx)(ee,{size:"sm",variant:"outline",disabled:!0,title:"No resource-type id for this row","data-testid":"lintel-mycredit-view-bookings-disabled",children:"View Bookings"})})]},b)),i.kind==="ready"&&i.rows.length===0&&(0,D.jsx)(pt,{"data-testid":"lintel-mycredit-quota-empty-row",children:(0,D.jsx)(Le,{colSpan:qc.length,className:"lintel-dash-empty-cell",children:(0,D.jsxs)("div",{className:"lintel-dash-empty-state",children:[(0,D.jsx)("div",{className:"lintel-dash-empty-title",children:"No credit allowance"}),(0,D.jsx)("p",{className:"lintel-dash-empty-note",children:"Lintel found no resource-type quota for this filter."})]})})}),i.kind==="loading"&&Array.from({length:4}).map((w,b)=>(0,D.jsx)(pt,{"data-testid":"lintel-mycredit-quota-loading-row",children:qc.map(L=>(0,D.jsx)(Le,{children:(0,D.jsx)(wt,{className:"h-4 w-full"})},L))},b)),i.kind==="error"&&(0,D.jsx)(pt,{children:(0,D.jsxs)(Le,{colSpan:qc.length,className:"lintel-dash-empty-cell",children:["Could not load your credit allowance from /MQT001/GetResourceTypeQuotaList (",i.message,")."]})})]})]})}),h&&(0,D.jsxs)("div",{className:"flex flex-col gap-2","data-testid":"lintel-mycredit-quota-cardlist",children:[i.kind==="ready"&&i.rows.map((w,b)=>(0,D.jsxs)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-mycredit-quota-row",children:[(0,D.jsx)("div",{className:"font-semibold text-foreground",children:w.type}),(0,D.jsx)(ei,{label:"Category",children:w.category||"-"}),(0,D.jsx)(ei,{label:"Frequency",children:w.frequency}),(0,D.jsx)(ei,{label:"Total",numeric:!0,children:w.total}),(0,D.jsx)(ei,{label:"Used",numeric:!0,children:w.used}),(0,D.jsx)(ei,{label:"Balance",numeric:!0,children:(0,D.jsx)("span",{className:"lintel-dash-status","data-testid":"lintel-mycredit-balance",children:w.balance})}),(0,D.jsx)("div",{className:"mt-2",children:w.typeId?(0,D.jsx)(ee,{size:"sm",variant:"outline",className:"w-full",onClick:()=>c(w.typeId),"data-testid":"lintel-mycredit-view-bookings",children:"View Bookings"}):(0,D.jsx)(ee,{size:"sm",variant:"outline",className:"w-full",disabled:!0,title:"No resource-type id for this row","data-testid":"lintel-mycredit-view-bookings-disabled",children:"View Bookings"})})]},b)),i.kind==="ready"&&i.rows.length===0&&(0,D.jsx)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-mycredit-quota-empty-row",children:(0,D.jsxs)("div",{className:"lintel-dash-empty-state",children:[(0,D.jsx)("div",{className:"lintel-dash-empty-title",children:"No credit allowance"}),(0,D.jsx)("p",{className:"lintel-dash-empty-note",children:"Lintel found no resource-type quota for this filter."})]})}),i.kind==="loading"&&Array.from({length:4}).map((w,b)=>(0,D.jsxs)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-mycredit-quota-loading-row",children:[(0,D.jsx)(wt,{className:"h-4 w-2/3"}),(0,D.jsx)(wt,{className:"mt-2 h-4 w-full"})]},b)),i.kind==="error"&&(0,D.jsxs)("div",{className:"lintel-dash-bookingcard lintel-dash-empty-cell",children:["Could not load your credit allowance from /MQT001/GetResourceTypeQuotaList (",i.message,")."]})]})]}),(0,D.jsxs)(Ot,{className:"lintel-dash-panel","data-testid":"lintel-mycredit-details",children:[(0,D.jsx)(Fo,{className:"lintel-dash-panel-head",children:(0,D.jsxs)(_o,{children:["Credit Usage",n!==null&&(0,D.jsx)("span",{className:"ml-2 text-xs font-normal text-muted-foreground",children:"(filtered to one resource type)"})]})}),!h&&(0,D.jsx)("div",{className:"overflow-auto",children:(0,D.jsxs)(Er,{className:"lintel-dash-table","data-testid":"lintel-mycredit-details-table",children:[(0,D.jsx)(Ar,{children:(0,D.jsx)(pt,{children:ti.map((w,b)=>(0,D.jsx)(Ho,{className:b===Gh?"lintel-num":void 0,children:w},w))})}),(0,D.jsxs)(Dr,{children:[u.kind==="ready"&&u.rows.map((w,b)=>(0,D.jsx)(pt,{"data-testid":"lintel-mycredit-details-row",children:w.map((L,C)=>(0,D.jsx)(Le,{className:C===Gh?"lintel-num whitespace-nowrap":"whitespace-nowrap",children:L},C))},b)),u.kind==="ready"&&u.rows.length===0&&(0,D.jsx)(pt,{"data-testid":"lintel-mycredit-details-empty",children:(0,D.jsx)(Le,{colSpan:ti.length,className:"lintel-dash-empty-cell",children:(0,D.jsxs)("div",{className:"lintel-dash-empty-state",children:[(0,D.jsx)("div",{className:"lintel-dash-empty-title",children:"No credit usage yet."}),(0,D.jsx)("p",{className:"lintel-dash-empty-note",children:"No bookings have used credit for this filter."})]})})}),u.kind==="loading"&&Array.from({length:3}).map((w,b)=>(0,D.jsx)(pt,{"data-testid":"lintel-mycredit-details-loading-row",children:ti.map(L=>(0,D.jsx)(Le,{children:(0,D.jsx)(wt,{className:"h-4 w-full"})},L))},b)),u.kind==="error"&&(0,D.jsx)(pt,{children:(0,D.jsxs)(Le,{colSpan:ti.length,className:"lintel-dash-empty-cell",children:["Could not load your credit usage from /MQT001/ResourceQuotaList (",u.message,")."]})})]})]})}),h&&(0,D.jsxs)("div",{className:"flex flex-col gap-2","data-testid":"lintel-mycredit-details-cardlist",children:[u.kind==="ready"&&u.rows.map((w,b)=>(0,D.jsxs)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-mycredit-details-row",children:[(0,D.jsx)("div",{className:"font-semibold text-foreground",children:w[2]||"-"}),ti.map((L,C)=>C===2?null:(0,D.jsx)(ei,{label:L,numeric:C===Gh,children:w[C]},C))]},b)),u.kind==="ready"&&u.rows.length===0&&(0,D.jsx)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-mycredit-details-empty",children:(0,D.jsxs)("div",{className:"lintel-dash-empty-state",children:[(0,D.jsx)("div",{className:"lintel-dash-empty-title",children:"No credit usage yet."}),(0,D.jsx)("p",{className:"lintel-dash-empty-note",children:"No bookings have used credit for this filter."})]})}),u.kind==="loading"&&Array.from({length:3}).map((w,b)=>(0,D.jsxs)("div",{className:"lintel-dash-bookingcard","data-testid":"lintel-mycredit-details-loading-row",children:[(0,D.jsx)(wt,{className:"h-4 w-2/3"}),(0,D.jsx)(wt,{className:"mt-2 h-4 w-full"})]},b)),u.kind==="error"&&(0,D.jsxs)("div",{className:"lintel-dash-bookingcard lintel-dash-empty-cell",children:["Could not load your credit usage from /MQT001/ResourceQuotaList (",u.message,")."]})]})]})]})]})})}function ei({label:e,numeric:t,children:o}){return(0,D.jsxs)("div",{className:"mt-1 flex items-baseline justify-between gap-2 text-[12px]",children:[(0,D.jsx)("span",{className:"shrink-0 text-muted-foreground",children:e}),(0,D.jsx)("span",{className:t?"lintel-mono tabular-nums text-right text-foreground":"min-w-0 text-right text-foreground",children:o})]})}var ne=k(z());var Ze=k(z());function XR(e){return e===2?"Reserved/Pending":e===3?"Confirmed":"Booked"}function YR(e){let t=e.startTime?e.startTime.trim():"",o=e.endTime?e.endTime.trim():"";return t&&o?`${t} - ${o}`:t||o||""}function QR(e){return e?e.purpose!=null||e.bookedBy!=null||e.startTime!=null||e.endTime!=null||e.bookingStatus!=null||e.resourceType!=null||e.capacity!=null:!1}var ZR=0;function t2(){return ZR+=1,`r${ZR}`}function o2(e,t){return e<=t?[e,t]:[t,e]}function a2(e,t,o){return e.roomId===t&&o>=e.start&&o<=e.end}function jh(e,t,o){return e.findIndex(a=>a2(a,t,o))}function Kh(e,t,o,a){let r=jh(e,t,o);if(r!==-1)return e.filter((l,i)=>i!==r);let n=e.findIndex(l=>l.roomId===t&&(o===l.start-1||o===l.end+1));if(n!==-1){let l=e[n],[i,s]=o2(Math.min(l.start,o),Math.max(l.end,o)),u=e.slice();return u[n]={...l,start:i,end:s},u}return[...e,{id:t2(),roomId:t,start:o,end:o}]}function Us(e,t){return e.filter(o=>o.id!==t)}function JR(e){return e.reduce((t,o)=>t+(o.end-o.start+1),0)}function r2(e){return!!e&&e.state==="free"}function e0(e,t){return e<=t}function t0(e,t){return r2(e)&&!t?.past}function o0(e,t){return Math.max(0,(e-t)/30)}function a0(e,t){return e===t?null:t}function r0(e){if(!Array.isArray(e))return 0;let t=e.filter(o=>o?.state==="taken").length;for(let o of Xh(e))o.span>1&&o.state==="taken"&&o.booker&&(t-=o.span-1);return t}function Xh(e){let t=[];if(!Array.isArray(e))return t;let o=0;for(;o<e.length;){let a=e[o],r=a&&a.booker?a.booker:"";if(!(!!a&&a.state==="taken"&&r!=="")){t.push({start:o,end:o,span:1,state:a?a.state:null,...r?{booker:r}:{}}),o+=1;continue}let l=o+1;for(;l<e.length;){let i=e[l];if(!i||i.state!=="taken"||i.booker!==r)break;l+=1}t.push({start:o,end:l-1,span:l-o,state:"taken",booker:r}),o=l}return t}var W=k(H()),n0=48;function l0(e){let t=(e%1440+1440)%1440;return`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`}function n2({axis:e,template:t}){let o=xg(e);return(0,W.jsxs)("div",{"data-testid":"lintel-board-header",role:"row",className:"lintel-header grid border-b border-border bg-card text-[12px] text-muted-foreground",style:{gridTemplateColumns:t},children:[(0,W.jsx)("div",{role:"columnheader","data-testid":"lintel-header-cell","data-col":"room",className:"lintel-header-roomcell flex items-center border-r border-border font-medium",style:{height:"var(--lintel-header-h)"},children:"Room"}),o.map((a,r)=>(0,W.jsx)("div",{role:"columnheader","data-testid":"lintel-header-cell","data-col":String(r),"data-label":a.label,className:K("lintel-header-cell lintel-mono flex items-center justify-center overflow-hidden",a.blockEnd&&"lintel-header-cell--blockend",a.isHourStart?"lintel-header-cell--hour":"lintel-header-cell--half"),style:{height:"var(--lintel-header-h)"},children:a.isHourStart?a.label:""},a.label)),(0,W.jsx)("div",{"aria-hidden":!0,"data-col":"spacer",style:{height:"var(--lintel-header-h)"}})]})}function l2({room:e,cursor:t,photo:o}){let a=e.serial||e.name;return(0,W.jsxs)("div",{role:"rowheader",className:K("lintel-roomcol",t&&"lintel-roomcol--cursor"),children:[(0,W.jsx)(ks,{src:o,roomCode:a,equipment:e.equipment}),(0,W.jsx)("span",{className:"lintel-mono lintel-room-code truncate font-medium text-foreground",title:e.name,children:a}),(0,W.jsx)("span",{className:"lintel-room-type truncate text-[12px] text-muted-foreground",title:e.type,children:e.type}),e.capacity>0&&(0,W.jsx)("span",{className:"lintel-mono lintel-cap text-[12px]",title:`Capacity ${e.capacity}`,"aria-label":`capacity ${e.capacity}`,children:e.capacity})]})}function i2(e,t){return e?"loading":t?t.state==="free"?"free":t.state==="taken"?"booked":t.state==="closed"?"closed":`unknown (status ${t.status})`:"no data"}function oi({label:e,children:t}){return(0,W.jsxs)("div",{className:"flex flex-col gap-0.5",children:[(0,W.jsx)("span",{className:"text-[12px] text-muted-foreground",children:e}),(0,W.jsx)("span",{className:"text-[13px] text-foreground [overflow-wrap:anywhere]",children:t})]})}function i0({booker:e,booking:t,open:o,onOpenChange:a,onToggle:r,children:n}){let l=QR(t)?t:void 0,i=l?.bookedBy??e??"",s=l?YR(l):"",u=Ze.useRef(null);return(0,W.jsxs)(Vl,{open:o,onOpenChange:a,children:[(0,W.jsx)(Wl,{asChild:!0,ref:d=>{u.current=d},children:n}),(0,W.jsx)(Mn,{align:"start",className:"lintel-booking-info w-80 max-w-[min(20rem,calc(100vw-1.5rem))]","data-testid":"lintel-booking-info",onPointerDownOutside:d=>{let f=d.detail?.originalEvent,m=f&&typeof f.composedPath=="function"?f.composedPath():[],h=u.current;h&&(m.includes(h)||d.target instanceof Node&&h.contains(d.target))&&d.preventDefault()},children:(0,W.jsxs)("div",{className:"flex flex-col gap-2.5",children:[(0,W.jsx)("div",{className:"text-[13px] font-semibold text-foreground",children:"Booking details"}),l?.purpose&&(0,W.jsx)(oi,{label:"Purpose",children:l.purpose}),i&&(0,W.jsx)(oi,{label:"Booked by",children:i}),s&&(0,W.jsx)(oi,{label:"Time",children:s}),l?.bookingStatus!=null&&(0,W.jsx)(oi,{label:"Status",children:XR(l.bookingStatus)}),l?.resourceType&&(0,W.jsx)(oi,{label:"Type",children:l.resourceType}),l?.capacity!=null&&(0,W.jsx)(oi,{label:"Capacity",children:l.capacity}),!l&&!i&&(0,W.jsx)("div",{className:"text-[13px] text-muted-foreground",children:"No further booking details available."})]})})]})}var s2=Ze.memo(function({slot:t,roomCode:o,label:a,endLabel:r,outside:n,selected:l,skeleton:i,past:s,blockEnd:u,cellIndex:d,infoOpen:f,onInfoOpenChange:m,onInfoToggle:h,onClick:y}){let g=i2(i,t),x="lintel-cell--unknown";i?x="lintel-cell--skeleton":t?t.state==="free"?x="lintel-cell--free":t.state==="taken"?x="lintel-cell--booked":t.state==="closed"&&(x="lintel-cell--closed"):x="lintel-cell--unknown";let p=i?"skeleton":t?t.state==="taken"?"booked":t.state:"unknown",c=`${o} ${a}-${r} ${g}`,v=!i&&t0(t,{past:s}),w=!i&&!!s&&t?.state==="free",b=!i&&t?.state==="taken",L=b&&typeof d=="number"?{"--lintel-cell-i":d}:void 0,C=(0,W.jsx)("div",{role:"gridcell","aria-label":i?void 0:c,"aria-busy":i||void 0,tabIndex:v||b?0:-1,"data-testid":"lintel-cell","data-state":p,"data-label":a,title:`${o} ${a}-${r}, ${g}`,onClick:v?y:b?S=>{S.preventDefault(),h?.()}:void 0,onKeyDown:v?S=>{(S.key==="Enter"||S.key===" ")&&(S.preventDefault(),y(S))}:b?S=>{(S.key==="Enter"||S.key===" ")&&(S.preventDefault(),h?.())}:void 0,style:L,className:K("lintel-cell",x,!i&&t?.state==="free"&&"lintel-cell-settle",b&&"lintel-cell-appear",b&&"lintel-cell--info",u&&"lintel-cell--hour",n&&"lintel-cell--outside",w&&"lintel-cell--past",l&&"lintel-cell--sel"),children:l?(0,W.jsx)(wn,{className:"lintel-cell-tick","aria-hidden":"true",strokeWidth:3}):null});return b?(0,W.jsx)(i0,{booker:t?.booker,booking:t?.booking,open:f??!1,onOpenChange:m??(()=>{}),onToggle:h??(()=>{}),children:C}):C});function u2({roomCode:e,booker:t,booking:o,colStart:a,span:r,slotDividers:n,startLabel:l,endLabel:i,blockEnd:s,cellIndex:u,infoOpen:d,onInfoOpenChange:f,onInfoToggle:m}){let h=`${e} ${l}-${i}, booked by ${t}`,y=`${e} ${l}-${i} booked by ${t}`;return(0,W.jsx)(i0,{booker:t,booking:o,open:d,onOpenChange:f,onToggle:m,children:(0,W.jsxs)("div",{role:"gridcell","data-testid":"lintel-booker-block","data-state":"booked","data-label":l,"aria-label":y,title:h,tabIndex:0,onClick:g=>{g.preventDefault(),m()},onKeyDown:g=>{(g.key==="Enter"||g.key===" ")&&(g.preventDefault(),m())},style:{gridColumn:`${a} / span ${r}`,...typeof u=="number"?{"--lintel-cell-i":u}:null},className:K("lintel-cell lintel-cell--booked lintel-cell--info lintel-booker-block lintel-cell-appear flex items-center justify-center overflow-hidden",s&&"lintel-cell--hour"),children:[(0,W.jsx)("span",{"aria-hidden":!0,className:"lintel-block-grid",children:n.map((g,x)=>(0,W.jsx)("span",{className:g?"lintel-block-grid-hour":void 0},x))}),(0,W.jsx)("span",{className:"lintel-booker-block-name truncate px-1 text-[12px]",children:t})]})})}function d2({row:e,rowIndex:t,takenOffset:o,axis:a,template:r,zebra:n,cursor:l,photo:i,selection:s,windowStart:u,windowEnd:d,isToday:f,nowMinutes:m,onCellClick:h,onRetry:y,registerRowRef:g,openBlockId:x,onInfoOpenChange:p,onInfoToggle:c}){let v=Ze.useCallback(P=>g(e.room.id,P),[g,e.room.id]),w=e.state.kind==="loaded"?e.state.cells:null,b=e.state.kind==="skeleton",L=e.room.serial||e.room.name,C=Ze.useMemo(()=>xg(a),[a]),{blockStart:S,covered:T}=Ze.useMemo(()=>{let P=new Map,q=new Set;if(w){for(let M of Xh(w))if(M.span>1&&M.state==="taken"&&M.booker){P.set(M.start,M);for(let X=M.start+1;X<=M.end;X++)q.add(X)}}return{blockStart:P,covered:q}},[w]);return(0,W.jsxs)("div",{ref:v,role:"row","data-testid":"lintel-row","data-room-id":e.room.id,className:K("lintel-row grid",n&&"lintel-row--zebra",b&&"lintel-row-reveal"),style:{gridTemplateColumns:r,...b?{"--lintel-row-i":t}:null},children:[(0,W.jsx)(l2,{room:e.room,cursor:l,photo:i}),e.state.kind==="failed"?(0,W.jsxs)("div",{role:"gridcell",className:"flex items-center gap-2 px-2 text-[12px] text-destructive",style:{gridColumn:`2 / span ${a.length}`,height:"var(--lintel-row-h)"},children:[(0,W.jsxs)("span",{children:["failed: ",e.state.error]}),(0,W.jsx)(ee,{size:"sm",variant:"outline",onClick:()=>y(e.room.id),children:"retry"})]}):(()=>{let P=o;return C.map((q,M)=>{if(T.has(M))return null;let X=q.label,R=S.get(M);if(R){let de=C[R.end],we=P++,ct=`${e.room.id}:${M}`;return(0,W.jsx)(u2,{roomCode:L,booker:R.booker,booking:w?w[R.start]?.booking:void 0,colStart:M+2,span:R.span,slotDividers:C.slice(R.start,R.end).map(J=>J.blockEnd),startLabel:X,endLabel:l0(Ur(de.label)+30),blockEnd:de.blockEnd,cellIndex:we,infoOpen:x===ct,onInfoOpenChange:J=>p(ct,J),onInfoToggle:()=>c(ct)},X)}let U=Ur(X),B=U<u||U>=d,A=jh(s,e.room.id,M)!==-1,N=l0(U+30),O=w?w[M]:null,Q=f&&e0(U,m),ae=!b&&O?.state==="taken",he=ae?P++:void 0,pe=`${e.room.id}:${M}`;return(0,W.jsx)(s2,{slot:O,roomCode:L,label:X,endLabel:N,outside:B,selected:A,skeleton:b,past:Q,blockEnd:q.blockEnd,cellIndex:he,infoOpen:ae?x===pe:void 0,onInfoOpenChange:ae?de=>p(pe,de):void 0,onInfoToggle:ae?()=>c(pe):void 0,onClick:de=>h(e.room.id,M,de)},X)})})(),(0,W.jsx)("div",{"aria-hidden":!0,"data-col":"spacer",style:{height:"var(--lintel-row-h)"}})]})}function s0({model:e,form:t,hasSearched:o=!0,images:a,cursorIndex:r,selection:n,onCellClick:l,registerRowRef:i,onRevealNative:s,scrollRef:u}){let{axis:d,rows:f}=e,m=Ze.useMemo(()=>{let A=0;return f.map(N=>{let O=A;return N.state.kind==="loaded"&&(A+=r0(N.state.cells)),O})},[f]),h=Ze.useMemo(()=>`var(--lintel-roomcol-w, 296px) repeat(${d.length}, var(--lintel-slot-w, ${n0}px)) var(--lintel-gutter)`,[d]),y=Ur(t.window.start),g=Ur(t.window.end),[x,p]=Ze.useState(null),c=Ze.useRef({blockId:"",t:0}),v=Ze.useCallback(A=>{let N=c.current;if(N.blockId===A&&Date.now()-N.t<250){c.current={blockId:"",t:0},p(Q=>Q===A?null:Q);return}p(Q=>a0(Q,A))},[]),w=Ze.useCallback((A,N)=>{N||(c.current={blockId:A,t:Date.now()},p(O=>O===A?null:O))},[]),[b,L]=Ze.useState(()=>new Date);Ze.useEffect(()=>{let A=setInterval(()=>L(new Date),6e4);return()=>clearInterval(A)},[]);let C=RC(t.date,b),S=b.getHours()*60+b.getMinutes(),T=d.length?Ur(d[0]):y,P=o0(S,T),q=C&&d.length>0&&P<=d.length,M=Ze.useCallback((A,N,O)=>{l(A,N,{shift:O.shiftKey,meta:O.metaKey||O.ctrlKey})},[l]),X=Ze.useCallback(A=>{if(!A)return;A.scrollLeft+A.clientWidth>=A.scrollWidth-2?A.setAttribute("data-scrolled-end",""):A.removeAttribute("data-scrolled-end")},[]),R=Ze.useCallback(A=>X(A.currentTarget),[X]),U=Ze.useRef(null),B=Ze.useCallback(A=>{U.current=A,typeof u=="function"?u(A):u&&(u.current=A)},[u]);return Ze.useEffect(()=>{X(U.current)},[X,f.length,d.length]),o?e.status.sessionExpired?(0,W.jsxs)("div",{className:"flex flex-col items-start gap-3 p-6 text-sm","data-testid":"lintel-board-expired",role:"alert",children:[(0,W.jsx)("div",{className:"font-semibold text-destructive",children:"Session expired"}),(0,W.jsx)("div",{className:"text-muted-foreground",children:"Your SIT session has expired, so RBS returned its sign-in page instead of availability data. Sign in again, then reload the board."}),(0,W.jsxs)("div",{className:"lintel-mono break-all [overflow-wrap:anywhere] text-[12px] text-muted-foreground","data-testid":"lintel-board-expired-endpoint",children:["endpoint: POST ",e.endpoints.searchList]}),(0,W.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,W.jsx)(ee,{variant:"outline",onClick:e.reload,"data-testid":"lintel-board-expired-reload",children:"Reload"}),(0,W.jsx)(ee,{onClick:s,"data-testid":"lintel-board-expired-signin",children:"Sign in"})]})]}):e.status.error&&f.length===0&&!e.status.sessionExpired?(0,W.jsxs)("div",{className:"flex flex-col items-start gap-3 p-6 text-sm","data-testid":"lintel-board-error",role:"alert",children:[(0,W.jsx)("div",{className:"font-semibold text-destructive",children:"Could not load the board"}),(0,W.jsx)("div",{className:"text-muted-foreground",children:e.status.error}),(0,W.jsxs)("div",{className:"lintel-mono break-all [overflow-wrap:anywhere] text-[12px] text-muted-foreground",children:["endpoint: POST ",e.endpoints.searchList]}),(0,W.jsx)(ee,{variant:"outline",onClick:e.reload,"data-testid":"lintel-board-retry",children:"Retry"})]}):!e.status.done&&f.length===0&&!e.status.error?(0,W.jsxs)("div",{className:"flex items-center gap-2 p-6 text-sm text-muted-foreground","data-testid":"lintel-board-loading",role:"status",children:[(0,W.jsx)(va,{className:"h-4 w-4 animate-spin motion-reduce:animate-none"}),"Loading rooms\u2026"]}):e.status.done&&f.length===0&&!e.status.error?(0,W.jsxs)("div",{className:"flex flex-col items-start gap-2 p-6 text-sm","data-testid":"lintel-board-empty",children:[(0,W.jsx)("div",{className:"font-semibold text-foreground",children:"No rooms match these filters"}),(0,W.jsx)("div",{className:"text-muted-foreground",children:"Try a different building or room type."})]}):(0,W.jsxs)("div",{className:"flex h-full min-h-0 w-full flex-col",children:[(0,W.jsx)(c2,{}),(0,W.jsxs)("div",{className:"lintel-board-scrollwrap min-h-0 w-full flex-1",children:[(0,W.jsx)("div",{ref:B,onScroll:R,"data-testid":"lintel-board","data-ui":!0,role:"grid","aria-label":"Room availability board","aria-rowcount":f.length+1,className:"lintel-board-scroll min-h-0 w-full",children:(0,W.jsxs)("div",{className:"lintel-board-canvas",children:[(0,W.jsx)(n2,{axis:d,template:h}),q?(0,W.jsx)("div",{"data-testid":"lintel-now-line","aria-hidden":"true",className:"lintel-now-line",style:{left:`calc(var(--lintel-roomcol-w, 296px) + ${P} * var(--lintel-slot-w, ${n0}px))`}}):null,(0,W.jsx)("div",{role:"rowgroup",children:f.map((A,N)=>(0,W.jsx)(d2,{row:A,rowIndex:N,takenOffset:m[N],axis:d,template:h,zebra:N%2===1,cursor:N===r,photo:a[A.room.id]??"",selection:n,windowStart:y,windowEnd:g,isToday:C,nowMinutes:S,onCellClick:M,onRetry:e.retryRoom,registerRowRef:i,openBlockId:x,onInfoOpenChange:w,onInfoToggle:v},A.room.id))})]})}),(0,W.jsx)("div",{className:"lintel-board-scrollhint","aria-hidden":"true"})]})]}):(0,W.jsxs)("div",{className:"flex flex-col items-start gap-2 p-6 text-sm","data-testid":"lintel-board-prompt",children:[(0,W.jsx)("div",{className:"font-semibold text-foreground",children:"Choose your filters, then Search"}),(0,W.jsx)("div",{className:"text-muted-foreground",children:t.category==="equipment"?"Pick a type and lab above, then click Search to load availability. Nothing is fetched until you do.":"Pick a building, room type and time window above, then click Search to load availability. Nothing is fetched until you do."})]})}function c2(){return(0,W.jsxs)("div",{"data-testid":"lintel-legend",className:"lintel-canvas-x flex flex-wrap items-center gap-4 border-b border-border bg-card pb-2 text-[12px] text-muted-foreground","aria-label":"Legend",children:[(0,W.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,W.jsx)("span",{className:"lintel-legend-sw lintel-legend-sw--free"})," Free"]}),(0,W.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,W.jsx)("span",{className:"lintel-legend-sw lintel-legend-sw--booked"})," Booked"]}),(0,W.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,W.jsx)("span",{className:"lintel-legend-sw lintel-legend-sw--closed"})," Closed"]}),(0,W.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,W.jsx)("span",{className:"lintel-legend-sw",style:{background:"var(--lintel-sel)",borderColor:"var(--lintel-sel)"}})," ","Selected"]})]})}function f2(e,t,o){let a=t.find(u=>u.room.id===o.roomId)??null;if(!a)return null;let r=gC(e,o.start,o.end),n=a.state.kind==="loaded"?a.state.cells:[],l=hC(n,o.start,o.end),i=0,s=0;for(let u=o.start;u<=o.end;u++){let d=n[u];d&&(d.state==="free"?i++:d.state==="taken"&&s++)}return{id:o.id,roomId:a.room.id,roomName:a.room.name,roomCode:a.room.serial||a.room.name,roomType:a.room.type,capacity:a.room.capacity,window:r,durationMinutes:r.count*30,freeCount:i,bookedCount:s,conflict:l}}function u0(e,t,o,a){let r=[];for(let s of o){let u=f2(e,t,s);u&&r.push(u)}let n=0,l=0;for(let s of r)n+=s.freeCount,l+=s.bookedCount;let i=JR(r.map(s=>({id:s.id,roomId:s.roomId,start:0,end:s.window.count-1})));return{date:a,items:r,totalSlots:i,totalMinutes:i*30,totalFree:n,totalBooked:l}}var d0=k(z());var c0=k(H()),p2=xd("inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[12px] font-medium leading-tight transition-colors",{variants:{variant:{default:"border-border bg-secondary text-secondary-foreground",secondary:"border-transparent bg-muted text-muted-foreground",outline:"border-border bg-transparent text-foreground",destructive:"border-transparent bg-destructive/15 text-destructive"}},defaultVariants:{variant:"default"}}),zs=d0.forwardRef(({className:e,variant:t,...o},a)=>(0,c0.jsx)("span",{ref:a,className:K(p2({variant:t,className:e})),...o}));zs.displayName="Badge";var Me=k(H());function f0(e){if(e<=0)return"0 min";let t=Math.floor(e/60),o=e%60;return t===0?`${o} min`:o===0?`${t} h`:`${t} h ${o} min`}function Yh({model:e,onRemove:t,onClear:o,onBook:a,onBookAll:r,state:n="open",layout:l="docked"}){if(!e||e.items.length===0)return null;let i=e.items.filter(s=>!s.conflict&&s.freeCount>0).length;return(0,Me.jsxs)("aside",{"data-testid":"lintel-drawer","data-state":n==="closing"?"closed":"open","data-layout":l,className:"lintel-drawer flex h-full w-full flex-col gap-3 border-l border-border bg-card p-4",children:[(0,Me.jsxs)("div",{children:[(0,Me.jsx)("div",{className:"text-sm font-semibold text-foreground",children:"Selected slots"}),(0,Me.jsxs)("div",{className:"text-xs text-muted-foreground","data-testid":"lintel-cart-count",children:[e.items.length," ",e.items.length===1?"room":"rooms"," \xB7 ",e.totalSlots," slot(s)"]})]}),e.date&&(0,Me.jsx)("div",{className:"lintel-mono text-[12px] text-muted-foreground","data-testid":"lintel-cart-date",children:e.date}),(0,Me.jsx)("div",{className:"flex min-h-0 flex-1 flex-col gap-2 overflow-auto","data-testid":"lintel-cart-list",children:e.items.map(s=>(0,Me.jsxs)("div",{"data-testid":"lintel-cart-item","data-room-id":s.roomId,className:"rounded-md border border-border bg-secondary p-2",children:[(0,Me.jsxs)("div",{className:"flex items-start justify-between gap-2",children:[(0,Me.jsxs)("div",{className:"min-w-0",children:[(0,Me.jsx)("div",{className:"lintel-mono truncate text-[12px] font-medium text-foreground",title:s.roomName,children:s.roomCode}),(0,Me.jsx)("div",{className:"truncate text-[12px] text-muted-foreground",title:s.roomType,children:s.capacity>0?`${s.roomType} \xB7 cap ${s.capacity}`:s.roomType})]}),(0,Me.jsx)(ee,{type:"button",variant:"ghost",size:"icon","aria-label":`Remove ${s.roomCode} ${s.window.start}-${s.window.end}`,onClick:()=>t(s.id),"data-testid":"lintel-cart-remove",className:"h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive",children:(0,Me.jsx)(Za,{className:"h-3.5 w-3.5"})})]}),(0,Me.jsxs)("div",{className:"lintel-mono mt-1 text-[12px] text-foreground","data-testid":"lintel-cart-window",children:[s.window.start," - ",s.window.end]}),(0,Me.jsxs)("div",{className:"text-[12px] text-muted-foreground","data-testid":"lintel-cart-duration",children:[s.window.count," slot(s) \xB7 ",f0(s.durationMinutes)]}),(0,Me.jsx)("div",{className:"mt-1",children:(0,Me.jsxs)(zs,{variant:s.conflict?"destructive":"secondary","data-testid":"lintel-cart-counts",children:[s.freeCount," free \xB7 ",s.bookedCount," booked",s.conflict?" (contains booked slots)":""]})}),(0,Me.jsx)(ee,{size:"sm",className:"mt-2 w-full",onClick:()=>a(s.id),disabled:s.conflict||s.freeCount===0,"data-testid":"lintel-cart-book",children:"Book this slot"})]},s.id))}),(0,Me.jsxs)("div",{className:"rounded-md border border-border p-2 text-[12px] text-muted-foreground","data-testid":"lintel-cart-total",children:[(0,Me.jsxs)("div",{className:"flex justify-between",children:[(0,Me.jsx)("span",{children:"Total"}),(0,Me.jsxs)("span",{className:"lintel-mono text-foreground",children:[e.totalSlots," slot(s) \xB7 ",f0(e.totalMinutes)]})]}),(0,Me.jsxs)("div",{className:"flex justify-between",children:[(0,Me.jsx)("span",{children:"Across rooms"}),(0,Me.jsxs)("span",{className:"lintel-mono",children:[e.totalFree," free \xB7 ",e.totalBooked," booked"]})]})]}),(0,Me.jsxs)("div",{className:"mt-auto flex flex-col gap-2",children:[(0,Me.jsxs)(ee,{onClick:r,disabled:i===0,"data-testid":"lintel-cart-book-all",children:["Book all (",i,")"]}),(0,Me.jsx)(ee,{variant:"outline",onClick:o,"data-testid":"lintel-cart-clear",children:"Clear all"})]})]})}function p0({scrollLeft:e,maxScrollLeft:t,drawerWidth:o,atEndThreshold:a}){if(o<=0||t<=0||!(t-e<=a))return null;let n=t+o;return n<=e?null:{scrollLeft:n}}var Na=k(z());function m2(e){let t=/^(\d{1,2}):(\d{2})$/.exec((e||"").trim());return t?Number(t[1])*60+Number(t[2]):NaN}function g2(e){let t=(e%1440+1440)%1440;return`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`}function h2(e){return e.map((t,o)=>{let a=m2(t.time),r=`${t.time}-${g2(a+30)}`;return{SRNO:o+1,SLT_ID:t.sltId,SLT_Time:t.time,SLT_Desc:r,encryptedSlotStatus:null,SLT_STATUS:t.status,encryptedSLT_Time:null}})}function v2(e){return JSON.stringify(h2(e))}function x2(e){return{__RequestVerificationToken:e.token,checkReorNot:"0",RSRC_ID:e.rsrcId,RSRC_TYP_ID:e.rsrcTypId,DateList:JSON.stringify([e.date]),Date:e.date,SlotList:e.slotList,MaxBkgRuleVal:String(e.maxBkgRuleVal),IS_SLD:"false",IS_StudentLeader:"false"}}function w2(e){return{__RequestVerificationToken:e.token,RSRC_ID:e.rsrcId,RSRC_TYP_ID:e.rsrcTypId}}function y2(e){return{__RequestVerificationToken:e.token,RSRC_ID:e.rsrcId,RSRC_TYP_ID:e.rsrcTypId,SearchDate:e.searchDate,Date:e.date,SlotList:e.slotList}}function b2(e){return{__RequestVerificationToken:e.token,RSRC_ID:e.rsrcId,RSRC_TYP_ID:e.rsrcTypId,SearchDate:e.searchDate,SlotList:e.slotList,APPRV_EXEMP:e.apprvExemp?"true":"false",SUPPT_EXEMP:e.supptExemp?"true":"false",checkReorNot:"0",IS_IN4SIT:e.checks?.isIn4sit?"true":"false",IS_SUPT:e.checks?.isSupt?"true":"false",IS_APPRVL:e.checks?.isApprvl?"true":"false"}}var ai="study";function S2(e){return{__RequestVerificationToken:e.token,RSRC_TYP_ID:e.rsrcTypId,NUM_ATTND:String(e.numAttnd),Event_TypeText:"",Acad_Text:"",Purpose:e.purpose,supptList:"[]",OVERWRITE:"0",slcPurpose:""}}function C2(e){let t=e??{},a=(Array.isArray(t.permission)?t.permission:[])[0]??{};return{apprvExemp:a.APPRV_EXEMP===!0,supptExemp:a.SUPPT_EXEMP===!0,maxdate:String(t.maxdate??"")}}function L2(e){return{ok:(e??{})._ret==="true"}}function k2(e){let t=e??{},o=a=>Array.isArray(a)?a.map(r=>({SlotDate:String(r.SlotDate??""),DisplaySlotList:Array.isArray(r.DisplaySlotList)?r.DisplaySlotList.map(n=>String(n)):[]})):[];return{available:o(t.AvailableSlotList),conflict:o(t.ConflictSlotList),rsrcDivId:String(t.RSRC_DIV_ID??""),userName:String(t.usr_name??"")}}function I2(e){let t=e??{},o=t.showdata??{},a=r=>Array.isArray(r)?r.map(n=>({SlotDate:String(n.SlotDate??""),DisplaySlotList:Array.isArray(n.DisplaySlotList)?n.DisplaySlotList.map(l=>String(l)):[]})):[];return{ok:t.result==="success",available:a(o.AvailableSlotList),conflict:a(o.ConflictSlotList)}}function m0(e,t){let o=new Set;for(let n of e||[])for(let l of n?.DisplaySlotList||[]){let i=String(l).split(" - ")[0]?.trim();i&&o.add(i)}let a=[],r=new Set;for(let n of t||[])!n||!n.sltId||o.has(n.time)&&(r.has(n.sltId)||(r.add(n.sltId),a.push(n.sltId)));return a}async function Uc(e,t){for(let d of e.slots){if(!d.sltId)throw new Error("a selected slot is missing its SLT_ID");if(d.status!==1)throw new Error("a selected slot is not free")}if(e.slots.length===0)throw new Error("no slots selected");let o=v2(e.slots),a=await t.getPermissionByIDs(w2({token:e.token,rsrcId:e.rsrcId,rsrcTypId:e.rsrcTypId})),r=C2(a);await t.checkBookingPeriod(y2({token:e.token,rsrcId:e.rsrcId,rsrcTypId:e.rsrcTypId,searchDate:e.date,date:e.date,slotList:o}));let n=await t.checkSingleBookingRule(x2({token:e.token,rsrcId:e.rsrcId,rsrcTypId:e.rsrcTypId,date:e.date,slotList:o,maxBkgRuleVal:e.maxBkgRuleVal}));if(!L2(n).ok)return{stage:"rule",ok:!1,raw:n};let l=await t.normalBookingConfirmation(b2({token:e.token,rsrcId:e.rsrcId,rsrcTypId:e.rsrcTypId,searchDate:e.date,slotList:o,apprvExemp:r.apprvExemp,supptExemp:r.supptExemp,checks:e.checks})),i=k2(l);if(i.conflict.length>0)return{stage:"confirm",ok:!1,available:i.available,conflict:i.conflict,raw:l};let s=await t.bookingSaving(S2({token:e.token,rsrcTypId:e.rsrcTypId,numAttnd:e.numAttnd,purpose:e.purpose})),u=I2(s);return{stage:"saved",ok:u.ok,available:u.available,conflict:u.conflict,raw:s}}var ke=k(H());function g0({lists:e}){return(0,ke.jsx)("div",{className:"flex flex-col gap-0.5",children:e.map((t,o)=>(0,ke.jsxs)("div",{className:"lintel-mono text-[12px] text-foreground",children:[t.SlotDate,": ",t.DisplaySlotList.join(", ")]},`${t.SlotDate}-${o}`))})}function h0({line:e,open:t,onOpenChange:o,onBooked:a}){let[r,n]=Na.useState("1"),[l,i]=Na.useState(""),[s,u]=Na.useState(!1),[d,f]=Na.useState(null),[m,h]=Na.useState(null);Na.useEffect(()=>{t&&(n("1"),i(""),f(null),h(null),u(!1))},[t,e?.cartId]);let y=l.trim()||ai,g=Math.max(1,Math.floor(Number(r)||0)),x=!!e&&!s&&!d,p=Na.useCallback(()=>{!e||s||(u(!0),h(null),Uc({token:"",rsrcId:e.rsrcId,rsrcTypId:e.rsrcTypId,date:e.date,slots:e.slots,maxBkgRuleVal:e.maxBkgRuleVal,numAttnd:g,purpose:y,checks:e.checks},{getPermissionByIDs:Kd,checkBookingPeriod:Xd,checkSingleBookingRule:Yd,normalBookingConfirmation:Qd,bookingSaving:Zd}).then(c=>{f(c),c.stage==="saved"&&c.ok&&a(e.cartId,c.available)}).catch(c=>{h(c instanceof Error?c.message:String(c))}).finally(()=>u(!1)))},[e,s,y,g,a]);return e?(0,ke.jsx)(Ca,{open:t,onOpenChange:o,children:(0,ke.jsxs)(ta,{"data-testid":"lintel-booking-dialog",children:[(0,ke.jsx)(Pl,{children:(0,ke.jsx)(La,{children:"Confirm booking"})}),(0,ke.jsxs)("div",{className:"mt-2 flex flex-col gap-3",children:[(0,ke.jsxs)("div",{className:"rounded-md border border-border bg-secondary p-2",children:[(0,ke.jsx)("div",{className:"lintel-mono text-[13px] font-medium text-foreground",children:e.roomCode}),(0,ke.jsx)("div",{className:"lintel-mono mt-0.5 text-[12px] text-muted-foreground",children:e.date}),(0,ke.jsx)("div",{className:"mt-1 flex flex-wrap gap-1",children:e.slots.map(c=>(0,ke.jsx)("span",{className:"lintel-mono rounded bg-card px-1.5 py-0.5 text-[12px] text-foreground",children:c.time},c.sltId||c.time))})]}),(0,ke.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,ke.jsx)(mt,{htmlFor:"lintel-num-attnd",children:"Number of attendees"}),(0,ke.jsx)(Lo,{id:"lintel-num-attnd",type:"number",min:1,value:r,onChange:c=>n(c.target.value),"data-testid":"lintel-num-attnd",disabled:s||!!d})]}),(0,ke.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,ke.jsx)(mt,{htmlFor:"lintel-purpose",children:"Purpose"}),(0,ke.jsx)(Lo,{id:"lintel-purpose",type:"text",placeholder:ai,value:l,onChange:c=>i(c.target.value),"data-testid":"lintel-purpose",disabled:s||!!d})]}),m&&(0,ke.jsx)("div",{className:"rounded-md border border-destructive/50 p-2 text-[12px] text-destructive","data-testid":"lintel-booking-error",role:"alert",children:m}),d&&d.stage==="rule"&&(0,ke.jsx)("div",{className:"rounded-md border border-destructive/50 p-2 text-[12px] text-destructive","data-testid":"lintel-booking-rule-failed",role:"alert",children:"RBS rejected this booking at the rule check. Nothing was booked."}),d&&d.stage==="confirm"&&(0,ke.jsxs)("div",{className:"rounded-md border border-destructive/50 p-2 text-[12px]","data-testid":"lintel-booking-conflict",role:"alert",children:[(0,ke.jsx)("div",{className:"font-semibold text-destructive",children:"Some slots conflict. Nothing was booked."}),d.conflict.length>0&&(0,ke.jsxs)("div",{className:"mt-1",children:[(0,ke.jsx)("div",{className:"text-[12px] text-muted-foreground",children:"Conflicting:"}),(0,ke.jsx)(g0,{lists:d.conflict})]})]}),d&&d.stage==="saved"&&d.ok&&(0,ke.jsxs)("div",{className:"rounded-md border border-border p-2 text-[12px]","data-testid":"lintel-booking-success",children:[(0,ke.jsx)("div",{className:"font-semibold text-foreground",children:e?.equipment?"Submitted. It shows under Pending, then moves to Upcoming.":"Booked."}),(0,ke.jsx)(g0,{lists:d.available})]}),d&&d.stage==="saved"&&!d.ok&&(0,ke.jsx)("div",{className:"rounded-md border border-destructive/50 p-2 text-[12px] text-destructive","data-testid":"lintel-booking-notsaved",role:"alert",children:"RBS did not confirm the booking. Nothing was booked."}),(0,ke.jsxs)("div",{className:"mt-1 flex justify-end gap-2",children:[(0,ke.jsx)(ee,{variant:"outline",onClick:()=>o(!1),"data-testid":"lintel-booking-close",children:d&&d.stage==="saved"&&d.ok?"Done":"Cancel"}),!(d&&d.stage==="saved"&&d.ok)&&(0,ke.jsx)(ee,{onClick:p,disabled:!x,"aria-disabled":!x,"data-testid":"lintel-booking-confirm","aria-busy":s||void 0,children:s?"Booking\u2026":"Confirm booking"})]})]})]})}):null}var Ma=k(z());async function v0(e,t,o,a={}){let r=[];for(let n=0;n<e.length;n++){let l=e[n],i;try{let s=await Uc({token:"",rsrcId:l.rsrcId,rsrcTypId:l.rsrcTypId,date:l.date,slots:l.slots,maxBkgRuleVal:l.maxBkgRuleVal,numAttnd:o.numAttnd,purpose:o.purpose,checks:l.checks},t);s.stage==="saved"&&s.ok?(i={cartId:l.cartId,status:"booked",outcome:s},a.onLineBooked?.(l.cartId,s.available)):i={cartId:l.cartId,status:"failed",outcome:s}}catch(s){i={cartId:l.cartId,status:"error",error:s instanceof Error?s.message:String(s)}}r.push(i),a.onLineResult?.(i,n)}return r}var be=k(H());function R2({lists:e}){return(0,be.jsx)("div",{className:"flex flex-col gap-0.5",children:e.map((t,o)=>(0,be.jsxs)("div",{className:"lintel-mono text-[12px] text-foreground",children:[t.SlotDate,": ",t.DisplaySlotList.join(", ")]},`${t.SlotDate}-${o}`))})}function x0({lines:e,open:t,onOpenChange:o,onLineBooked:a}){let[r,n]=Ma.useState("1"),[l,i]=Ma.useState(""),[s,u]=Ma.useState(!1),[d,f]=Ma.useState(!1),[m,h]=Ma.useState({}),y=e.map(b=>b.cartId).join("|");Ma.useEffect(()=>{t&&(n("1"),i(""),u(!1),f(!1),h(Object.fromEntries(e.map(b=>[b.cartId,{phase:"pending"}]))))},[t,y]);let g=l.trim()||ai,x=Math.max(1,Math.floor(Number(r)||0)),p=e.length>0&&!s&&!d,c=Ma.useCallback(()=>{s||d||e.length===0||(u(!0),v0(e.map(b=>({cartId:b.cartId,rsrcId:b.rsrcId,rsrcTypId:b.rsrcTypId,date:b.date,slots:b.slots,maxBkgRuleVal:b.maxBkgRuleVal,checks:b.checks})),{getPermissionByIDs:Kd,checkBookingPeriod:Xd,checkSingleBookingRule:Yd,normalBookingConfirmation:Qd,bookingSaving:Zd},{numAttnd:x,purpose:g},{onLineBooked:(b,L)=>a(b,L),onLineResult:b=>{h(L=>({...L,[b.cartId]:{phase:"done",result:b}}))}}).catch(()=>{}).finally(()=>{u(!1),f(!0)}),h(b=>{let L={...b};for(let C of e)L[C.cartId]={phase:"booking"};return L}))},[s,d,e,g,x,a]);if(e.length===0)return null;let v=e.some(b=>b.equipment),w=Object.values(m).filter(b=>b.phase==="done"&&b.result.status==="booked").length;return(0,be.jsx)(Ca,{open:t,onOpenChange:o,children:(0,be.jsxs)(ta,{"data-testid":"lintel-batch-dialog",children:[(0,be.jsx)(Pl,{children:(0,be.jsx)(La,{children:v?e.length===1?"Book 1 item":`Book all ${e.length} items`:e.length===1?"Book 1 room":`Book all ${e.length} rooms`})}),(0,be.jsxs)("div",{className:"mt-2 flex flex-col gap-3",children:[(0,be.jsxs)("div",{className:"text-[12px] text-muted-foreground",children:["Each ",v?"item":"room"," is booked one at a time, in order. If one fails, the rest still run and you will see exactly which succeeded."]}),(0,be.jsx)("div",{className:"flex max-h-[220px] flex-col gap-2 overflow-auto",children:e.map(b=>{let L=m[b.cartId]??{phase:"pending"};return(0,be.jsxs)("div",{"data-testid":"lintel-batch-line","data-room-id":b.rsrcId,"data-line-id":b.cartId,className:"rounded-md border border-border bg-secondary p-2",children:[(0,be.jsxs)("div",{className:"flex items-start justify-between gap-2",children:[(0,be.jsxs)("div",{className:"min-w-0",children:[(0,be.jsx)("div",{className:"lintel-mono truncate text-[12px] font-medium text-foreground",children:b.roomCode}),(0,be.jsx)("div",{className:"lintel-mono text-[12px] text-muted-foreground",children:b.date})]}),(0,be.jsx)(T2,{status:L,equipment:b.equipment})]}),(0,be.jsx)("div",{className:"mt-1 flex flex-wrap gap-1",children:b.slots.map(C=>(0,be.jsx)("span",{className:"lintel-mono rounded bg-card px-1.5 py-0.5 text-[12px] text-foreground",children:C.time},C.sltId||C.time))})]},b.cartId)})}),(0,be.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,be.jsx)(mt,{htmlFor:"lintel-batch-num-attnd",children:"Number of attendees"}),(0,be.jsx)(Lo,{id:"lintel-batch-num-attnd",type:"number",min:1,value:r,onChange:b=>n(b.target.value),"data-testid":"lintel-batch-num-attnd",disabled:s||d})]}),(0,be.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,be.jsx)(mt,{htmlFor:"lintel-batch-purpose",children:"Purpose"}),(0,be.jsx)(Lo,{id:"lintel-batch-purpose",type:"text",placeholder:ai,value:l,onChange:b=>i(b.target.value),"data-testid":"lintel-batch-purpose",disabled:s||d})]}),d&&(0,be.jsx)("div",{className:"rounded-md border border-border p-2 text-[12px]","data-testid":"lintel-batch-summary",children:v?`Submitted ${w} of ${e.length} item(s). They show under Pending, then move to Upcoming.`:`Booked ${w} of ${e.length} room(s).`}),(0,be.jsxs)("div",{className:"mt-1 flex justify-end gap-2",children:[(0,be.jsx)(ee,{variant:"outline",onClick:()=>o(!1),"data-testid":"lintel-batch-close",disabled:s,children:d?"Done":"Cancel"}),!d&&(0,be.jsx)(ee,{onClick:c,disabled:!p,"aria-disabled":!p,"data-testid":"lintel-batch-confirm","aria-busy":s||void 0,children:s?"Booking\u2026":e.length===1?"Confirm booking":`Confirm all ${e.length} bookings`})]})]})]})})}function T2({status:e,equipment:t}){if(e.phase==="pending")return(0,be.jsx)("span",{className:"text-[12px] text-muted-foreground","data-testid":"lintel-batch-line-status",children:"Waiting"});if(e.phase==="booking")return(0,be.jsx)("span",{className:"text-[12px] text-muted-foreground","data-testid":"lintel-batch-line-status",children:"Booking\u2026"});let o=e.result;if(o.status==="booked")return(0,be.jsxs)("div",{className:"text-right","data-testid":"lintel-batch-line-status","data-line-result":"booked",children:[(0,be.jsx)("span",{className:"text-[12px] font-semibold text-foreground","data-testid":"lintel-batch-line-booked",children:t?"Submitted":"Booked"}),(0,be.jsx)(R2,{lists:o.outcome.available})]});if(o.status==="error")return(0,be.jsx)("span",{className:"text-[12px] text-destructive",role:"alert","data-testid":"lintel-batch-line-status","data-line-result":"error",children:o.error});let a=o.outcome.stage==="rule"?"Rejected at the rule check":o.outcome.stage==="confirm"?"Slot conflict, not booked":"RBS did not confirm the booking";return(0,be.jsx)("span",{className:"text-[12px] text-destructive",role:"alert","data-testid":"lintel-batch-line-status","data-line-result":"failed",children:a})}function P2(e){if(!e)return!1;let t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable===!0}function zc(e){let t;if(typeof e.composedPath=="function"){let o=e.composedPath();t=o&&o.length>0?o[0]:void 0}return t||(t=e.target??void 0),P2(t)}function E2(e){return String(e??"").replace(":","")}function ri(e){return String(e??"").replace(/\s+/g," ").trim()}function A2(e){let t=new Map;if(!Array.isArray(e))return t;for(let o of e){if(!o||typeof o!="object")continue;let a=String(o.resourceID==null?"":o.resourceID),r=ri(o.bookedBy);if(!a||!r)continue;let n=String(o.slots==null?"":o.slots).split(",").map(l=>l.trim()).filter(Boolean);for(let l of n){let i=`${a}|${l}`;t.has(i)||t.set(i,r)}}return t}function D2(e){if(!e||typeof e!="object")return null;let t={},o=ri(e.Purpose);o&&(t.purpose=o);let a=ri(e.bookedBy);a&&(t.bookedBy=a);let r=ri(e.startTime);r&&(t.startTime=r);let n=ri(e.endTime);n&&(t.endTime=n);let l=ri(e.resourceType);if(l&&(t.resourceType=l),e.bookingStatus!=null){let i=Number(e.bookingStatus);Number.isFinite(i)&&(t.bookingStatus=i)}if(e.capacity!=null){let i=Number(e.capacity);Number.isFinite(i)&&(t.capacity=i)}return Object.keys(t).length>0?t:null}function N2(e){let t=new Map;if(!Array.isArray(e))return t;for(let o of e){if(!o||typeof o!="object")continue;let a=String(o.resourceID==null?"":o.resourceID);if(!a)continue;let r=D2(o);if(!r)continue;let n=String(o.slots==null?"":o.slots).split(",").map(l=>l.trim()).filter(Boolean);for(let l of n){let i=`${a}|${l}`;t.has(i)||t.set(i,r)}}return t}function M2(e){return e===1?"free":e===3?"taken":null}function B2(e){return{time:e,status:1,state:"free",sltId:"",dateTime:"",quota:0}}function w0(e,t){let o=new Map(t.map(a=>[a.time,a]));return e.map(a=>{if(!a||a.state!=="free"||a.sltId)return a;let r=o.get(a.time);return r&&r.state==="free"&&r.sltId?r:null})}function y0(e,t,o){let a=new Map,r=Array.isArray(o)?o:[],n=Array.isArray(t)?t:[],l=e&&Array.isArray(e.resultData)?e.resultData:[],i=A2(l),s=N2(l),u=new Map,d=e&&Array.isArray(e.resultSltData)?e.resultSltData:[];for(let f of d){if(!f||typeof f!="object")continue;let m=String(f.RSRC_ID==null?"":f.RSRC_ID);if(!m)continue;let h=String(f.TIMESLOT==null?"":f.TIMESLOT).padStart(4,"0"),y=u.get(m);y||(y=new Map,u.set(m,y)),y.has(h)||y.set(h,f)}for(let f of n){let m=f&&f.id?String(f.id):"",h=m?u.get(m):void 0;if(!h||h.size===0){a.set(m,r.map(g=>B2(g)));continue}let y=r.map(g=>{let x=E2(g),p=h.get(x);if(!p||p.RSRC_CLSR_ID!==null&&p.RSRC_CLSR_ID!==void 0)return null;let c=Number(p.STATUS),v=M2(c);if(v===null)return null;let w={time:g,status:c,state:v,sltId:String(p.SLT_ID==null?"":p.SLT_ID),dateTime:String(p.TIMESLOT_DT==null?"":p.TIMESLOT_DT),quota:0};if(v==="taken"){let b=i.get(`${m}|${x}`);b&&(w.booker=b);let L=s.get(`${m}|${x}`);L&&(w.booking=L)}return w});a.set(m,y)}return a}var Vc=k(z());var Qh="lintel.toast.longload.dismissed";function b0(){return globalThis.chrome?.storage?.local}function S0(e){let t=b0();return t?new Promise(o=>{let a=!1,r=n=>{a||(a=!0,o(n?n[e]===!0:!1))};try{let n=t.get(e,l=>r(l));n&&typeof n.then=="function"&&n.then(r).catch(()=>r(void 0))}catch{r(void 0)}}):Promise.resolve(!1)}function C0(e){let t=b0();if(t)try{let o=t.set({[e]:!0});o&&typeof o.catch=="function"&&o.catch(()=>{})}catch{}}function L0(e,t,o){return!e&&k0(t,o)}var Zh="Loading every room at once",O2="Lintel pulls the availability of all rooms up front, so you can scan the whole board instead of opening one room at a time like the original site. Fetching the slots now, hang tight.",Jh=7e3;function k0(e,t){return e>=t}function I0(e,t,o,a=Jh,r=!1){let n=Vc.useRef(null);Vc.useEffect(()=>{if(!e){n.current!==null&&(o(n.current),n.current=null);return}let l=Date.now(),i=setTimeout(()=>{L0(r,Date.now()-l,a)&&n.current===null&&(n.current=t(Zh,O2))},a);return()=>clearTimeout(i)},[e,t,o,a,r])}var Te=k(z());function R0(e,t){if(!Array.isArray(e))return[];let o=(t||"").trim();return o?e.filter(a=>(a.building||"").trim()===o):e.slice()}var _2=3;function T0(e,t){if(!Array.isArray(e)||t.size===0)return e;let o=!1,a=e.map(r=>r&&r.sltId&&t.has(r.sltId)?(o=!0,{...r,state:"taken",status:_2}):r);return o?a:e}function E0(e){return e.bookable!==!1&&e.permitted!==!1}function P0(e,t){let o=e.filter(E0),a=t.search.trim().toLowerCase();return a&&(o=o.filter(r=>r.name.toLowerCase().includes(a)||r.serial.toLowerCase().includes(a))),t.minCapacity>0&&(o=o.filter(r=>r.capacity>=t.minCapacity)),o=[...o],t.sort==="capacity"?o.sort((r,n)=>n.capacity-r.capacity||r.name.localeCompare(n.name)):o.sort((r,n)=>r.name.localeCompare(n.name)),o}function A0(e,t=!0){let o=Te.useMemo(()=>pC($t.start,$t.end),[]),[a,r]=Te.useState([]),[n,l]=Te.useState({total:0,loaded:0,failed:0,inFlight:0,elapsedMs:0,done:!0}),i=Te.useRef(new Map),s=Te.useRef(null),u=Te.useRef(null),d=Te.useRef(new Map),f=Te.useRef(0),[m,h]=Te.useState(0),y=Te.useRef([]),g=Te.useRef(!1),x=Te.useRef(0),p=Te.useRef(e);p.current=e;let c=(t?"1":"0")+"|"+m,v=Te.useRef(""),w=Te.useRef(new Map),b=Te.useCallback((R,U,B)=>{let A=w.current;A.clear();let N=[];for(let O of U){let Q=d.current.get(O.id);i.current.has(ys(O.id,B,$t,"All"))||Q&&H2(Q)?N.push(O):A.set(O.id,O)}R.enqueue(N),R.run()},[]),L=Te.useCallback((R,U)=>{let B=mC(o,U);r(A=>A.map(N=>N.room.id===R?{...N,state:{kind:"loaded",cells:B}}:N))},[o]),C=Te.useCallback((R,U)=>{r(B=>B.map(A=>A.room.id===R?{...A,state:{kind:"failed",error:U.message}}:A))},[]);Te.useEffect(()=>{let R=p.current;if(!R.date||!t)return;let U=`${R.category??""}|${R.date}`;v.current!==U&&(v.current=U,r([]));let B=!1;return s.current&&s.current.bumpGeneration(),w.current.clear(),l(A=>({...A,done:!1,error:void 0,inFlight:0,usingFallbackQueue:!1})),(async()=>{let A;try{A=await yg(R)}catch(he){if(B)return;let pe=he;if(pe instanceof Se&&pe.sessionExpired){s.current&&s.current.bumpGeneration(),i.current.clear(),r([]),l({total:0,loaded:0,failed:0,inFlight:0,elapsedMs:0,done:!0,error:pe.message,sessionExpired:!0});return}l(we=>({...we,done:!0,error:pe.message,sessionExpired:!1}));return}if(B)return;let N=P0(A,R),O=A.filter(he=>!E0(he)).length;if(y.current=N,g.current=!R.building,x.current+=1,r(N.map(he=>({room:he,state:{kind:"skeleton"}}))),f.current=Date.now(),l({total:N.length,loaded:0,failed:0,inFlight:0,elapsedMs:0,done:N.length===0,hidden:O,truncated:R.category==="equipment"&&A.length>=60,usingFallbackQueue:!1}),N.length===0)return;let Q=()=>{l(pe=>({...pe,usingFallbackQueue:!0}));let he=Sg({fetcher:async pe=>Ss(await bs(pe,R.date)),date:R.date,window:$t,status:"All",cache:i.current,onLoaded:(pe,de)=>{B||(L(pe,de),l(we=>({...we,loaded:we.loaded+1,inFlight:he.inFlight,elapsedMs:Date.now()-f.current})))},onError:(pe,de)=>{B||(C(pe,de),l(we=>({...we,failed:we.failed+1,inFlight:he.inFlight,elapsedMs:Date.now()-f.current})))},onProgress:()=>{B||l(pe=>({...pe,inFlight:he.inFlight}))},onDone:()=>{B||l(pe=>({...pe,done:!0,inFlight:0,elapsedMs:Date.now()-f.current}))}});s.current=he,b(he,N,R.date)},ae=x.current;R.roomType&&R.category!=="equipment"?(async()=>{let he;try{he=await yC(R.roomType,R.date)}catch(de){if(B||ae!==x.current)return;let we=de;if(we instanceof Se&&we.sessionExpired){s.current&&s.current.bumpGeneration(),i.current.clear(),r([]),l({total:0,loaded:0,failed:0,inFlight:0,elapsedMs:0,done:!0,error:we.message,sessionExpired:!0});return}Q();return}if(B||ae!==x.current)return;if(he.resultData.length===0&&he.resultSltData.length===0){Q();return}let pe=y0({resultData:he.resultData,resultSltData:he.resultSltData},N,o);for(let de of N){let we=pe.get(de.id);if(!we||we.some(ct=>ct===null)){Q();return}}for(let de of N){let we=pe.get(de.id);r(ct=>ct.map(J=>J.room.id===de.id?{...J,state:{kind:"loaded",cells:we}}:J)),i.current.set(ys(de.id,R.date,$t,"All"),we)}l(de=>({...de,loaded:N.length,failed:0,inFlight:0,done:!0,elapsedMs:Date.now()-f.current}))})():Q()})(),()=>{B=!0}},[c]),Te.useEffect(()=>{if(n.done)return;let R=setInterval(()=>{l(U=>U.done?U:{...U,elapsedMs:Date.now()-f.current})},250);return()=>clearInterval(R)},[n.done]),Te.useEffect(()=>{if(typeof IntersectionObserver>"u")return;let R=new IntersectionObserver(U=>{let B=s.current;if(!B)return;let A=!1;for(let N of U){if(!N.isIntersecting)continue;let O=N.target.dataset.roomId;if(!O)continue;let Q=w.current.get(O);Q&&(w.current.delete(O),B.enqueue(Q),A=!0),B.prioritize(O)}A&&(l(N=>({...N,done:!1})),B.run())},{root:null,rootMargin:"200px 0px",threshold:0});u.current=R;for(let U of d.current.values())R.observe(U);return()=>{R.disconnect(),u.current=null}},[]);let S=Te.useCallback((R,U)=>{let B=d.current.get(R);B&&B!==U&&u.current?.unobserve(B),U?(U.dataset.roomId=R,d.current.set(R,U),u.current?.observe(U)):B&&(u.current?.unobserve(B),d.current.delete(R))},[]),T=Te.useCallback(R=>{let U=s.current,B=a.find(A=>A.room.id===R);!U||!B||(i.current.delete(ys(R,e.date,$t,"All")),r(A=>A.map(N=>N.room.id===R?{...N,state:{kind:"skeleton"}}:N)),l(A=>({...A,failed:Math.max(0,A.failed-1),done:!1})),U.enqueue(B.room),U.prioritize(R),U.run())},[a,e.date]),P=Te.useCallback(()=>h(R=>R+1),[]),q=Te.useCallback((R,U)=>{if(!R||!U||U.length===0)return;let B=new Set(U.filter(Boolean));if(B.size===0)return;r(O=>O.map(Q=>{if(Q.room.id!==R||Q.state.kind!=="loaded")return Q;let ae=T0(Q.state.cells,B);return ae===Q.state.cells?Q:{...Q,state:{kind:"loaded",cells:ae}}}));let A=ys(R,p.current.date,$t,"All"),N=i.current.get(A);if(N){let O=T0(N,B);O!==N&&i.current.set(A,O)}},[]),M=Te.useCallback((R,U,B)=>{if(s.current&&s.current.bumpGeneration(),R.length===0){l(O=>({...O,done:!0,inFlight:0}));return}f.current=Date.now();let A=()=>B!==x.current,N=Sg({fetcher:async O=>Ss(await bs(O,U)),date:U,window:$t,status:"All",cache:i.current,onLoaded:(O,Q)=>{A()||(L(O,Q),l(ae=>({...ae,loaded:ae.loaded+1,inFlight:N.inFlight,elapsedMs:Date.now()-f.current})))},onError:(O,Q)=>{A()||(C(O,Q),l(ae=>({...ae,failed:ae.failed+1,inFlight:N.inFlight,elapsedMs:Date.now()-f.current})))},onProgress:()=>{A()||l(O=>({...O,inFlight:N.inFlight}))},onDone:()=>{A()||l(O=>({...O,done:!0,inFlight:0,elapsedMs:Date.now()-f.current}))}});s.current=N,b(N,R,U)},[L,C,b]),X=Te.useCallback((R,U)=>{if(!g.current||y.current.length===0)return;let B=p.current.date,A=R0(y.current,U),N=++x.current;if(r(A.map(Q=>({room:Q,state:{kind:"skeleton"}}))),l(Q=>({...Q,total:A.length,loaded:0,failed:0,inFlight:0,elapsedMs:0,done:A.length===0,error:void 0,sessionExpired:!1})),M(A,B,N),!U||!R)return;let O={...p.current,building:R};(async()=>{let Q;try{Q=await yg(O)}catch{return}if(N!==x.current)return;let ae=P0(Q,O);if(ae.length===A.length&&ae.every((de,we)=>A[we]&&A[we].id===de.id))return;let pe=++x.current;r(ae.map(de=>({room:de,state:{kind:"skeleton"}}))),l(de=>({...de,total:ae.length,loaded:0,failed:0,inFlight:0,elapsedMs:0,done:ae.length===0})),M(ae,B,pe)})()},[M]);return{axis:o,rows:a,status:n,endpoints:jd,observeRow:S,retryRoom:T,reload:P,markSlotsTaken:q,applyBuildingFilter:X}}function H2(e){let t=e.getBoundingClientRect(),o=window.innerHeight||document.documentElement.clientHeight;return t.top<o&&t.bottom>0}var Be=k(H());function q2(e){if(e.error)return e.error;let t=e.hidden&&e.hidden>0?`, ${e.hidden} hidden (not bookable)`:"",o=e.equipment?"item":"room";if(e.total===0)return(e.done?`No ${o}s`:`Loading ${o}s\u2026`)+t;let a=[];return e.truncated?a.push(`first ${e.total} items only, pick a lab or use Find`):a.push(`${e.total} ${e.total===1?o:`${o}s`}`),a.push(`${e.freeSlots} free ${e.freeSlots===1?"slot":"slots"}`),e.done?e.failed>0&&a.push(`${e.failed} failed`):a.push(`loading ${e.loaded}/${e.total}`),e.done&&e.waiting&&a.push(`scroll to load ${e.waiting} more`),a.join(", ")+t}function D0(e){return e?.equipment?"Booking submitted, see Pending":"Booking confirmed"}var U2={building:"",roomType:"",minCapacity:0,search:"",date:"",window:{start:$t.start,end:$t.end},sort:"name"},z2=3;function N0({onRevealNative:e}){let[t,o]=ne.useState(U2),[a,r]=ne.useState(0),[n,l]=ne.useState([]),i=ne.useRef(null),[s,u]=ne.useState(!1),[d,f]=ne.useState(void 0),[m,h]=ne.useState(!1),y=A0(t,s),{rows:g,axis:x,status:p}=y,c=ne.useRef(!1);ne.useEffect(()=>{if(c.current)return;c.current=!0;let $=!1;return lL().then(ce=>{if($)return;let fe=nL(ce,Date.now());if(h(!0),!fe)return;let ve=_I(fe.dateIso),_e=ve?Wr(ve):"";f({building:fe.building,roomType:fe.roomType.value,roomTypeLabel:fe.roomType.text,dateLabel:_e,windowStart:fe.windowStart,windowEnd:fe.windowEnd}),iL()}),()=>{$=!0}},[]);let{toasts:v,push:w,dismiss:b}=er(),L=s&&!p.done&&p.usingFallbackQueue===!0,[C,S]=ne.useState(!1);ne.useEffect(()=>{let $=!1;return S0(Qh).then(ce=>{$||S(ce)}),()=>{$=!0}},[]),I0(L,w,b,Jh,C);let[T,P]=ne.useState({}),q=ne.useMemo(()=>g.map($=>$.room.id).join(","),[g]);ne.useEffect(()=>{let $=!1;return Al().then(ce=>{$||P(fe=>({...gg(ce),...fe}))}),()=>{$=!0}},[]),ne.useEffect(()=>{let $=!1,ce=()=>{iC().then(ve=>{$||P(_e=>({..._e,...ve}))})};ce();let fe=setTimeout(ce,300);return()=>{$=!0,clearTimeout(fe)}},[q,p.done]);let M=ne.useRef(0);ne.useEffect(()=>{p.done&&(p.error?(M.current+=1,M.current>=z2&&e()):M.current=0)},[p.done,p.error,e]),ne.useEffect(()=>{r($=>Math.min($,Math.max(0,g.length-1)))},[g.length]);let X=ne.useRef(void 0),R=ne.useCallback($=>{X.current!==$.category&&u(!1),X.current=$.category,o($),l([])},[]),U=ne.useCallback($=>{u(!0),y.reload(),$&&$.dateIso&&$.dateLabel&&aL({...$,ts:Date.now()})},[y]),B=ne.useCallback(($,ce,fe)=>{l(_e=>Kh(_e,$,ce,fe));let ve=g.findIndex(_e=>_e.room.id===$);ve>=0&&r(ve)},[g]);ne.useEffect(()=>{function $(ce){let fe=zc(ce),ve=vC(ce.key.toLowerCase(),{inInput:fe});if(!(!ve||ve==="toggleNative"))switch(ce.preventDefault(),ve){case"focusSearch":i.current?.focus();break;case"rowDown":r(_e=>Math.min(g.length-1,_e+1));break;case"rowUp":r(_e=>Math.max(0,_e-1));break;case"handoff":{let _e=g[a];_e&&l(ii=>Kh(ii,_e.room.id,0,{shift:!1,meta:!0}));break}case"clear":l([]);break}}return window.addEventListener("keydown",$),()=>window.removeEventListener("keydown",$)},[g,a]);let A=ne.useMemo(()=>u0(x,g,n,t.date),[x,g,n,t.date]),N=320,O=200,Q=A.items.length>0,ae=Xl(),[he,pe]=ne.useState(Q),[de,we]=ne.useState(!1),[ct,J]=ne.useState(!1),Fe=ne.useRef(null),E=ne.useRef(Q),_=ne.useRef(null),se=ne.useRef(A);Q&&(se.current=A);let le=Q?A:se.current,Re=ne.useCallback(()=>typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,[]),st=ne.useRef(A.items.length);ne.useEffect(()=>{let $=st.current;st.current=A.items.length,ae&&$===0&&A.items.length>0&&J(!0)},[ae,A.items.length]),ne.useEffect(()=>{if(ae)return;let $=E.current;if(E.current=Q,Q){if(_.current&&(clearTimeout(_.current),_.current=null),we(!1),pe(!0),!$){let ce=Fe.current;if(ce&&!Re()){let fe=Math.max(0,ce.scrollWidth-ce.clientWidth),ve=p0({scrollLeft:ce.scrollLeft,maxScrollLeft:fe,drawerWidth:N,atEndThreshold:48});if(ve){let _e=performance.now(),ii=()=>{let Wo=Fe.current;if(!Wo)return;let Dt=Math.max(0,Wo.scrollWidth-Wo.clientWidth);if(Wo.scrollLeft=Math.min(Dt,ve.scrollLeft),performance.now()-_e<O)requestAnimationFrame(ii);else{let ho=Math.max(0,Wo.scrollWidth-Wo.clientWidth);Wo.scrollLeft=Math.min(ho,ve.scrollLeft)}};requestAnimationFrame(ii)}}}}else $&&he&&(Re()?(pe(!1),we(!1)):(we(!0),_.current=setTimeout(()=>{pe(!1),we(!1),_.current=null},220)))},[Q,ae]),ne.useEffect(()=>()=>{_.current&&clearTimeout(_.current)},[]);let[Ue,jt]=ne.useState(null),[ia,en]=ne.useState(!1),[li,Ws]=ne.useState([]),[$s,Gs]=ne.useState(!1),Ba=ne.useCallback(async($,ce=new Map)=>{let fe=n.find(Dt=>Dt.id===$);if(!fe)return null;let ve=g.find(Dt=>Dt.room.id===fe.roomId);if(!ve||ve.state.kind!=="loaded")return null;let _e=ve.state.cells;if(_e.slice(fe.start,fe.end+1).some(Dt=>Dt&&Dt.state==="free"&&!Dt.sltId)){let Dt=ve.room,ho=ce.get(Dt.id);ho||(ho=bs(Dt,t.date).then(Ss),ce.set(Dt.id,ho)),_e=w0(_e,await ho)}let Wo=[];for(let Dt=fe.start;Dt<=fe.end;Dt++){let ho=_e[Dt];if(!ho||ho.state!=="free"||!ho.sltId)return null;Wo.push({sltId:ho.sltId,time:ho.time,status:ho.status})}return Wo.length===0?null:{cartId:$,roomCode:ve.room.serial||ve.room.name,roomName:ve.room.name,rsrcId:ve.room.id,rsrcTypId:ve.room.typeId,date:t.date,equipment:ve.room.equipment,checks:ve.room.checks,slots:Wo,maxBkgRuleVal:5}},[n,g,t.date]),lr=ne.useCallback(async $=>{try{let ce=await Ba($);if(!ce){w("Slot no longer available","Search again to refresh the board.");return}jt(ce),en(!0)}catch(ce){w("Could not check this slot",ce.message)}},[Ba,w]),Hn=ne.useCallback(async()=>{let $=[],ce=new Map;try{for(let fe of A.items){if(fe.conflict||fe.freeCount===0)continue;let ve=await Ba(fe.id,ce);ve&&$.push(ve)}}catch(fe){w("Could not check these slots",fe.message);return}if($.length===0){w("Slots no longer available","Search again to refresh the board.");return}Ws($),Gs(!0)},[A.items,Ba,w]),$e=ne.useCallback(($,ce)=>{let fe=m0(ce,$.slots);fe.length>0&&y.markSlotsTaken($.rsrcId,fe)},[y]),ot=ne.useCallback(($,ce)=>{Ue&&Ue.cartId===$&&($e(Ue,ce),mg(Ue.roomName,Ue.rsrcId));let fe=ce.map(ve=>`${ve.SlotDate}: ${ve.DisplaySlotList.join(", ")}`).join("; ");w(D0(Ue),fe||"The booking was saved."),l(ve=>Us(ve,$))},[w,Ue,$e]),qn=ne.useCallback(($,ce)=>{let fe=li.find(_e=>_e.cartId===$);fe&&($e(fe,ce),mg(fe.roomName,fe.rsrcId));let ve=ce.map(_e=>`${_e.SlotDate}: ${_e.DisplaySlotList.join(", ")}`).join("; ");w(D0(fe),ve||"The booking was saved."),l(_e=>Us(_e,$))},[w,li,$e]),sa=ne.useMemo(()=>{let $=0;for(let ce of g)if(ce.state.kind==="loaded")for(let fe of ce.state.cells)fe&&fe.state==="free"&&$++;return $},[g]),Oa=s&&(0,Be.jsx)("span",{"data-testid":"lintel-status-counts",children:q2({total:p.total,loaded:p.loaded,failed:p.failed,freeSlots:sa,done:p.done,error:p.error,hidden:p.hidden,truncated:p.truncated,equipment:t.category==="equipment",waiting:g.filter($=>$.state.kind==="skeleton").length})});return(0,Be.jsxs)(Ja,{swipeDirection:"right",duration:8e3,children:[(0,Be.jsxs)("div",{className:"flex h-full min-h-0 w-full flex-col",children:[m&&(0,Be.jsx)(HI,{searching:s&&!p.done,onForm:R,onForceReload:y.reload,onSearch:U,loadOnDateChange:s,statusLine:Oa,onRevealNative:e,searchRef:i,initialForm:d,onBuildingDrilldown:y.applyBuildingFilter}),(0,Be.jsxs)("div",{className:"flex min-h-0 flex-1 overflow-hidden",children:[(0,Be.jsx)("div",{className:"min-w-0 flex-1 overflow-hidden",children:(0,Be.jsx)(s0,{model:y,form:t,hasSearched:s,images:T,cursorIndex:a,selection:n,onCellClick:B,registerRowRef:y.observeRow,onRevealNative:e,scrollRef:Fe})}),!ae&&(0,Be.jsx)("div",{className:"lintel-drawer-col h-full shrink-0 overflow-hidden",style:{width:he&&!de?N:0},children:he&&(0,Be.jsx)("div",{style:{width:N},className:"h-full",children:(0,Be.jsx)(Yh,{model:le,onRemove:$=>l(ce=>Us(ce,$)),onClear:()=>l([]),onBook:lr,onBookAll:Hn,state:de?"closing":"open"})})})]}),ae&&(0,Be.jsxs)(Be.Fragment,{children:[A.items.length>0&&!ct&&(0,Be.jsxs)(ee,{className:"fixed bottom-4 right-4 z-40 shadow-lg",style:{bottom:"calc(16px + var(--lintel-safe-bottom))"},"data-testid":"lintel-cart-fab",onClick:()=>J(!0),children:[A.items.length," selected"]}),(0,Be.jsx)(Ca,{open:ct&&A.items.length>0,onOpenChange:$=>{$||J(!1)},children:(0,Be.jsxs)(ta,{variant:"bottom-sheet",hideClose:!0,className:"max-h-[85dvh] p-3",children:[(0,Be.jsx)(La,{className:"sr-only",children:"Selected slots"}),(0,Be.jsx)("div",{className:"lintel-sheet-handle","aria-hidden":"true"}),(0,Be.jsx)(Yh,{model:A,layout:"sheet",onRemove:$=>l(ce=>Us(ce,$)),onClear:()=>l([]),onBook:lr,onBookAll:Hn})]})})]}),(0,Be.jsx)(h0,{line:Ue,open:ia,onOpenChange:en,onBooked:ot}),(0,Be.jsx)(x0,{lines:li,open:$s,onOpenChange:Gs,onLineBooked:qn})]}),v.map($=>(0,Be.jsx)(ya,{open:!0,onOpenChange:ce=>{ce||b($.id)},children:(0,Be.jsxs)("div",{className:"flex flex-col gap-1.5",children:[(0,Be.jsxs)("div",{className:"flex flex-col gap-0.5",children:[(0,Be.jsx)(ba,{children:$.title}),$.description&&(0,Be.jsx)(Sa,{children:$.description})]}),$.title===Zh&&(0,Be.jsx)(ee,{variant:"outline",size:"sm",className:"self-start","data-testid":"lintel-toast-longload-dismiss",onClick:()=>{C0(Qh),S(!0),b($.id)},children:"Don't show again"})]})},$.id)),(0,Be.jsx)(wa,{})]})}var _n=k(z());var ev="lintel.support.cache.v1";function V2(e){if(!e||typeof e!="object")return!1;let t=e;return typeof t.id=="string"&&typeof t.room=="string"&&typeof t.date=="string"&&typeof t.time=="string"&&typeof t.status=="string"}function W2(e){return!!e&&typeof e=="object"&&Array.isArray(e.rows)&&e.rows.every(V2)}function M0(e,t){if(e.length!==t.length)return!1;for(let o=0;o<e.length;o++){let a=e[o],r=t[o];if(a.id!==r.id||a.room!==r.room||a.date!==r.date||a.time!==r.time||a.status!==r.status)return!1}return!0}function B0(){return globalThis.chrome?.storage?.local}function O0(){let e=B0();return e?new Promise(t=>{let o=!1,a=r=>{if(o)return;o=!0;let n=r?r[ev]:void 0;t(W2(n)?n:null)};try{let r=e.get(ev,n=>a(n));r&&typeof r.then=="function"&&r.then(a).catch(()=>a(void 0))}catch{a(void 0)}}):Promise.resolve(null)}function F0(e){let t=B0();if(t)try{let o=t.set({[ev]:e});o&&typeof o.catch=="function"&&o.catch(()=>{})}catch{}}var ie=k(H());function $2({route:e,navigate:t,onRevealNative:o,onCount:a}){let[r,n]=_n.useState({kind:"empty"}),[l,i]=_n.useState(0),{toasts:s,push:u,dismiss:d}=er();_n.useEffect(()=>{let h=!1;async function y(){let g=await O0(),x=null;!h&&g&&(x=g.rows,g.rows.length>0&&(n({kind:"ready",rows:g.rows}),a?.(g.rows.length)));let p=u("Loading your reservations\u2026");try{let c=await WC(e.path);if(h)return;d(p),(!x||!M0(x,c))&&(c.length>0?n({kind:"ready",rows:c}):n({kind:"empty"}),a?.(c.length)),F0({rows:c})}catch(c){if(h)return;if(d(p),c instanceof Se&&c.sessionExpired){n({kind:"session-expired"});return}(!x||x.length===0)&&n({kind:"error",message:c.message||"could not load reservations"})}}return y(),()=>{h=!0}},[e.path,l]);let f=_n.useCallback(()=>{o()},[o]),m=r.kind==="ready"?r.rows.length:0;return(0,ie.jsxs)(ie.Fragment,{children:[(0,ie.jsxs)("div",{className:"lintel-canvas flex h-full min-h-0 w-full flex-col","data-testid":"lintel-support-booking",children:[(0,ie.jsxs)("div",{className:"lintel-screen-head",children:[(0,ie.jsxs)("div",{children:[(0,ie.jsx)("h1",{className:"lintel-screen-title",children:"Support Booking"}),(0,ie.jsx)("p",{className:"lintel-screen-sub","data-testid":"lintel-sb-count",children:r.kind==="ready"?`${m} reservation${m===1?"":"s"} on your account`:"Reservations you support for other staff."})]}),(0,ie.jsx)("div",{className:"lintel-screen-head-actions",children:(0,ie.jsx)(ee,{className:"h-control",onClick:()=>t($r),"data-testid":"lintel-sb-new",children:"New booking"})})]}),r.kind==="session-expired"&&(0,ie.jsxs)("div",{className:"flex flex-col items-start gap-3 text-sm","data-testid":"lintel-sb-session-expired",children:[(0,ie.jsx)("div",{className:"font-medium text-foreground",children:"Session expired"}),(0,ie.jsx)("p",{className:"text-muted-foreground",children:"Your SIT session has expired, so RBS returned its sign-in page instead of your reservations. Sign back in on the native page, then reload."}),(0,ie.jsxs)("div",{className:"flex gap-2",children:[(0,ie.jsx)(ee,{variant:"outline",onClick:()=>i(h=>h+1),"data-testid":"lintel-sb-reload",children:"Reload"}),(0,ie.jsx)(ee,{onClick:o,"data-testid":"lintel-sb-reveal",children:"Show the native page"})]})]}),r.kind==="error"&&(0,ie.jsxs)("div",{className:"flex flex-col items-start gap-3 text-sm","data-testid":"lintel-sb-error",children:[(0,ie.jsxs)("p",{className:"text-muted-foreground",children:["Lintel could not load your reservations (",r.message,")."]}),(0,ie.jsx)(ee,{variant:"outline",onClick:o,"data-testid":"lintel-sb-reveal",children:"Show the native page"})]}),r.kind==="empty"&&(0,ie.jsxs)("div",{className:"flex flex-col items-start gap-2 text-sm","data-testid":"lintel-sb-empty",children:[(0,ie.jsx)("div",{className:"font-medium text-foreground",children:"No reservations"}),(0,ie.jsx)("p",{className:"text-muted-foreground",children:"You have no Support Booking reservations. Start one from the board."})]}),r.kind==="ready"&&r.rows.length>0&&(0,ie.jsxs)("div",{className:"min-h-0 flex-1 overflow-auto",children:[(0,ie.jsxs)(Er,{className:"lintel-sb-table","data-testid":"lintel-sb-list",children:[(0,ie.jsx)(Ar,{children:(0,ie.jsxs)(pt,{children:[(0,ie.jsx)(Ho,{children:"Room"}),(0,ie.jsx)(Ho,{children:"Date"}),(0,ie.jsx)(Ho,{children:"Time"}),(0,ie.jsx)(Ho,{children:"Status"}),(0,ie.jsx)(Ho,{children:"Actions"})]})}),(0,ie.jsx)(Dr,{children:r.rows.map(h=>(0,ie.jsxs)(pt,{"data-testid":"lintel-sb-row","data-booking-id":h.id,children:[(0,ie.jsx)(Le,{className:"lintel-mono",children:h.room}),(0,ie.jsx)(Le,{className:"lintel-mono",children:h.date}),(0,ie.jsx)(Le,{className:"lintel-mono",children:h.time}),(0,ie.jsx)(Le,{children:(0,ie.jsx)(zs,{"data-testid":"lintel-sb-status",children:h.status})}),(0,ie.jsxs)(Le,{className:"whitespace-nowrap",children:[(0,ie.jsx)(ee,{size:"sm",variant:"outline",className:"mr-2",onClick:f,"data-testid":"lintel-sb-cancel",children:"Cancel"}),(0,ie.jsx)(ee,{size:"sm",variant:"outline",onClick:f,"data-testid":"lintel-sb-raise",children:"Raise support request"})]})]},h.id))})]}),(0,ie.jsx)("p",{className:"mt-3 text-[12px] text-muted-foreground","data-testid":"lintel-sb-note",children:"Lintel does not cancel or raise requests by itself. Both actions open the native Support Booking page so you complete them there."})]})]}),s.map(h=>(0,ie.jsx)(ya,{open:!0,onOpenChange:y=>{y||d(h.id)},children:(0,ie.jsxs)("div",{className:"flex flex-col gap-0.5",children:[(0,ie.jsx)(ba,{children:h.title}),h.description&&(0,ie.jsx)(Sa,{children:h.description})]})},h.id)),(0,ie.jsx)(wa,{})]})}function _0(e){return(0,ie.jsx)(Ja,{swipeDirection:"right",duration:6e3,children:(0,ie.jsx)($2,{...e})})}var ni=k(z());var tv="lintel-theme",H0="system";function G2(e){return e==="dark"||e==="light"||e==="system"}function q0(){return globalThis.chrome?.storage?.local}function U0(){let e=q0();return e?new Promise(t=>{let o=!1,a=r=>{if(o)return;o=!0;let n=r?r[tv]:void 0;t(G2(n)?n:H0)};try{let r=e.get(tv,n=>a(n));r&&typeof r.then=="function"&&r.then(a).catch(()=>a(void 0))}catch{a(void 0)}}):Promise.resolve(H0)}function z0(e){let t=q0();if(t)try{let o=t.set({[tv]:e});o&&typeof o.catch=="function"&&o.catch(()=>{})}catch{}}function j2(){try{let e=document.documentElement.getAttribute("data-bs-theme")??document.body?.getAttribute("data-bs-theme");return e==="dark"||e==="light"?e:null}catch{return null}}function V0(e,t=j2()){return e==="light"?"light":e==="dark"?"dark":t??"light"}function K2(){let e=document.getElementById("sit-lintel-host"),t=e&&e.shadowRoot;return(t?t.querySelector(".lintel-root"):null)??null}function ov(e,t){let o=t??K2();o&&o.setAttribute("data-theme",e)}var Wc=k(H());function W0(){let[e,t]=ni.useState("light");ni.useEffect(()=>{let r=!1;return U0().then(n=>{if(r)return;let l=V0(n);t(l),ov(l)}),()=>{r=!0}},[]);let o=ni.useCallback(()=>{let r=e==="dark"?"light":"dark";t(r),z0(r),ov(r)},[e]),a=e==="dark";return(0,Wc.jsx)("button",{type:"button",className:"lintel-theme-toggle",onClick:o,"aria-label":`Switch to ${a?"light":"dark"} theme`,title:`Switch to ${a?"light":"dark"} theme`,"data-testid":"lintel-theme-toggle","data-theme-effective":e,children:a?(0,Wc.jsx)(ps,{className:"h-4 w-4"}):(0,Wc.jsx)(hs,{className:"h-4 w-4"})})}var go=k(H());function $0({route:e,onRevealNative:t}){return(0,go.jsx)("div",{"data-testid":"lintel-unmapped","data-route-kind":e.kind,className:"flex h-full min-h-0 w-full flex-col items-center justify-center gap-4 p-8 text-center",children:(0,go.jsxs)("div",{className:"flex max-w-md flex-col items-center gap-3",children:[(0,go.jsx)("h1",{className:"lintel-screen-title","data-testid":"lintel-unmapped-title",children:e.title}),(0,go.jsx)("p",{className:"text-sm text-muted-foreground",children:"Lintel owns the whole RBS site, but it only has a data API for the room search board. This page is not mapped, so Lintel will not show you invented data."}),(0,go.jsxs)(Ot,{className:"w-full rounded-md border border-border bg-secondary p-3 text-left","data-testid":"lintel-unmapped-endpoint",children:[(0,go.jsx)("div",{className:"text-[12px] text-muted-foreground",children:"Current path"}),(0,go.jsx)("div",{className:"lintel-mono break-all [overflow-wrap:anywhere] text-[12px] text-foreground",children:e.path}),(0,go.jsx)("div",{className:"mt-2 text-[12px] text-muted-foreground",children:"Missing endpoint"}),(0,go.jsx)("div",{className:"lintel-mono break-all [overflow-wrap:anywhere] text-[12px] text-foreground",children:e.missingEndpoint??"not mapped"})]}),(0,go.jsx)(ee,{onClick:t,"data-testid":"lintel-unmapped-reveal",children:"Show the native page"}),(0,go.jsx)("p",{className:"text-[12px] text-muted-foreground",children:"This reveals the untouched RBS page for this URL. Nothing is hidden from you. If Lintel can't help, the real site is one click away."}),(0,go.jsx)("p",{className:"text-[12px] text-muted-foreground","data-testid":"lintel-build-stamp-full",children:mR()})]})})}var $c="lintel:uiMode",Vs="lintel";function G0(e){return e==="lintel"||e==="native"}function j0(){return globalThis.chrome?.storage?.local}function X2(){return globalThis.chrome?.storage?.onChanged}function K0(){let e=j0();return e?new Promise(t=>{let o=!1,a=r=>{if(o)return;o=!0;let n=r?r[$c]:void 0;t(G0(n)?n:Vs)};try{let r=e.get($c,n=>a(n));r&&typeof r.then=="function"&&r.then(a).catch(()=>a(void 0))}catch{a(void 0)}}):Promise.resolve(Vs)}function av(e){let t=j0();if(t)try{let o=t.set({[$c]:e});o&&typeof o.catch=="function"&&o.catch(()=>{})}catch{}}function X0(e){let t=X2();if(!t)return()=>{};let o=(a,r)=>{if(r!=="local")return;let n=a[$c];if(!n)return;let l=n.newValue;e(G0(l)?l:Vs)};try{t.addListener(o)}catch{return()=>{}}return()=>{try{t.removeListener(o)}catch{}}}var Ce=k(H()),Y0="sit-lintel-host";function Y2(){tr();let e=document.getElementById(Y0);e&&(e.style.display="none")}function Q2(){DC();let e=document.getElementById(Y0);e&&(e.style.display="")}function Z2({route:e,navigate:t,onLogout:o}){let[a,r]=vt.useState(!1),n=vt.useRef(null),l=vt.useRef({}),[i,s]=vt.useState(null),u=vt.useCallback(()=>{let d=n.current,f=l.current[e.kind];if(!d||!f){s(null);return}let m=f.offsetLeft,h=f.offsetWidth,y=f.offsetTop,g=f.offsetHeight;s(x=>x&&x.left===m&&x.width===h&&x.top===y&&x.height===g?x:{left:m,width:h,top:y,height:g})},[e.kind]);return vt.useLayoutEffect(()=>{u()},[u]),vt.useEffect(()=>{if(typeof ResizeObserver>"u")return;let d=n.current;if(!d)return;let f=new ResizeObserver(()=>u());return f.observe(d),()=>f.disconnect()},[u]),(0,Ce.jsxs)("header",{"data-testid":"lintel-shell",className:"lintel-canvas-x flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card",children:[(0,Ce.jsxs)("button",{type:"button","data-testid":"lintel-brand-home","aria-label":"Go to Dashboard (home)",onClick:()=>t(oc),className:"flex shrink-0 cursor-pointer items-center gap-2 rounded bg-transparent p-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",children:[(0,Ce.jsx)("span",{className:"rounded-[0.25rem] bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground",children:"L"}),(0,Ce.jsx)("span",{className:"text-sm font-semibold text-foreground",children:"Lintel"})]}),(0,Ce.jsx)("span",{className:"hidden shrink-0 whitespace-nowrap text-[13px] text-muted-foreground sm:inline","data-testid":"lintel-shell-building",children:"Unofficial booking tool"}),(0,Ce.jsxs)("nav",{ref:n,className:"relative ml-4 hidden h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex","data-testid":"lintel-nav","aria-label":"Primary",children:[i&&(0,Ce.jsx)("span",{"aria-hidden":!0,"data-testid":"lintel-nav-indicator",className:"lintel-nav-indicator",style:{left:i.left,width:i.width,top:i.top,height:i.height}}),Ag.map(d=>{let f=d.kind===e.kind;return(0,Ce.jsx)("button",{ref:m=>{l.current[d.kind]=m},type:"button","data-testid":`lintel-nav-${d.kind}`,"aria-current":f?"page":void 0,onClick:()=>t(d.path),className:K("relative z-10 h-full shrink-0 whitespace-nowrap px-3 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",f?"text-foreground":"text-muted-foreground hover:text-foreground"),children:d.label},d.kind)})]}),(0,Ce.jsxs)("div",{className:"ml-auto flex items-center gap-2 md:ml-0",children:[(0,Ce.jsx)(W0,{}),(0,Ce.jsx)(ee,{variant:"ghost",className:"hidden h-control shrink-0 md:inline-flex",onClick:o,"data-testid":"lintel-logout-btn",title:"Sign out of RBS",children:"Logout"}),(0,Ce.jsx)(ee,{variant:"ghost",size:"icon",className:"shrink-0 md:hidden","data-testid":"lintel-nav-menu-btn","aria-label":"Menu","aria-expanded":a,onClick:()=>r(!0),children:(0,Ce.jsx)(cs,{className:"h-5 w-5"})})]}),(0,Ce.jsx)(Ca,{open:a,onOpenChange:r,children:(0,Ce.jsxs)(ta,{className:"lintel-nav-sheet inset-y-0 left-0 right-auto top-0 h-[100dvh] min-h-[100dvh] w-[min(84vw,320px)] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l-0 border-r p-4 pb-[calc(16px+var(--lintel-safe-bottom))]",children:[(0,Ce.jsx)(La,{className:"sr-only",children:"Menu"}),(0,Ce.jsxs)("nav",{className:"mt-6 flex flex-col gap-1","data-testid":"lintel-nav-sheet","aria-label":"Primary",children:[Ag.map(d=>{let f=d.kind===e.kind;return(0,Ce.jsx)("button",{type:"button","data-testid":`lintel-nav-${d.kind}`,"aria-current":f?"page":void 0,onClick:()=>{t(d.path),r(!1)},className:K("flex min-h-[44px] w-full items-center whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",f?"lintel-nav-active":"text-muted-foreground hover:bg-accent hover:text-foreground"),children:d.label},d.kind)}),(0,Ce.jsx)("button",{type:"button","data-testid":"lintel-logout-btn",onClick:()=>{r(!1),o()},className:"mt-1 flex min-h-[44px] w-full items-center whitespace-nowrap rounded-md px-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",children:"Logout"})]})]})})]})}function Q0(){let{route:e,navigate:t}=ZC(),[o,a]=vt.useState(Vs);vt.useEffect(()=>{hR()},[]),vt.useEffect(()=>{let l=!1;return K0().then(i=>{l||a(i)}),()=>{l=!0}},[]),vt.useEffect(()=>X0(i=>a(i)),[]),vt.useEffect(()=>()=>tr(),[]),vt.useEffect(()=>{o==="native"?Y2():Q2()},[e.href,o]);let r=vt.useCallback(()=>{av("native"),a("native"),NC()},[]),n=vt.useCallback(()=>{av("native"),a("native")},[]);return vt.useEffect(()=>{function l(i){zc(i)||i.key.toLowerCase()==="d"&&(i.preventDefault(),n())}return window.addEventListener("keydown",l),()=>window.removeEventListener("keydown",l)},[n]),(0,Ce.jsxs)("div",{className:"flex h-[100dvh] min-h-0 w-full flex-col",children:[(0,Ce.jsx)(Z2,{route:e,navigate:t,onLogout:r}),(0,Ce.jsx)("div",{className:"min-h-0 flex-1 overflow-hidden","data-testid":"lintel-body",children:(0,Ce.jsx)("div",{className:"lintel-view-enter h-full min-h-0",children:e.kind==="search"?(0,Ce.jsx)(N0,{onRevealNative:n},e.href):e.kind==="dashboard"?(0,Ce.jsx)(UI,{route:e,navigate:t,onRevealNative:n}):e.kind==="support-booking"?(0,Ce.jsx)(_0,{route:e,navigate:t,onRevealNative:n}):e.kind==="help"?(0,Ce.jsx)($R,{route:e,onRevealNative:n}):e.kind==="my-credit"?(0,Ce.jsx)(KR,{route:e,onRevealNative:n}):(0,Ce.jsx)($0,{route:e,onRevealNative:n})},e.href)}),(0,Ce.jsxs)("footer",{className:"lintel-canvas-x flex shrink-0 flex-wrap gap-x-5 gap-y-0.5 border-t border-border bg-card py-1.5 text-[12px] leading-snug text-muted-foreground","data-testid":"lintel-shell-footer",children:[(0,Ce.jsx)("span",{"data-testid":"lintel-shell-disclaimer",children:"Unofficial \xB7 not affiliated with SIT"}),(0,Ce.jsx)("span",{"data-testid":"lintel-shell-privacy",children:"Runs entirely in your own RBS session; reads booking data (incl. other users\u2019 names, as RBS shows them); nothing leaves your browser."}),(0,Ce.jsx)("span",{"data-testid":"lintel-copyright",className:"md:ml-auto",children:gR})]})]})}var Z0=k(z());var J0=k(H()),J2="sit-lintel-host";function eB(e=document){tr();let t=e.getElementById(J2);t&&(t.style.display="none")}var Gc=class extends Z0.Component{constructor(){super(...arguments);this.state={caught:!1}}static getDerivedStateFromError(){return{caught:!0}}componentDidCatch(o){eB(),console.error("[rbs-lintel] App crashed; restored the native RBS page",o)}render(){return this.state.caught?(0,J0.jsx)("div",{className:"p-4 text-sm text-muted-foreground",children:"Lintel hit an error and restored the original RBS site."}):this.props.children}};var eT='*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }/*! tailwindcss v3.4.17 | MIT License | https://tailwindcss.com*/*,:after,:before{box-sizing:border-box;border:0 solid #e5e7eb}:after,:before{--tw-content:""}:host,html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:var(--rbs-font);font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:var(--rbs-font-mono);font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]:where(:not([hidden=until-found])){display:none}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}.pointer-events-none{pointer-events:none}.visible{visibility:visible}.collapse{visibility:collapse}.static{position:static}.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.sticky{position:sticky}.inset-0{inset:0}.inset-x-0{left:0;right:0}.inset-y-0{top:0;bottom:0}.bottom-0{bottom:0}.bottom-4{bottom:1rem}.left-0{left:0}.left-1\\/2{left:50%}.right-2{right:.5rem}.right-3{right:.75rem}.right-4{right:1rem}.right-auto{right:auto}.start-1{inset-inline-start:.25rem}.top-0{top:0}.top-1\\/2{top:50%}.top-3{top:.75rem}.top-auto{top:auto}.z-10{z-index:10}.z-40{z-index:40}.z-50{z-index:50}.z-\\[60\\]{z-index:60}.m-0{margin:0}.-mx-1{margin-left:-.25rem;margin-right:-.25rem}.my-1{margin-top:.25rem}.mb-1,.my-1{margin-bottom:.25rem}.mb-2\\.5{margin-bottom:.625rem}.mb-3{margin-bottom:.75rem}.ml-0\\.5{margin-left:.125rem}.ml-2{margin-left:.5rem}.ml-4{margin-left:1rem}.ml-auto{margin-left:auto}.mr-2{margin-right:.5rem}.mt-0\\.5{margin-top:.125rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}.mt-6{margin-top:1.5rem}.mt-auto{margin-top:auto}.block{display:block}.inline{display:inline}.flex{display:flex}.inline-flex{display:inline-flex}.\\!table{display:table!important}.table{display:table}.grid{display:grid}.contents{display:contents}.hidden{display:none}.h-11{height:2.75rem}.h-14{height:3.5rem}.h-2{height:.5rem}.h-3{height:.75rem}.h-3\\.5{height:.875rem}.h-4{height:1rem}.h-5{height:1.25rem}.h-6{height:1.5rem}.h-7{height:1.75rem}.h-\\[100dvh\\]{height:100dvh}.h-\\[var\\(--radix-select-trigger-height\\)\\]{height:var(--radix-select-trigger-height)}.h-control{height:var(--rbs-control-height)}.h-full{height:100%}.h-px{height:1px}.max-h-96{max-height:24rem}.max-h-\\[220px\\]{max-height:220px}.max-h-\\[85dvh\\]{max-height:85dvh}.min-h-0{min-height:0}.min-h-\\[100dvh\\]{min-height:100dvh}.min-h-\\[44px\\]{min-height:44px}.w-1\\/2{width:50%}.w-1\\/3{width:33.333333%}.w-11{width:2.75rem}.w-2{width:.5rem}.w-2\\/3{width:66.666667%}.w-20{width:5rem}.w-3\\.5{width:.875rem}.w-3\\/4{width:75%}.w-4{width:1rem}.w-5{width:1.25rem}.w-6{width:1.5rem}.w-72{width:18rem}.w-80{width:20rem}.w-9{width:2.25rem}.w-\\[160px\\]{width:160px}.w-\\[calc\\(100\\%-2rem\\)\\]{width:calc(100% - 2rem)}.w-\\[min\\(84vw\\2c 320px\\)\\]{width:min(84vw,320px)}.w-auto{width:auto}.w-full{width:100%}.w-px{width:1px}.min-w-0{min-width:0}.min-w-\\[180px\\]{min-width:180px}.min-w-\\[64px\\]{min-width:64px}.min-w-\\[8rem\\]{min-width:8rem}.min-w-\\[var\\(--radix-select-trigger-width\\)\\]{min-width:var(--radix-select-trigger-width)}.max-w-\\[1400px\\]{max-width:1400px}.max-w-\\[min\\(20rem\\2c calc\\(100vw-1\\.5rem\\)\\)\\]{max-width:min(20rem,calc(100vw - 1.5rem))}.max-w-lg{max-width:32rem}.max-w-md{max-width:28rem}.max-w-none{max-width:none}.flex-1{flex:1 1 0%}.shrink-0{flex-shrink:0}.basis-full{flex-basis:100%}.-translate-x-1\\/2{--tw-translate-x:-50%}.-translate-x-1\\/2,.-translate-y-1\\/2{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.-translate-y-1\\/2{--tw-translate-y:-50%}.translate-x-0{--tw-translate-x:0px}.translate-x-0,.translate-y-0{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.translate-y-0{--tw-translate-y:0px}.rotate-180{--tw-rotate:180deg}.rotate-180,.transform{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}@keyframes pulse{50%{opacity:.5}}.animate-pulse{animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite}@keyframes spin{to{transform:rotate(1turn)}}.animate-spin{animation:spin 1s linear infinite}.cursor-default{cursor:default}.cursor-pointer{cursor:pointer}.touch-none{touch-action:none}.select-none{-webkit-user-select:none;-moz-user-select:none;user-select:none}.list-none{list-style-type:none}.grid-cols-\\[auto_1fr\\]{grid-template-columns:auto 1fr}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.flex-nowrap{flex-wrap:nowrap}.items-start{align-items:flex-start}.items-end{align-items:flex-end}.items-center{align-items:center}.items-baseline{align-items:baseline}.justify-end{justify-content:flex-end}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.gap-0\\.5{gap:.125rem}.gap-1{gap:.25rem}.gap-1\\.5{gap:.375rem}.gap-2{gap:.5rem}.gap-2\\.5{gap:.625rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.gap-5{gap:1.25rem}.gap-x-3{-moz-column-gap:.75rem;column-gap:.75rem}.gap-x-4{-moz-column-gap:1rem;column-gap:1rem}.gap-x-5{-moz-column-gap:1.25rem;column-gap:1.25rem}.gap-y-0\\.5{row-gap:.125rem}.gap-y-1{row-gap:.25rem}.gap-y-2{row-gap:.5rem}.self-start{align-self:flex-start}.overflow-auto{overflow:auto}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.truncate{overflow:hidden;text-overflow:ellipsis}.truncate,.whitespace-nowrap{white-space:nowrap}.break-all{word-break:break-all}.rounded{border-radius:0}.rounded-\\[0\\.25rem\\]{border-radius:.25rem}.rounded-\\[inherit\\]{border-radius:inherit}.rounded-full,.rounded-md,.rounded-none,.rounded-sm{border-radius:0}.rounded-b-none{border-bottom-right-radius:0;border-bottom-left-radius:0}.rounded-t-xl{border-top-left-radius:0;border-top-right-radius:0}.border{border-width:1px}.border-b{border-bottom-width:1px}.border-b-2{border-bottom-width:2px}.border-l{border-left-width:1px}.border-l-0{border-left-width:0}.border-r{border-right-width:1px}.border-t{border-top-width:1px}.border-border{border-color:hsl(var(--border))}.border-destructive\\/50{border-color:hsl(var(--destructive)/.5)}.border-destructive\\/60{border-color:hsl(var(--destructive)/.6)}.border-foreground{border-color:hsl(var(--foreground))}.border-transparent{border-color:transparent}.border-l-transparent{border-left-color:transparent}.border-t-transparent{border-top-color:transparent}.bg-\\[rgba\\(35\\2c 31\\2c 32\\2c 0\\.55\\)\\]{background-color:rgba(35,31,32,.55)}.bg-border{background-color:hsl(var(--border))}.bg-card{background-color:hsl(var(--card))}.bg-destructive{background-color:hsl(var(--destructive))}.bg-destructive\\/15{background-color:hsl(var(--destructive)/.15)}.bg-foreground{background-color:hsl(var(--foreground))}.bg-muted{background-color:hsl(var(--muted))}.bg-popover{background-color:hsl(var(--popover))}.bg-primary{background-color:hsl(var(--primary))}.bg-secondary{background-color:hsl(var(--secondary))}.bg-transparent{background-color:transparent}.p-0{padding:0}.p-0\\.5{padding:.125rem}.p-1{padding:.25rem}.p-2{padding:.5rem}.p-3{padding:.75rem}.p-4{padding:1rem}.p-6{padding:1.5rem}.p-8{padding:2rem}.p-\\[1px\\]{padding:1px}.px-1{padding-left:.25rem;padding-right:.25rem}.px-1\\.5{padding-left:.375rem;padding-right:.375rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-2\\.5{padding-left:.625rem;padding-right:.625rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-3\\.5{padding-left:.875rem;padding-right:.875rem}.py-0\\.5{padding-top:.125rem;padding-bottom:.125rem}.py-1{padding-top:.25rem;padding-bottom:.25rem}.py-1\\.5{padding-top:.375rem;padding-bottom:.375rem}.py-\\[7px\\]{padding-top:7px;padding-bottom:7px}.pb-2{padding-bottom:.5rem}.pb-3{padding-bottom:.75rem}.pb-\\[calc\\(16px\\+var\\(--lintel-safe-bottom\\)\\)\\]{padding-bottom:calc(16px + var(--lintel-safe-bottom))}.pl-2{padding-left:.5rem}.pr-2{padding-right:.5rem}.pr-7{padding-right:1.75rem}.pt-1\\.5{padding-top:.375rem}.pt-5{padding-top:1.25rem}.text-left{text-align:left}.text-center{text-align:center}.text-right{text-align:right}.text-\\[11px\\]{font-size:11px}.text-\\[12px\\]{font-size:12px}.text-\\[13px\\]{font-size:13px}.text-\\[14px\\]{font-size:14px}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xs{font-size:.75rem;line-height:1rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-normal{font-weight:400}.font-semibold{font-weight:600}.uppercase{text-transform:uppercase}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)}.leading-none{line-height:1}.leading-snug{line-height:1.375}.leading-tight{line-height:1.25}.text-background{color:hsl(var(--background))}.text-destructive{color:hsl(var(--destructive))}.text-destructive-foreground{color:hsl(var(--destructive-foreground))}.text-foreground{color:hsl(var(--foreground))}.text-muted-foreground{color:hsl(var(--muted-foreground))}.text-popover-foreground{color:hsl(var(--popover-foreground))}.text-primary-foreground{color:hsl(var(--primary-foreground))}.text-secondary-foreground{color:hsl(var(--secondary-foreground))}.underline{text-decoration-line:underline}.opacity-0{opacity:0}.opacity-60{opacity:.6}.opacity-70{opacity:.7}.shadow{--tw-shadow:0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color)}.shadow,.shadow-lg{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 28px rgba(35,31,32,.24);--tw-shadow-colored:0 10px 28px var(--tw-shadow-color)}.shadow-md{--tw-shadow:0 6px 18px rgba(35,31,32,.16);--tw-shadow-colored:0 6px 18px var(--tw-shadow-color)}.shadow-md,.shadow-sm{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000}.outline-none{outline:2px solid transparent;outline-offset:2px}.outline{outline-style:solid}.ring{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color)}.ring,.ring-0{box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.ring-0{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(var(--tw-ring-offset-width)) var(--tw-ring-color)}.blur{--tw-blur:blur(8px)}.blur,.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-opacity{transition-property:opacity;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-transform{transition-property:transform;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.\\[overflow-wrap\\:anywhere\\]{overflow-wrap:anywhere}.\\[scrollbar-width\\:none\\]{scrollbar-width:none}.lintel-root{--rbs-font:"Lintel Sans",-apple-system,"Segoe UI",system-ui,sans-serif;--rbs-font-mono:"Lintel Mono",ui-monospace,"SF Mono",Monaco,"Cascadia Mono",monospace;--rbs-control-height:34px;--rbs-touch-height:44px;--lintel-slot-w:48px;--lintel-safe-top:env(safe-area-inset-top,0px);--lintel-safe-left:env(safe-area-inset-left,0px);--lintel-safe-right:env(safe-area-inset-right,0px);--radius:0;--rbs-page:#f6f6f4;--rbs-surface:#fcfcfa;--rbs-surface2:#eeedea;--rbs-border-hex:#dbdad5;--rbs-accent-hex:#da1a21;--rbs-text:#231f20;--rbs-muted:#5a5653;--rbs-faint:#6b6764;--rbs-rule:rgba(35,31,32,.09);--background:60 10% 96%;--foreground:345 6% 13%;--card:60 25% 98%;--card-foreground:345 6% 13%;--popover:60 25% 98%;--popover-foreground:345 6% 13%;--primary:358 79% 48%;--primary-foreground:60 25% 98%;--primary-hover:358 81% 42%;--primary-active:358 82% 36%;--lintel-accent-soft:0 71% 95%;--lintel-accent-ink:358 81% 38%;--lintel-accent-border:358 61% 82%;--secondary:45 11% 93%;--secondary-foreground:345 6% 13%;--muted:45 11% 93%;--muted-foreground:26 4% 34%;--accent:48 9% 89%;--accent-foreground:345 6% 13%;--destructive:358 79% 48%;--destructive-foreground:60 25% 98%;--border:50 8% 85%;--input:50 8% 85%;--ring:345 6% 13%;--lintel-free:#fcfcfa;--lintel-free-fg:#231f20;--lintel-booked:#55697e;--lintel-booked-border:transparent;--lintel-booked-fg:#fff;--lintel-header:#e8e7e2;--lintel-closed:#e2e1dc;--lintel-closed-fg:#5a5653;--lintel-closed-line:rgba(35,31,32,.16);--lintel-unknown:#eeedea;--lintel-hour-border:#bdbbb5;--lintel-grid-line:rgba(35,31,32,.07);--lintel-hover:rgba(218,26,33,.1);--lintel-sel:#da1a21;--lintel-skeleton-shine:rgba(35,31,32,.06)}.lintel-root,.lintel-root[data-theme=light]{color-scheme:light}.lintel-root[data-theme=dark]{--rbs-page:#161517;--rbs-surface:#1e1c1e;--rbs-surface2:#2a282a;--rbs-border-hex:#3a373a;--rbs-accent-hex:#da1a21;--rbs-text:#f4f3f1;--rbs-muted:#bab6b1;--rbs-faint:#a09c97;--rbs-rule:hsla(40,12%,95%,.09);--background:270 5% 9%;--foreground:40 12% 95%;--card:300 3% 11%;--card-foreground:40 12% 95%;--popover:300 3% 11%;--popover-foreground:40 12% 95%;--primary:358 79% 48%;--primary-foreground:60 25% 98%;--primary-hover:358 81% 42%;--primary-active:358 82% 36%;--lintel-accent-soft:356 35% 17%;--lintel-accent-ink:359 100% 80%;--lintel-accent-border:358 49% 32%;--secondary:300 2% 16%;--secondary-foreground:40 12% 95%;--muted:300 2% 16%;--muted-foreground:33 6% 71%;--accent:300 3% 20%;--accent-foreground:40 12% 95%;--destructive:358 79% 48%;--destructive-foreground:60 25% 98%;--border:300 3% 22%;--input:300 3% 22%;--ring:40 12% 95%;color-scheme:dark;--lintel-free:#1e1c1e;--lintel-free-fg:#f4f3f1;--lintel-booked:#5b6f85;--lintel-booked-border:transparent;--lintel-booked-fg:#f4f3f1;--lintel-header:#353235;--lintel-closed:#2f2c2f;--lintel-closed-fg:#bab6b1;--lintel-closed-line:hsla(40,12%,95%,.16);--lintel-unknown:#2a282a;--lintel-hour-border:#4b474b;--lintel-grid-line:hsla(40,12%,95%,.07);--lintel-hover:rgba(255,154,156,.14);--lintel-sel:#da1a21;--lintel-skeleton-shine:hsla(40,12%,95%,.07)}.lintel-root{--lintel-gutter:24px;--lintel-dur-fast:150ms;--lintel-dur:200ms;--lintel-ease:cubic-bezier(0.16,1,0.3,1);--lintel-ease-inout:cubic-bezier(0.4,0,0.2,1);--lintel-safe-bottom:env(safe-area-inset-bottom,0px);background:var(--rbs-page);color:hsl(var(--foreground));font-family:var(--rbs-font);font-size:14px;line-height:1.45;font-feature-settings:"ss01","cv11";-webkit-font-smoothing:antialiased}@media (max-width:640px){.lintel-root{--lintel-gutter:16px}}.lintel-canvas{padding-top:24px;padding-bottom:24px}.lintel-canvas,.lintel-canvas-x{padding-left:var(--lintel-gutter);padding-right:var(--lintel-gutter)}.lintel-screen-title{font-size:30px;font-weight:600;line-height:1.1;letter-spacing:-.03em;color:hsl(var(--foreground));margin:0}.lintel-screen-sub{font-size:14px;line-height:1.45;color:var(--rbs-muted);margin:6px 0 0}.lintel-screen-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px 16px;margin-bottom:24px}.lintel-screen-head .lintel-screen-head-actions{margin-left:auto;display:flex;align-items:center;gap:10px}.lintel-mono{font-family:var(--rbs-font-mono);font-variant-numeric:tabular-nums}.lintel-root{--lintel-row-h:36px;--lintel-header-h:36px;--lintel-roomcol-w:296px}.lintel-topbar{padding-left:var(--lintel-gutter);padding-right:var(--lintel-gutter)}.lintel-topbar-title{font-size:30px;font-weight:600;line-height:1.1;letter-spacing:-.03em;color:hsl(var(--foreground));margin:0}.lintel-segmented{height:var(--rbs-control-height)}.lintel-segmented-btn{cursor:pointer;background:transparent;color:hsl(var(--foreground))}.lintel-segmented-btn--active{background:hsl(var(--foreground));color:hsl(var(--background))}.lintel-control{height:var(--rbs-control-height)}@media (max-width:767px){.lintel-control{height:auto;min-height:var(--rbs-touch-height)}}.lintel-date-picker-trigger{min-width:56px}.lintel-date-pill{min-width:84px}.lintel-calendar{width:15rem;-webkit-user-select:none;-moz-user-select:none;user-select:none;color:hsl(var(--popover-foreground))}.lintel-calendar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem}.lintel-calendar-title{font-size:13px;font-weight:600;color:hsl(var(--foreground))}.lintel-calendar-nav{display:inline-flex;height:28px;width:28px;align-items:center;justify-content:center;border:1px solid hsl(var(--border));border-radius:0;background:hsl(var(--secondary));color:hsl(var(--foreground));cursor:pointer}.lintel-calendar-nav:hover{background:hsl(var(--accent))}.lintel-calendar-nav:focus-visible{outline:none;box-shadow:0 0 0 1px hsl(var(--ring))}.lintel-calendar-grid,.lintel-calendar-weekdays{display:grid;grid-template-columns:repeat(7,1fr)}.lintel-calendar-weekday{display:flex;align-items:center;justify-content:center;height:1.75rem;font-size:12px;font-weight:500;color:hsl(var(--muted-foreground))}.lintel-calendar-grid{gap:2px}.lintel-calendar-day{display:flex;align-items:center;justify-content:center;height:2rem;width:2rem;margin:0 auto;border:0;border-radius:0;background:transparent;color:hsl(var(--foreground));font-size:12px;cursor:pointer}.lintel-calendar-day:hover{background:hsl(var(--accent));color:hsl(var(--accent-foreground))}.lintel-calendar-day:focus-visible{outline:none;box-shadow:0 0 0 1px hsl(var(--ring))}.lintel-calendar-day--outside{color:hsl(var(--muted-foreground));opacity:.55}.lintel-calendar-day--disabled{color:hsl(var(--muted-foreground));opacity:.35;cursor:not-allowed;pointer-events:none}.lintel-calendar-day--selected,.lintel-calendar-day--selected:hover{background:hsl(var(--foreground));color:hsl(var(--background));font-weight:600}.lintel-theme-toggle{display:inline-flex;height:var(--rbs-control-height);width:var(--rbs-control-height);align-items:center;justify-content:center;border:1px solid hsl(var(--border));border-radius:0;color:hsl(var(--muted-foreground));background:hsl(var(--card));cursor:pointer}.lintel-theme-toggle:hover{color:hsl(var(--foreground));background:hsl(var(--accent))}.lintel-theme-toggle:focus-visible{outline:1px solid hsl(var(--ring));outline-offset:-1px}.lintel-nav-active{color:hsl(var(--foreground));box-shadow:inset 3px 0 0 hsl(var(--primary))}.lintel-nav-indicator{position:absolute;border-radius:0;box-shadow:inset 0 -2px 0 hsl(var(--primary));pointer-events:none;z-index:0;transition:left var(--lintel-dur-fast) var(--lintel-ease),width var(--lintel-dur-fast) var(--lintel-ease),top var(--lintel-dur-fast) var(--lintel-ease),height var(--lintel-dur-fast) var(--lintel-ease)}.lintel-board-scroll{position:relative;overflow:auto;margin-left:var(--lintel-gutter);margin-right:var(--lintel-gutter)}.lintel-board-scrollwrap{position:relative}.lintel-board-scroll{height:100%}.lintel-board-canvas{position:relative;min-width:-moz-max-content;min-width:max-content}.lintel-board-scrollhint{display:block;position:absolute;top:0;right:0;bottom:0;width:24px;pointer-events:none;background:linear-gradient(to right,transparent,var(--rbs-surface));opacity:1;transition:opacity var(--lintel-dur) var(--lintel-ease)}.lintel-board-scroll[data-scrolled-end]~.lintel-board-scrollhint{opacity:0}@media (max-width:767px){.lintel-root{--lintel-slot-w:44px;--lintel-roomcol-w:204px;--lintel-row-h:44px;--lintel-header-h:44px}}.lintel-board-scroll .lintel-header-roomcell,.lintel-board-scroll .lintel-roomcol{padding-left:8px}.lintel-header{position:sticky;top:0;z-index:23;box-shadow:0 2px 0 var(--rbs-text)}.lintel-header-roomcell,.lintel-roomcol{position:sticky;left:0;z-index:22}.lintel-header-roomcell{z-index:32;background:var(--lintel-header);padding-left:var(--lintel-gutter);padding-right:8px}.lintel-cell{height:var(--lintel-row-h);min-width:0;border-top:1px solid var(--lintel-grid-line);border-bottom:1px solid var(--lintel-grid-line);border-right:1px solid var(--lintel-grid-line);box-sizing:border-box;cursor:pointer;transition:box-shadow var(--lintel-dur-fast) var(--lintel-ease);position:relative;outline:none}.lintel-cell--hour{border-right-width:2px;border-right-color:var(--lintel-hour-border)}.lintel-header-cell{border-right:1px solid var(--rbs-border-hex);padding-inline:2px}.lintel-header-cell,.lintel-header-cell--half,.lintel-header-cell--hour{background:var(--lintel-header)}.lintel-header-cell--blockend{border-right-width:2px;border-right-color:var(--lintel-hour-border)}.lintel-header-cell--hour{color:var(--rbs-text);font-size:12px;font-weight:600}.lintel-header-cell--half{color:var(--rbs-faint);font-size:12px;font-weight:400}.lintel-cell--free{background:var(--lintel-free)}.lintel-cell--booked{background-color:var(--lintel-free);background-image:none}.lintel-cell--booked:before{content:"";position:absolute;inset:3px 1px;border-radius:0;background:var(--lintel-booked);box-sizing:border-box;pointer-events:none}.lintel-booker-block-name{position:relative;z-index:1;color:var(--lintel-booked-fg);font-weight:500}.lintel-booker-block{isolation:isolate}.lintel-block-grid{position:absolute;inset:0;z-index:-1;display:grid;grid-auto-flow:column;grid-auto-columns:var(--lintel-slot-w);overflow:hidden;pointer-events:none}.lintel-block-grid>span{box-sizing:border-box;border-right:1px solid var(--lintel-grid-line)}.lintel-block-grid>.lintel-block-grid-hour{border-right-width:2px;border-right-color:var(--lintel-hour-border)}.lintel-cell--closed{background-color:var(--lintel-closed);background-image:repeating-linear-gradient(-45deg,var(--lintel-closed-line) 0,var(--lintel-closed-line) 1px,transparent 1px,transparent 7px);cursor:not-allowed}.lintel-cell--unknown{background:var(--lintel-unknown)}.lintel-cell--outside{opacity:.4}.lintel-cell--past{box-shadow:inset 0 0 0 9999px var(--rbs-surface2);cursor:default}.lintel-cell--free:not(.lintel-cell--past):hover,.lintel-cell--unknown:hover{box-shadow:inset 0 0 0 9999px var(--lintel-hover)}.lintel-cell--booked{cursor:default}.lintel-cell--info{cursor:pointer}.lintel-cell:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:-2px;z-index:5}.lintel-cell--sel{box-shadow:inset 0 0 0 9999px var(--lintel-sel);z-index:4}.lintel-cell-tick{position:absolute;top:50%;left:50%;width:14px;height:14px;transform:translate(-50%,-50%);color:hsl(var(--primary-foreground));pointer-events:none}.lintel-cell--sel:hover{box-shadow:inset 0 0 0 9999px hsl(var(--primary-hover))}.lintel-cell--skeleton{background:linear-gradient(90deg,hsl(var(--muted)) 25%,var(--lintel-skeleton-shine) 37%,hsl(var(--muted)) 63%);background-size:400% 100%;animation:lintel-shimmer 1.4s ease infinite;cursor:default}@keyframes lintel-shimmer{0%{background-position:100% 0}to{background-position:-100% 0}}@media (prefers-reduced-motion:reduce){.lintel-cell--skeleton{animation:none}}.lintel-row{background:var(--rbs-surface);margin-top:-1px}.lintel-row:first-child{margin-top:0}.lintel-roomcol{height:var(--lintel-row-h);display:flex;align-items:center;gap:8px;padding:0 8px 0 var(--lintel-gutter);border-right:1px solid var(--rbs-border-hex);box-sizing:border-box;overflow:hidden;white-space:nowrap;background:var(--rbs-surface)}.lintel-roomcol--cursor{background:hsl(var(--accent))}.lintel-room-code{flex:0 1 auto;min-width:0;font-size:13px}.lintel-room-type{flex:1 1 0;min-width:0}@media (max-width:767px){.lintel-room-type{display:none}}.lintel-cap{margin-left:auto;text-align:right;min-width:2ch;color:hsl(var(--foreground))}.lintel-legend-sw{display:inline-block;width:14px;height:14px;border-radius:0;border:1px solid var(--rbs-border-hex);vertical-align:-2px}.lintel-legend-sw--free{background:var(--lintel-free)}.lintel-legend-sw--booked{background:var(--lintel-booked);border-color:var(--lintel-booked)}.lintel-legend-sw--closed{background-color:var(--lintel-closed);background-image:repeating-linear-gradient(-45deg,var(--lintel-closed-line) 0,var(--lintel-closed-line) 1px,transparent 1px,transparent 7px)}.lintel-root :focus-visible{outline-color:hsl(var(--ring))}.lintel-thumb{display:inline-flex;flex:0 0 auto;width:20px;height:20px;align-items:center;justify-content:center;border-radius:0;overflow:hidden;cursor:zoom-in;outline:none}.lintel-thumb[data-has-photo="0"]{cursor:default}.lintel-thumb-img{-o-object-fit:cover;object-fit:cover;display:block;image-rendering:auto}.lintel-thumb-img,.lintel-thumb-placeholder{width:20px;height:20px;border-radius:0;border:1px solid var(--rbs-border-hex)}.lintel-thumb-placeholder{display:flex;align-items:center;justify-content:center;background:var(--rbs-surface2);color:var(--rbs-muted)}.lintel-thumb-placeholder-glyph{width:16px;height:16px;display:block}.lintel-thumb-preview-glyph{display:block;width:100%;height:auto;aspect-ratio:1/1;border-radius:0;background:var(--rbs-surface2);color:var(--rbs-muted)}.lintel-thumb:focus-visible .lintel-thumb-img{outline:2px solid hsl(var(--ring));outline-offset:1px}.lintel-thumb-preview{position:fixed;z-index:2147483000;padding:4px;border-radius:0;border:1px solid var(--rbs-border-hex);background:var(--rbs-surface);box-shadow:0 10px 28px rgba(35,31,32,.24);pointer-events:none;animation:lintel-thumb-fade .12s ease-out}.lintel-thumb-preview-img{display:block;width:100%;height:auto;border-radius:0}@keyframes lintel-thumb-fade{0%{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.lintel-thumb-preview{animation:none}}.lintel-prose{color:var(--rbs-text);font-size:15px;line-height:1.6}.lintel-static-panel{border-top:2px solid var(--rbs-text);padding:14px 0 0}.lintel-static-panel>:first-child{margin-top:0}.lintel-static-panel>:last-child{margin-bottom:0}.lintel-help-brief{margin-bottom:16px}.lintel-help-guide-cta{margin-top:14px}.lintel-prose h1{font-size:22px;font-weight:700;margin:0 0 12px;letter-spacing:-.2px}.lintel-prose h2{font-size:18px;font-weight:600;margin:24px 0 8px}.lintel-prose h3{font-size:15px;font-weight:600;margin:18px 0 4px}.lintel-prose ol,.lintel-prose p,.lintel-prose ul{margin:10px 0;color:var(--rbs-text)}.lintel-prose ol,.lintel-prose ul{padding-left:24px}.lintel-prose ul{list-style:disc}.lintel-prose ol{list-style:decimal}.lintel-prose li{margin:6px 0}.lintel-prose code{font-family:var(--lintel-mono,ui-monospace,monospace);background:var(--rbs-surface2,#0f1115);border:1px solid var(--rbs-border-hex);border-radius:0;padding:.5px 5px}.lintel-prose .faq-item{margin:14px 0}.lintel-link{text-decoration:none;border-bottom:1px solid transparent}.lintel-link,.lintel-link:hover{color:hsl(var(--lintel-accent-ink))}.lintel-link:hover{border-bottom-color:currentColor}.lintel-root[data-theme=light] .lintel-link:hover{color:hsl(var(--primary-hover))}.lintel-prose a{color:hsl(var(--lintel-accent-ink))}.lintel-faq-item{border-bottom:1px solid var(--rbs-border-hex);overflow:hidden}.lintel-faq-header{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;background:transparent;color:var(--rbs-text);font-size:15px;font-weight:500;text-align:left;cursor:pointer;border:none}.lintel-faq-header:hover{color:hsl(var(--lintel-accent-ink))}.lintel-faq-q{flex:1 1 auto}.lintel-faq-chevron{flex:0 0 auto;width:18px;text-align:center;color:var(--rbs-muted);font-weight:700}.lintel-faq-body-inner{padding:0 0 16px;color:var(--rbs-text);font-size:14px;line-height:1.6;max-width:68ch}.lintel-faq-body-inner ol,.lintel-faq-body-inner ul{margin:4px 0;padding-left:1.25em;list-style-position:outside}.lintel-faq-body-inner ul{list-style-type:disc}.lintel-faq-body-inner ol{list-style-type:decimal}.lintel-faq-body-inner li{margin:4px 0;padding-left:.15em}.lintel-faq-body-inner>p:first-child{margin-top:0}.lintel-faq-body-inner>p:last-child{margin-bottom:0}.lintel-faq-body{overflow:hidden;box-sizing:border-box;min-height:0}.lintel-faq-body[data-state=open]{height:var(--radix-accordion-content-height);animation:lintel-accordion-down var(--lintel-dur) var(--lintel-ease-inout) both}.lintel-faq-body[data-state=closed]{animation:lintel-accordion-up var(--lintel-dur) var(--lintel-ease-inout) both}@keyframes lintel-accordion-down{0%{height:0}to{height:var(--radix-accordion-content-height)}}@keyframes lintel-accordion-up{0%{height:var(--radix-accordion-content-height)}to{height:0}}.lintel-help-viewport>div{display:block!important}.lintel-help-layout{display:grid;grid-template-columns:240px minmax(0,780px);-moz-column-gap:72px;column-gap:72px;width:100%;max-width:1400px}.lintel-help-layout>section{grid-column:2}.lintel-help-header{grid-column:1;grid-row:1/span 4;align-self:start;position:sticky;top:0;z-index:10;background:var(--rbs-page)}.lintel-help-nav{display:flex;flex-direction:column;align-items:flex-start;gap:2px}.lintel-help-nav-link{padding:6px 0;font-size:14px;color:var(--rbs-muted);background:transparent;border:none;border-radius:0;cursor:pointer}.lintel-help-nav-link:hover{color:var(--rbs-text)}.lintel-help-nav-link:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}@media (max-width:860px){.lintel-help-layout{grid-template-columns:minmax(0,1fr)}.lintel-help-header,.lintel-help-layout>section{grid-column:1;grid-row:auto}.lintel-help-header{margin-bottom:20px;padding-bottom:8px}.lintel-help-nav{flex-direction:row;flex-wrap:wrap;gap:4px 16px}}.lintel-help-section{scroll-margin-top:8px;margin-bottom:48px}.lintel-help-section:last-child{margin-bottom:0}.lintel-help-section-title{font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--rbs-text);margin:0 0 14px}@media (max-width:767px){.lintel-help-section{scroll-margin-top:170px}.lintel-help-nav-link{min-height:44px;display:inline-flex;align-items:center}.lintel-faq-header{min-height:44px;padding-top:10px;padding-bottom:10px}}.lintel-dash-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:32px 48px;align-items:start}@media (max-width:860px){.lintel-dash-grid{grid-template-columns:minmax(0,1fr)}}.lintel-dash-panel{border-top:2px solid var(--rbs-text);padding:14px 0 0}.lintel-dash-main{min-width:0}.lintel-dash-recent{background:var(--rbs-surface2);padding:12px 16px;margin-bottom:32px}.lintel-dash-recent-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.lintel-dash-recent-label{font-size:12px;color:var(--rbs-muted)}.lintel-dash-recent-summary{font-size:14px;color:var(--rbs-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lintel-dash-panel-head{margin-bottom:12px}.lintel-dash-panel-title{font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--rbs-text);margin:0}.lintel-dash-tabs{display:flex;gap:2px;border-bottom:1px solid var(--rbs-border-hex);margin-bottom:10px}.lintel-dash-tab{padding:7px 14px;font-size:13px;color:var(--rbs-muted);background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer}.lintel-dash-tab:hover{color:var(--rbs-text)}.lintel-dash-tab--active{color:var(--rbs-text);border-bottom-color:hsl(var(--primary))}.lintel-dash-toggle{display:inline-flex;margin-bottom:0;border:1px solid var(--rbs-border-hex);border-radius:0;overflow:hidden;gap:0}.lintel-dash-toggle.lintel-dash-toggle{border-bottom:1px solid var(--rbs-border-hex)}.lintel-dash-toggle-btn{padding:6px 14px;font-size:13px;color:var(--rbs-muted);background:transparent;border:none;cursor:pointer}.lintel-dash-toggle .lintel-dash-toggle-btn[data-state=active]{color:hsl(var(--background));background:hsl(var(--foreground))}.lintel-dash-table{border-collapse:collapse;width:100%}.lintel-dash-table td,.lintel-dash-table th{padding:10px 12px;text-align:left;vertical-align:middle;font-size:14px}.lintel-dash-table th{color:var(--rbs-muted);font-weight:400;font-size:12px;border-bottom:1px solid var(--rbs-border-hex);white-space:nowrap}.lintel-dash-table tbody tr+tr td{border-top:1px solid var(--rbs-rule,hsla(0,0%,100%,.045))}.lintel-dash-table td.lintel-num,.lintel-dash-table th.lintel-num{text-align:right;font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}.lintel-dash-row-cancelled td{color:var(--rbs-muted);opacity:.72}.lintel-dash-status{font-weight:500}.lintel-dash-row-cancelled .lintel-dash-status{font-weight:400}.lintel-dash-bookingcard{border-top:2px solid var(--rbs-text);padding:12px 0;font-size:14px}.lintel-dash-bookingcard.lintel-dash-row-cancelled{color:var(--rbs-muted);opacity:.72}.lintel-dash-empty-cell{padding:0!important;border-top:none!important}.lintel-dash-empty-state{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;min-height:120px;background:var(--rbs-surface2);margin-top:12px;padding:24px}.lintel-dash-empty-title{font-size:14px;font-weight:600;color:var(--rbs-text)}.lintel-dash-empty-note{font-size:13px;color:var(--rbs-muted);margin:0;max-width:320px}.lintel-dash-side{display:flex;flex-direction:column;gap:32px}.lintel-dash-credit-list{list-style:none;margin:0;padding:0}.lintel-dash-credit{padding:8px 0}.lintel-dash-credit-label{font-weight:600;color:var(--rbs-text);font-size:14px}.lintel-dash-credit-detail{color:var(--rbs-muted);font-size:13px;margin-top:2px}.lintel-dash-supporter-row{display:flex;align-items:center;gap:12px}.lintel-dash-supporter-num{display:inline-flex;align-items:center;min-width:44px;min-height:44px;color:var(--rbs-text);font-weight:600;font-size:36px;line-height:1;letter-spacing:-.03em}.lintel-sb-table{border-collapse:collapse;width:100%}.lintel-sb-table td,.lintel-sb-table th{padding:10px 12px;text-align:left;vertical-align:middle;font-size:14px}.lintel-sb-table th{color:var(--rbs-muted);font-weight:400;font-size:12px;border-bottom:1px solid var(--rbs-border-hex);white-space:nowrap}.lintel-sb-table tbody tr+tr td{border-top:1px solid var(--rbs-rule,hsla(0,0%,100%,.045))}.lintel-view-enter{animation:lintel-view-enter var(--lintel-dur) var(--lintel-ease)}@keyframes lintel-view-enter{0%{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.lintel-fade-in{animation:lintel-fade-in var(--lintel-dur) var(--lintel-ease)}@keyframes lintel-fade-in{0%{opacity:0}to{opacity:1}}.lintel-dash-tab,.lintel-dash-toggle-btn,.lintel-faq-header,.lintel-help-nav-link,.lintel-nav-active,.lintel-press,.lintel-theme-toggle{transition:color var(--lintel-dur-fast) var(--lintel-ease),background-color var(--lintel-dur-fast) var(--lintel-ease),box-shadow var(--lintel-dur-fast) var(--lintel-ease),transform var(--lintel-dur-fast) var(--lintel-ease)}.lintel-dash-tab:active,.lintel-dash-toggle-btn:active,.lintel-help-nav-link:active,.lintel-press:active{transform:translateY(1px)}.lintel-root [role=dialog][data-variant=center][data-state=open]{animation:lintel-dialog-in var(--lintel-dur) var(--lintel-ease)}.lintel-root [role=dialog][data-variant=center][data-state=closed]{animation:lintel-dialog-out var(--lintel-dur-fast) var(--lintel-ease-inout)}@keyframes lintel-dialog-in{0%{opacity:0;transform:translate(-50%,calc(-50% + 6px))}to{opacity:1;transform:translate(-50%,-50%)}}@keyframes lintel-dialog-out{0%{opacity:1;transform:translate(-50%,-50%)}to{opacity:0;transform:translate(-50%,calc(-50% + 6px))}}@keyframes lintel-sheet-up{0%{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes lintel-sheet-down{0%{transform:translateY(0)}to{transform:translateY(100%)}}.lintel-root [role=dialog][data-variant=bottom-sheet][data-state=open]{animation:lintel-sheet-up var(--lintel-dur) var(--lintel-ease)}.lintel-root [role=dialog][data-variant=bottom-sheet][data-state=closed]{animation:lintel-sheet-down var(--lintel-dur-fast) var(--lintel-ease-inout)}.lintel-root [role=dialog].lintel-nav-sheet[data-state=open]{animation:lintel-nav-sheet-in var(--lintel-dur) var(--lintel-ease)}.lintel-root [role=dialog].lintel-nav-sheet[data-state=closed]{animation:lintel-nav-sheet-out var(--lintel-dur-fast) var(--lintel-ease-inout)}@keyframes lintel-nav-sheet-in{0%{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes lintel-nav-sheet-out{0%{transform:translateX(0)}to{transform:translateX(-100%)}}.lintel-sheet-handle{width:36px;height:4px;border-radius:0;background:var(--rbs-border-hex,hsla(0,0%,100%,.18));margin:0 auto 8px}@keyframes lintel-toast-in{0%{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}@keyframes lintel-toast-out{0%{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(12px)}}@keyframes lintel-toast-swipe-out{0%{transform:translateX(var(--radix-toast-swipe-end-x,0));opacity:1}to{transform:translateX(100%);opacity:0}}.lintel-toast[data-state=open]{animation:lintel-toast-in var(--lintel-dur) var(--lintel-ease)}.lintel-toast[data-state=closed]{animation:lintel-toast-out var(--lintel-dur-fast) var(--lintel-ease-inout)}.lintel-toast[data-swipe=move]{transform:translateX(var(--radix-toast-swipe-move-x,0));transition:none}.lintel-toast[data-swipe=cancel]{transform:translateX(0);transition:transform var(--lintel-dur-fast) var(--lintel-ease-inout)}.lintel-toast[data-swipe=end]{animation:lintel-toast-swipe-out var(--lintel-dur-fast) var(--lintel-ease-inout)}.lintel-drawer-col{transition:width var(--lintel-dur) var(--lintel-ease-inout)}@keyframes lintel-drawer-in{0%{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}@keyframes lintel-drawer-out{0%{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(12px)}}.lintel-drawer[data-state=open]{animation:lintel-drawer-in var(--lintel-dur) var(--lintel-ease)}.lintel-drawer[data-state=closed]{animation:lintel-drawer-out var(--lintel-dur-fast) var(--lintel-ease-inout)}.lintel-drawer[data-layout=sheet]{animation:none;border-left:0}.lintel-row-reveal{animation:lintel-row-reveal var(--lintel-dur) var(--lintel-ease) both;animation-delay:min(calc(var(--lintel-row-i, 0)*30ms),.3s)}@keyframes lintel-row-reveal{0%{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.lintel-cell-settle{animation:lintel-cell-settle var(--lintel-dur) var(--lintel-ease) both}@keyframes lintel-cell-settle{0%{opacity:0}to{opacity:1}}.lintel-cell-appear .lintel-booker-block-name,.lintel-cell-appear:before{animation:lintel-cell-appear var(--lintel-dur-fast) var(--lintel-ease) both;animation-delay:min(calc(var(--lintel-cell-i, 0)*40ms),2s)}@keyframes lintel-cell-appear{0%{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}.lintel-now-line{position:absolute;top:0;bottom:0;width:2px;background:hsl(var(--destructive));pointer-events:none;z-index:21}@media (prefers-reduced-motion:reduce){.lintel-cell--skeleton,.lintel-cell-appear .lintel-booker-block-name,.lintel-cell-appear:before,.lintel-cell-settle,.lintel-drawer[data-state=closed],.lintel-drawer[data-state=open],.lintel-fade-in,.lintel-faq-body[data-state=closed],.lintel-faq-body[data-state=open],.lintel-root [role=dialog].lintel-nav-sheet[data-state=closed],.lintel-root [role=dialog].lintel-nav-sheet[data-state=open],.lintel-root [role=dialog][data-variant=bottom-sheet][data-state=closed],.lintel-root [role=dialog][data-variant=bottom-sheet][data-state=open],.lintel-root [role=dialog][data-variant=center][data-state=closed],.lintel-root [role=dialog][data-variant=center][data-state=open],.lintel-row-reveal,.lintel-thumb-preview,.lintel-toast[data-state=closed],.lintel-toast[data-state=open],.lintel-toast[data-swipe=end],.lintel-view-enter{animation:none}.lintel-cell,.lintel-dash-tab,.lintel-dash-toggle-btn,.lintel-drawer-col,.lintel-faq-header,.lintel-help-nav-link,.lintel-nav-active,.lintel-nav-indicator,.lintel-press,.lintel-theme-toggle,.lintel-toast[data-swipe=cancel]{transition:none}.lintel-dash-tab:active,.lintel-dash-toggle-btn:active,.lintel-help-nav-link:active,.lintel-press:active{transform:none}}.placeholder\\:text-muted-foreground::-moz-placeholder{color:hsl(var(--muted-foreground))}.placeholder\\:text-muted-foreground::placeholder{color:hsl(var(--muted-foreground))}.hover\\:bg-\\[hsl\\(var\\(--primary-hover\\)\\)\\]:hover{background-color:hsl(var(--primary-hover))}.hover\\:bg-accent:hover{background-color:hsl(var(--accent))}.hover\\:bg-destructive\\/10:hover{background-color:hsl(var(--destructive)/.1)}.hover\\:bg-destructive\\/90:hover{background-color:hsl(var(--destructive)/.9)}.hover\\:bg-secondary\\/80:hover{background-color:hsl(var(--secondary)/.8)}.hover\\:text-accent-foreground:hover{color:hsl(var(--accent-foreground))}.hover\\:text-destructive:hover{color:hsl(var(--destructive))}.hover\\:text-foreground:hover{color:hsl(var(--foreground))}.hover\\:opacity-100:hover{opacity:1}.focus\\:bg-accent:focus{background-color:hsl(var(--accent))}.focus\\:text-accent-foreground:focus{color:hsl(var(--accent-foreground))}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}.focus\\:ring-1:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.focus\\:ring-ring:focus{--tw-ring-color:hsl(var(--ring))}.focus-visible\\:outline-none:focus-visible{outline:2px solid transparent;outline-offset:2px}.focus-visible\\:ring-1:focus-visible{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.focus-visible\\:ring-2:focus-visible{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.focus-visible\\:ring-inset:focus-visible{--tw-ring-inset:inset}.focus-visible\\:ring-ring:focus-visible{--tw-ring-color:hsl(var(--ring))}.active\\:bg-\\[hsl\\(var\\(--primary-active\\)\\)\\]:active{background-color:hsl(var(--primary-active))}.disabled\\:pointer-events-none:disabled{pointer-events:none}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\\:opacity-50:disabled{opacity:.5}.peer:disabled~.peer-disabled\\:cursor-not-allowed{cursor:not-allowed}.peer:disabled~.peer-disabled\\:opacity-70{opacity:.7}.data-\\[disabled\\]\\:pointer-events-none[data-disabled]{pointer-events:none}.data-\\[side\\=bottom\\]\\:translate-y-1[data-side=bottom]{--tw-translate-y:0.25rem}.data-\\[side\\=bottom\\]\\:translate-y-1[data-side=bottom],.data-\\[side\\=top\\]\\:-translate-y-1[data-side=top]{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.data-\\[side\\=top\\]\\:-translate-y-1[data-side=top]{--tw-translate-y:-0.25rem}.data-\\[state\\=checked\\]\\:translate-x-4[data-state=checked]{--tw-translate-x:1rem}.data-\\[state\\=checked\\]\\:translate-x-4[data-state=checked],.data-\\[state\\=unchecked\\]\\:translate-x-0\\.5[data-state=unchecked]{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.data-\\[state\\=unchecked\\]\\:translate-x-0\\.5[data-state=unchecked]{--tw-translate-x:0.125rem}.data-\\[state\\=active\\]\\:border-primary[data-state=active]{border-color:hsl(var(--primary))}.data-\\[state\\=checked\\]\\:bg-primary[data-state=checked]{background-color:hsl(var(--primary))}.data-\\[state\\=unchecked\\]\\:bg-secondary[data-state=unchecked]{background-color:hsl(var(--secondary))}.data-\\[placeholder\\]\\:text-muted-foreground[data-placeholder]{color:hsl(var(--muted-foreground))}.data-\\[state\\=active\\]\\:text-foreground[data-state=active]{color:hsl(var(--foreground))}.data-\\[disabled\\]\\:opacity-50[data-disabled]{opacity:.5}.group[data-state=open] .group-data-\\[state\\=open\\]\\:block{display:block}.group[data-state=open] .group-data-\\[state\\=open\\]\\:hidden{display:none}@media (prefers-reduced-motion:reduce){.motion-reduce\\:animate-none{animation:none}}@media (min-width:640px){.sm\\:inline{display:inline}}@media (min-width:768px){.md\\:inset-x-auto{left:auto;right:auto}.md\\:right-0{right:0}.md\\:ml-0{margin-left:0}.md\\:ml-auto{margin-left:auto}.md\\:\\!block{display:block!important}.md\\:\\!flex{display:flex!important}.md\\:flex{display:flex}.md\\:inline-flex{display:inline-flex}.md\\:hidden{display:none}.md\\:min-h-0{min-height:0}.md\\:w-\\[150px\\]{width:150px}.md\\:w-\\[160px\\]{width:160px}.md\\:w-\\[220px\\]{width:220px}.md\\:w-\\[88px\\]{width:88px}.md\\:w-auto{width:auto}.md\\:min-w-\\[116px\\]{min-width:116px}.md\\:max-w-\\[380px\\]{max-width:380px}.md\\:flex-none{flex:none}.md\\:flex-wrap{flex-wrap:wrap}.md\\:pb-4{padding-bottom:1rem}}.\\[\\&\\:\\:-webkit-scrollbar\\]\\:hidden::-webkit-scrollbar{display:none}.\\[\\&\\>span\\]\\:line-clamp-1>span{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1}';var tT=js("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");var oT=js("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");function aT(){let e=[["Lintel Sans",tT],["Lintel Mono",oT]];for(let[t,o]of e)try{let a=new FontFace(t,o,{weight:"100 900",display:"swap"});document.fonts.add(a),a.load().catch(()=>{})}catch{}}var jc=k(H()),rT="sit-lintel-host";function rB(){try{return!/(?:^|[?&])lintel=0(?:&|$)/.test(location.search)}catch{return!1}}function iT(){let e=window;return e.__rbsLintelMounted||(e.__rbsLintelMounted={mounted:!1}),e.__rbsLintelMounted}function nB(e){let t=iT();if(t.root){try{t.root.unmount()}catch{}t.root=void 0}e.querySelectorAll(".lintel-root").forEach(o=>o.remove())}function nT(){if(rB()){if(AC()){tr();return}try{lB()}catch(e){console.error("[rbs-lintel] mount failed during takeover",e),tr()}}}function lB(){let e=iT();if(e.mounted)return;let t=document.getElementById(rT);if(t&&t.getAttribute("data-lintel-mounted")==="1"){e.mounted=!0;return}let o;t&&t.shadowRoot?o=t.shadowRoot:(t||(t=document.createElement("div"),t.id=rT,document.body.appendChild(t)),o=t.attachShadow({mode:"open"})),nB(o),o.querySelectorAll("style[data-lintel-style]").forEach(s=>s.remove()),t.setAttribute("data-lintel","1");let a=document.createElement("style");a.setAttribute("data-lintel-style","1"),a.textContent=eT,o.appendChild(a);let r=document.createElement("div");r.className="lintel-root",r.setAttribute("data-lintel-root","1"),r.setAttribute("data-theme","light"),aT(),o.appendChild(r);let n=document.createElement("div");n.id="lintel-app",r.appendChild(n);let l=document.createElement("div");l.id="lintel-portal",r.appendChild(l);let i=(0,lT.createRoot)(n);e.root=i,i.render((0,jc.jsx)(nS,{container:l,children:(0,jc.jsx)(Gc,{children:(0,jc.jsx)(Q0,{})})})),e.mounted=!0,t.setAttribute("data-lintel-mounted","1")}document.body?nT():window.addEventListener("DOMContentLoaded",nT,{once:!0});})();

