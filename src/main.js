/**
 * TabSyncerAI — Main Process (Electron 33+)
 *
 * Uses the modern WebContentsView API (replaces deprecated BrowserView).
 * Manages the base window, embedded web panels for AI sites,
 * IPC communication with the control panel, and state persistence.
 */

const {
  app,
  BaseWindow,
  WebContentsView,
  ipcMain,
  session
} = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Configuration & State ───────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const STATE_PATH = path.join(app.getPath('userData'), 'state.json');

let config = {};
let state = {};

/** @type {BaseWindow | null} */
let mainWindow = null;

/** @type {Map<string, { view: WebContentsView, config: object, enabled: boolean, currentUrl: string }>} */
let panelViews = new Map();

/** @type {WebContentsView | null} */
let controlView = null;

/** @type {WebContentsView | null} */
let toolbarView = null;

/** @type {WebContentsView | null} */
let scrollbarView = null;

// Scroll state — tracking continuous pixels scrolled horizontally
let scrollOffsetX = 0;

// ─── Load Config ─────────────────────────────────────────────────
function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error('[TabSyncerAI] Failed to load config.json:', err.message);
    config = { panelWidth: 420, controlPanelWidth: 340, panels: [], selectors: {} };
  }
}

// ─── State Persistence ───────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('[TabSyncerAI] Failed to load state:', err.message);
    state = {};
  }
}

function saveState() {
  try {
    const bounds = mainWindow ? mainWindow.getBounds() : {};
    const enabledPanels = {};
    const panelUrls = {};

    for (const [id, data] of panelViews) {
      enabledPanels[id] = data.enabled;
      panelUrls[id] = data.currentUrl || data.config.url;
    }

    state = { windowBounds: bounds, enabledPanels, panelUrls, lastSaved: new Date().toISOString() };

    // Async save to avoid blocking the main Electron UI thread!
    fs.promises.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8')
      .catch(err => console.error('[TabSyncerAI] Failed write state async:', err.message));

  } catch (err) {
    console.error('[TabSyncerAI] Failed to save state:', err.message);
  }
}

// ─── Layout Engine (with horizontal scroll) ─────────────────────
function recalculateLayout() {
  if (!mainWindow) return;

  const { width: winWidth, height: winHeight } = mainWindow.getContentBounds();
  const controlWidth = config.controlPanelWidth || 340;
  const toolbarHeight = 40;
  const scrollbarHeight = 14;
  const availableWidth = winWidth - controlWidth;
  const fixedPanelWidth = config.panelWidth || 500;

  // 1. Toolbar — top
  if (toolbarView) {
    toolbarView.setBounds({ x: 0, y: 0, width: availableWidth, height: toolbarHeight });
  }

  // 2. AI Panels — continuous fixed width scroll
  const enabledEntries = [...panelViews.entries()].filter(([, d]) => d.enabled);
  const totalEnabled = enabledEntries.length;

  const visibleCount = Math.max(1, Math.floor(availableWidth / fixedPanelWidth));

  const actualPanelWidth = totalEnabled > 0
    ? Math.floor(availableWidth / Math.min(visibleCount, totalEnabled))
    : fixedPanelWidth;

  const totalContentWidth = totalEnabled * actualPanelWidth;
  const maxScroll = Math.max(0, totalContentWidth - availableWidth);

  if (scrollOffsetX > maxScroll) scrollOffsetX = maxScroll;
  if (scrollOffsetX < 0) scrollOffsetX = 0;

  const panelContentHeight = winHeight - toolbarHeight - scrollbarHeight;

  enabledEntries.forEach(([, data], idx) => {
    const startX = (idx * actualPanelWidth) - scrollOffsetX;
    const endX = startX + actualPanelWidth;

    // Is the panel on-screen? (even partially visible)
    if (startX < availableWidth && endX > 0) {
      data.view.setBounds({
        x: Math.round(startX),
        y: toolbarHeight,
        width: actualPanelWidth,
        height: panelContentHeight
      });
    } else {
      // Keep real dimensions for offscreen panels so injected query selectors 
      // relying on getBoundingClientRect() > 0 still work!
      data.view.setBounds({ x: -9999, y: -9999, width: actualPanelWidth, height: panelContentHeight });
    }
  });

  // Hide disabled panels completely
  for (const [, data] of panelViews) {
    if (!data.enabled) {
      data.view.setBounds({ x: -9999, y: -9999, width: 0, height: 0 });
    }
  }

  // 3. Scrollbar — bottom of panel area
  if (scrollbarView) {
    scrollbarView.setBounds({
      x: 0,
      y: winHeight - scrollbarHeight,
      width: availableWidth,
      height: scrollbarHeight
    });
  }

  // 4. Control panel — right sidebar, full height
  if (controlView) {
    controlView.setBounds({ x: availableWidth, y: 0, width: controlWidth, height: winHeight });
  }

  // 5. Send scroll state
  sendScrollState();
}

// Send scroll state info to toolbar so it can render navigation
function getScrollState() {
  const enabledEntries = [...panelViews.entries()].filter(([, d]) => d.enabled);
  const totalEnabled = enabledEntries.length;
  const availableWidth = mainWindow
    ? mainWindow.getContentBounds().width - (config.controlPanelWidth || 340)
    : 1920;
  const fixedPanelWidth = config.panelWidth || 500;
  const visibleCount = Math.max(1, Math.floor(availableWidth / fixedPanelWidth));
  const actualPanelWidth = totalEnabled > 0
    ? Math.floor(availableWidth / Math.min(visibleCount, totalEnabled))
    : fixedPanelWidth;
  const totalContentWidth = totalEnabled * actualPanelWidth;
  const maxScroll = Math.max(0, totalContentWidth - availableWidth);

  return {
    scrollOffsetX,
    maxScroll,
    actualPanelWidth,
    availableWidth,
    totalContentWidth,
    totalEnabled
  };
}

function sendScrollState() {
  const scrollState = getScrollState();
  toolbarView?.webContents.send('scroll-state', scrollState);
  scrollbarView?.webContents.send('scroll-state', scrollState);
}

// ─── Setup Session for an AI Panel ───────────────────────────────
// This configures permissions, user-agent, and headers per partition
// so that ChatGPT, Gemini, etc. load correctly without being blocked.
function setupPanelSession(partitionName) {
  const ses = session.fromPartition(partitionName);

  // Grant all permission requests (clipboard, notifications, media, etc.)
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(true);
  });

  // Also handle permission checks (Permissions API queries)
  ses.setPermissionCheckHandler((_webContents, permission) => {
    return true;
  });

  // Remove restrictive headers that block embedded loading
  // Some AI sites set X-Frame-Options or strict CSP — strip them so views render
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };

    // Remove headers that prevent embedding
    const keysToRemove = [
      'x-frame-options',
      'X-Frame-Options',
      'content-security-policy',
      'Content-Security-Policy',
      'content-security-policy-report-only',
      'Content-Security-Policy-Report-Only'
    ];

    for (const key of keysToRemove) {
      delete headers[key];
    }

    callback({ cancel: false, responseHeaders: headers });
  });
}

// ─── Create AI Panel Views ───────────────────────────────────────
function createPanelViews() {
  for (const panel of config.panels) {
    const partitionName = `persist:${panel.id}`;

    // Configure the session BEFORE creating the view
    setupPanelSession(partitionName);

    const view = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, 'panel-preload.js'),
        partition: partitionName,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // Enable features needed by modern AI sites
        experimentalFeatures: true
      }
    });


    // Restored state (Default to config.enabled which is persistent now!)
    const isEnabled = panel.enabled ?? true;
    const url = state.panelUrls?.[panel.id] || panel.url;

    panelViews.set(panel.id, { view, config: panel, enabled: isEnabled, currentUrl: url });

    // Add to window's content view
    mainWindow.contentView.addChildView(view);

    // Load URL
    view.webContents.loadURL(url).catch(err =>
      console.error(`[TabSyncerAI] ${panel.id} load error:`, err.message)
    );

    // Track navigation
    view.webContents.on('did-navigate', (_e, newUrl) => {
      const d = panelViews.get(panel.id);
      if (d) { d.currentUrl = newUrl; sendToolbarInfo(); }
    });
    view.webContents.on('did-navigate-in-page', (_e, newUrl) => {
      const d = panelViews.get(panel.id);
      if (d) { d.currentUrl = newUrl; sendToolbarInfo(); }
    });

    // Handle page load failures gracefully
    view.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL) => {
      console.error(`[TabSyncerAI] ${panel.id} failed to load: ${errorDesc} (${errorCode}) — ${validatedURL}`);
    });

    // Handle certificate errors (some corp networks have MITM proxies)
    view.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      event.preventDefault();
      callback(true); // Accept the certificate
    });

    // Allow popups (like Google Auth, Microsoft Auth, etc.) to open as real native windows.
    // OAuth relies on 'window.opener' to pass the token securely back to the AI website.
    // If we block the popup and navigate the panel instead, the login token has nowhere to go!
    view.webContents.setWindowOpenHandler((details) => {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          width: 800,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'panel-preload.js')
          }
        }
      };
    });
  }
}

// ─── Create Control Panel ────────────────────────────────────────
function createControlPanel() {
  controlView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.contentView.addChildView(controlView);
  controlView.webContents.loadFile(path.join(__dirname, 'ui', 'control-panel.html'));

  controlView.webContents.on('did-finish-load', () => sendPanelInfo());
}

// ─── Create Toolbar ──────────────────────────────────────────────
function createToolbar() {
  toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.contentView.addChildView(toolbarView);
  toolbarView.webContents.loadFile(path.join(__dirname, 'ui', 'toolbar.html'));

  toolbarView.webContents.on('did-finish-load', () => sendToolbarInfo());
}

// ─── Create Scrollbar ────────────────────────────────────────────
function createScrollbar() {
  scrollbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.contentView.addChildView(scrollbarView);
  scrollbarView.webContents.loadFile(path.join(__dirname, 'ui', 'scrollbar.html'));
}

// ─── Helper: send current panel metadata to UI views ─────────────
function panelPayload() {
  return config.panels.map(p => {
    const d = panelViews.get(p.id);
    return { id: p.id, label: p.label, url: p.url, color: p.color, enabled: d ? d.enabled : true };
  });
}

function sendPanelInfo() {
  controlView?.webContents.send('panel-info', panelPayload());
}
function sendToolbarInfo() {
  toolbarView?.webContents.send('toolbar-info', panelPayload());
  sendScrollState();
}

// ─── Main Window ─────────────────────────────────────────────────
function createMainWindow() {
  const defaults = { width: 1920, height: 1080 };
  const b = state.windowBounds || defaults;

  mainWindow = new BaseWindow({
    width: b.width || defaults.width,
    height: b.height || defaults.height,
    x: b.x,
    y: b.y,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#111117',
    title: 'TabSyncerAI',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  });

  // Build views
  createPanelViews();
  createControlPanel();
  createToolbar();
  createScrollbar();

  // Initial layout
  recalculateLayout();

  // Re-layout on resize
  mainWindow.on('resize', recalculateLayout);

  // Persist state
  mainWindow.on('close', saveState);
  mainWindow.on('closed', () => {
    mainWindow = null;
    panelViews.clear();
    controlView = null;
    toolbarView = null;
    scrollbarView = null;
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────

ipcMain.handle('reload-panel', (_e, panelId) => {
  const d = panelViews.get(panelId);
  if (d?.view) { d.view.webContents.reload(); return { success: true }; }
  return { success: false, error: 'Panel not found' };
});

ipcMain.handle('navigate-back', (_e, panelId) => {
  const d = panelViews.get(panelId);
  if (d && d.view.webContents.canGoBack()) {
    d.view.webContents.goBack();
  }
});

ipcMain.handle('navigate-url', (_e, panelId, url) => {
  const d = panelViews.get(panelId);
  if (d) {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    d.view.webContents.loadURL(cleanUrl).catch(err => console.error(err));
  }
});

ipcMain.handle('toggle-panel', (_e, panelId, enabled) => {
  const d = panelViews.get(panelId);
  if (!d) return { success: false, error: 'Panel not found' };
  d.enabled = enabled;
  recalculateLayout();
  sendToolbarInfo();
  sendPanelInfo();
  saveState();
  return { success: true };
});

ipcMain.handle('get-panels', () => panelPayload());

ipcMain.handle('get-scroll-state', () => getScrollState());

ipcMain.handle('save-config', (_e, updates) => {
  // Merge updates
  if (updates.panelWidth) config.panelWidth = updates.panelWidth;
  if (updates.controlPanelWidth) config.controlPanelWidth = updates.controlPanelWidth;
  if (updates.panels) {
    config.panels = updates.panels;

    // Crucial step: Reconstruct panelViews Map to match the new order and sync enabled states.
    // Maps in JS preserve insertion order. Updating this immediately applies rearrangements and toggles to the native WebContents.
    const newPanelViews = new Map();
    for (const p of updates.panels) {
      const data = panelViews.get(p.id);
      if (data) {
        data.enabled = p.enabled;
        newPanelViews.set(p.id, data);
      }
    }

    // Retain any existing panels that might not have been passed in the array to be safe
    for (const [id, data] of panelViews) {
      if (!newPanelViews.has(id)) {
        newPanelViews.set(id, data);
      }
    }
    panelViews = newPanelViews;
  }

  // Async disk save prevents synchronous stutters/hanging when re-ordering tabs!
  fs.promises.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
    .catch(err => console.error('[TabSyncerAI] async config save error:', err.message));

  recalculateLayout();
  sendToolbarInfo();
  sendPanelInfo();
  return true;
});

ipcMain.handle('reset-panels', async () => {
  // Clear persistent state cleanly and relaunch
  try {
    if (fs.existsSync(STATE_PATH)) {
      fs.unlinkSync(STATE_PATH);
    }

    // Completely nuke all caches globally
    for (const panel of config.panels) {
      const sess = session.fromPartition(`persist:${panel.id}`);
      await sess.clearStorageData();
      await sess.clearCache();
      await sess.clearAuthCache();
    }
  } catch (e) {
    console.error("Failed to reset global state/cache:", e);
  }
  app.relaunch();
  app.exit();
});

ipcMain.handle('reset-tab', async (_e, panelId) => {
  const partitionName = `persist:${panelId}`;
  const d = panelViews.get(panelId);
  if (d) {
    try {
      const sess = session.fromPartition(partitionName);
      // Nuke every layer of cache to ensure ghost-login states or hung service workers are destroyed
      await sess.clearStorageData();
      await sess.clearCache();
      await sess.clearHostResolverCache();
      await sess.clearAuthCache();

      // Relaunch the virgin partition
      if (d.view && d.view.webContents) {
        d.view.webContents.loadURL(d.config.url);
      }
      return { success: true };
    } catch (e) {
      console.error(`Failed to reset tab data for ${panelId}`, e);
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'Panel not found' };
});

ipcMain.handle('scroll-panels', (_e, deltaX) => {
  handleScrollContinuous(deltaX);
  return getScrollState();
});

ipcMain.on('panel-horizontal-scroll', (_e, deltaX) => {
  handleScrollContinuous(deltaX);
});

function handleScrollContinuous(deltaX) {
  const state = getScrollState();
  if (state.maxScroll <= 0) return;

  scrollOffsetX += deltaX;
  if (scrollOffsetX < 0) scrollOffsetX = 0;
  if (scrollOffsetX > state.maxScroll) scrollOffsetX = state.maxScroll;

  recalculateLayout();
}

ipcMain.handle('scroll-to-fraction', (_e, fraction) => {
  const state = getScrollState();
  if (state.maxScroll <= 0) return getScrollState();

  const boundedFraction = Math.max(0, Math.min(1, fraction));
  scrollOffsetX = boundedFraction * state.maxScroll;

  recalculateLayout();
  return getScrollState();
});

ipcMain.handle('send-prompt', async (_e, prompt, selectedIds, filePath) => {
  const results = {};

  // ── Per-site injection scripts ─────────────────────────────────
  // Each AI site has a unique DOM structure; we need tailored logic.

  /**
   * Build the injection JS for a given panel.
   * Returns { fillScript, submitScript } — both are IIFE strings
   * wrapped in try-catch so they never throw (avoiding "script failed to execute").
   */
  function getInjectionScripts(panelId, promptText) {
    const safePrompt = JSON.stringify(promptText);

    // ── ChatGPT ──────────────────────────────────────────────────
    if (panelId === 'chatgpt') {
      return {
        fillScript: `(function() { try {
          // ChatGPT uses a ProseMirror-style contenteditable #prompt-textarea (or <p> inside it)
          let el = document.querySelector('#prompt-textarea');
          if (!el) el = document.querySelector('textarea');
          if (!el) el = document.querySelector('[contenteditable="true"]');
          if (!el) return 'INPUT_NOT_FOUND';

          el.focus();

          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
              || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(el, ${safePrompt});
            else el.value = ${safePrompt};
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            // contenteditable (ProseMirror)
            el.focus();
            // Select all existing content and replace
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, ${safePrompt});
          }
          return 'OK';
        } catch(e) { return 'ERROR:' + e.message; } })()`,

        submitScript: `(function() { try {
          const btn = document.querySelector('button[data-testid="send-button"], button[aria-label*="Send"]');
          if (btn && !btn.disabled) { btn.click(); return 'CLICKED'; }
          // fallback: Enter
          const el = document.querySelector('#prompt-textarea') || document.querySelector('textarea') || document.querySelector('[contenteditable="true"]');
          if (el) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true }));
          }
          return 'ENTER';
        } catch(e) { return 'ERROR:' + e.message; } })()`
      };
    }

    // ── Gemini ────────────────────────────────────────────────────
    if (panelId === 'gemini') {
      return {
        fillScript: `(function() { try {
          function deepQuerySelector(selector, root = document) {
            let result = root.querySelector(selector);
            if (result) return result;
            const elements = root.querySelectorAll('*');
            for (const el of elements) {
                if (el.shadowRoot) {
                    result = deepQuerySelector(selector, el.shadowRoot);
                    if (result) return result;
                }
            }
            return null;
          }

          let el = deepQuerySelector('.ql-editor[contenteditable="true"]') 
                || deepQuerySelector('[contenteditable="true"]') 
                || deepQuerySelector('textarea');

          if (!el) return 'INPUT_NOT_FOUND';

          el.focus();

          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
              || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(el, ${safePrompt});
            else el.value = ${safePrompt};
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          } else {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, ${safePrompt});
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          return 'OK';
        } catch(e) { return 'ERROR:' + e.message; } })()`,

        submitScript: `(function() { try {
          function deepQuerySelectorAll(selector, root = document) {
            let results = Array.from(root.querySelectorAll(selector));
            const elements = root.querySelectorAll('*');
            for (const el of elements) {
                if (el.shadowRoot) {
                    results = results.concat(deepQuerySelectorAll(selector, el.shadowRoot));
                }
            }
            return results;
          }

          const btns = deepQuerySelectorAll('button[aria-label="Send message"], button[aria-label*="Send"], .send-button, .send-button-container button');
          const btn = btns.find(b => !b.disabled && b.getBoundingClientRect().width > 0);
          if (btn) { btn.click(); return 'CLICKED'; }

          // Fallback: Enter key on the input
          const el = deepQuerySelectorAll('.ql-editor, [contenteditable="true"], textarea').find(e => e.getBoundingClientRect().width > 0);
          if (el) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
          }
          return 'ENTER';
        } catch(e) { return 'ERROR:' + e.message; } })()`
      };
    }

    // ── DeepSeek ─────────────────────────────────────────────────
    if (panelId === 'deepseek') {
      return {
        fillScript: `(function() { try {
          let el = document.querySelector('#chat-input');
          if (!el) el = document.querySelector('textarea');
          if (!el) el = document.querySelector('[contenteditable="true"]');
          if (!el) return 'INPUT_NOT_FOUND';

          el.focus();
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
om            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
              || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(el, ${safePrompt});
            else el.value = ${safePrompt};
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          } else {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, ${safePrompt});
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          return 'OK';
        } catch(e) { return 'ERROR:' + e.message; } })()`,

        submitScript: `(function() { try {
          const btns = Array.from(document.querySelectorAll('button[aria-label*="Send"], button[type="submit"], button'));
          const btn = btns.find(b => {
            if (b.disabled) return false;
            const rect = b.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';
            if (ariaLabel.includes('send') || ariaLabel.includes('submit')) return true;
            if (b.type === 'submit') return true;
            if (b.innerHTML.includes('<svg') && b.closest('form')) return true;
            return false;
          });
          
          if (btn && !btn.disabled) { btn.click(); return 'CLICKED'; }
          
          const el = document.querySelector('#chat-input') || document.querySelector('textarea') || document.querySelector('[contenteditable="true"]');
          if (el) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
          }
          return 'ENTER';
        } catch(e) { return 'ERROR:' + e.message; } })()`
      };
    }

    // ── Claude ───────────────────────────────────────────────────
    if (panelId === 'claude') {
      return {
        fillScript: `(function() { try {
          let el = document.querySelector('[contenteditable="true"]');
          if (!el) return 'INPUT_NOT_FOUND';

          el.focus();
          
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(el);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('insertText', false, ${safePrompt});
          
          el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

          return 'OK';
        } catch(e) { return 'ERROR:' + e.message; } })()`,

        submitScript: `(function() { try {
          const btns = Array.from(document.querySelectorAll('button[aria-label*="Send"], button[aria-label*="send"], button'));
          const btn = btns.find(b => {
              if (b.disabled) return false;
              const rect = b.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return false;
              if (b.innerHTML.includes('<svg') && b.closest('div')?.querySelector('[contenteditable="true"]')) return true;
              if (b.getAttribute('aria-label')?.toLowerCase().includes('send')) return true;
              return false;
          });
          
          if (btn) { btn.click(); return 'CLICKED'; }
          
          const el = document.querySelector('[contenteditable="true"]');
          if (el) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keyup',   { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
          }
          return 'ENTER';
        } catch(e) { return 'ERROR:' + e.message; } })()`
      };
    }

    // ── Perplexity ───────────────────────────────────────────────
    if (panelId === 'perplexity') {
      return {
        fillScript: `(function() { try {
          const els = Array.from(document.querySelectorAll('textarea, [contenteditable], [role="textbox"], input:not([type="hidden"])'));
          let el = els.find(e => {
            const rect = e.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !e.disabled;
          });
          if (!el) return 'INPUT_NOT_FOUND';

          el.focus();
          
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
              || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
              
            if (setter) setter.call(el, ${safePrompt});
            else el.value = ${safePrompt};
          } else {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, ${safePrompt});
          }
          
          el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          
          return 'OK';
        } catch(e) { return 'ERROR:' + e.message; } })()`,

        submitScript: `(function() { try {
          let btn = null;
          
          // Strategy 1: Look for buttons with specific Perplexity patterns
          const allButtons = Array.from(document.querySelectorAll('button'));
          
          // First try: Look for submit/send in aria-label (case insensitive)
          btn = allButtons.find(b => {
            if (b.disabled) return false;
            const rect = b.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            return ariaLabel.includes('submit') || ariaLabel.includes('send');
          });
          
          // Second try: Look for buttons near the textarea with SVG
          if (!btn) {
            const textarea = document.querySelector('textarea, [contenteditable], [role="textbox"]');
            if (textarea) {
              const parent = textarea.closest('form, div[class*="input"], div[class*="search"], div[class*="query"]');
              if (parent) {
                const nearbyButtons = Array.from(parent.querySelectorAll('button'));
                btn = nearbyButtons.find(b => {
                  if (b.disabled) return false;
                  const rect = b.getBoundingClientRect();
                  if (rect.width === 0 || rect.height === 0) return false;
                  return b.querySelector('svg') !== null;
                });
              }
            }
          }
          
          // Third try: Look for any visible button with SVG that's not a menu/settings button
          if (!btn) {
            btn = allButtons.find(b => {
              if (b.disabled) return false;
              const rect = b.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return false;
              if (!b.querySelector('svg')) return false;
              
              // Exclude common non-submit buttons
              const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
              const title = (b.getAttribute('title') || '').toLowerCase();
              const excludeWords = ['menu', 'settings', 'close', 'cancel', 'back', 'more', 'options'];
              const isExcluded = excludeWords.some(word => ariaLabel.includes(word) || title.includes(word));
              
              return !isExcluded;
            });
          }
          
          // Fourth try: Type="submit"
          if (!btn) {
            btn = allButtons.find(b => {
              if (b.disabled) return false;
              const rect = b.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return false;
              return b.type === 'submit';
            });
          }
          
          if (btn) { 
            btn.click(); 
            return 'CLICKED'; 
          }
          
          // Fallback: Try Ctrl+Enter first (Perplexity might use this)
          const els = Array.from(document.querySelectorAll('textarea, [contenteditable], [role="textbox"], input:not([type="hidden"])'));
          let el = els.find(e => {
            const rect = e.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !e.disabled;
          });
          
          if (el) {
            // Try Ctrl+Enter
            el.dispatchEvent(new KeyboardEvent('keydown', { 
              key: 'Enter', 
              code: 'Enter', 
              keyCode: 13, 
              which: 13, 
              ctrlKey: true,
              bubbles: true, 
              composed: true, 
              cancelable: true 
            }));
            
            // Also try regular Enter
            setTimeout(() => {
              el.dispatchEvent(new KeyboardEvent('keydown', { 
                key: 'Enter', 
                code: 'Enter', 
                keyCode: 13, 
                which: 13, 
                bubbles: true, 
                composed: true, 
                cancelable: true 
              }));
            }, 100);
            
            return 'ENTER';
          }
          
          return 'NO_ACTION';
        } catch(e) { return 'ERROR:' + e.message; } })()`
      };
    }

    // ── Copilot ──────────────────────────────────────────────────
    if (panelId === 'copilot') {
      return {
        fillScript: `(function() { try {
          const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'));
          let el = els.find(e => {
            const rect = e.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !e.disabled && !e.readOnly;
          });
          if (!el) return 'INPUT_NOT_FOUND';

          el.focus();
          
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
              || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(el, ${safePrompt});
            else el.value = ${safePrompt};
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          } else {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, ${safePrompt});
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          
          return 'OK';
        } catch(e) { return 'ERROR:' + e.message; } })()`,

        submitScript: `(function() { try {
          const btns = Array.from(document.querySelectorAll('button[aria-label*="Submit"], button[aria-label*="Send"], button[type="submit"], button'));
          const btn = btns.find(b => {
            if (b.disabled) return false;
            const rect = b.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';
            const title = b.getAttribute('title')?.toLowerCase() || '';
            if (ariaLabel.includes('submit') || ariaLabel.includes('send')) return true;
            if (title.includes('submit') || title.includes('send')) return true;
            if (b.type === 'submit') return true;
            if (b.innerHTML.includes('<svg') && b.closest('form')) return true;
            return false;
          });
          
          if (btn && !btn.disabled) { btn.click(); return 'CLICKED'; }
          
          const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'));
          let el = els.find(e => {
            const rect = e.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !e.disabled;
          });
          if (el) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
          }
          return 'ENTER';
        } catch(e) { return 'ERROR:' + e.message; } })()`
      };
    }

    // ── Mistral ──────────────────────────────────────────────────
    if (panelId === 'mistral') {
      return {
        fillScript: `(function() { try {
          const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'));
          let el = els.find(e => {
            const rect = e.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !e.disabled;
          });
          if (!el) return 'INPUT_NOT_FOUND';

          el.focus();
          
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
              || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(el, ${safePrompt});
            else el.value = ${safePrompt};
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          } else {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, ${safePrompt});
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          
          return 'OK';
        } catch(e) { return 'ERROR:' + e.message; } })()`,

        submitScript: `(function() { try {
          // Try multiple strategies
          let btn = null;
          
          // Strategy 1: Aria-label with Send
          const btns1 = Array.from(document.querySelectorAll('button[aria-label*="Send"], button[aria-label*="send"]'));
          btn = btns1.find(b => {
            if (b.disabled) return false;
            const rect = b.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          
          // Strategy 2: Type submit
          if (!btn) {
            const btns2 = Array.from(document.querySelectorAll('button[type="submit"]'));
            btn = btns2.find(b => {
              if (b.disabled) return false;
              const rect = b.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
          }
          
          // Strategy 3: Button with SVG in form
          if (!btn) {
            const btns3 = Array.from(document.querySelectorAll('form button, [role="form"] button'));
            btn = btns3.find(b => {
              if (b.disabled) return false;
              const rect = b.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return false;
              return b.querySelector('svg') !== null;
            });
          }
          
          if (btn) { 
            btn.click(); 
            return 'CLICKED'; 
          }
          
          // Fallback: Enter key
          const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'));
          let el = els.find(e => {
            const rect = e.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !e.disabled;
          });
          if (el) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
            return 'ENTER';
          }
          return 'NO_ACTION';
        } catch(e) { return 'ERROR:' + e.message; } })()`
      };
    }

    // ── Generic fallback (Grok, and any other) ───────────────────────
    return {
      fillScript: `(function() { try {
        const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], input:not([type="hidden"]):not([type="file"])'));
        let el = els.find(e => {
          const rect = e.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !e.disabled && !e.readOnly;
        });
        if (!el) return 'INPUT_NOT_FOUND';

        el.focus();
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(el, ${safePrompt});
          else el.value = ${safePrompt};
          el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        } else {
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(el);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('insertText', false, ${safePrompt});
          el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }
        return 'OK';
      } catch(e) { return 'ERROR:' + e.message; } })()`,

      submitScript: `(function() { try {
        // Multi-strategy button detection
        let btn = null;
        
        // Strategy 1: Explicit send/submit aria-labels
        const btns1 = Array.from(document.querySelectorAll('button[aria-label*="Send"], button[aria-label*="send"], button[aria-label*="Submit"], button[aria-label*="submit"]'));
        btn = btns1.find(b => {
          if (b.disabled) return false;
          const rect = b.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        
        // Strategy 2: Title attributes
        if (!btn) {
          const btns2 = Array.from(document.querySelectorAll('button[title*="Send"], button[title*="send"], button[title*="Submit"], button[title*="submit"]'));
          btn = btns2.find(b => {
            if (b.disabled) return false;
            const rect = b.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        }
        
        // Strategy 3: Type submit
        if (!btn) {
          const btns3 = Array.from(document.querySelectorAll('button[type="submit"]'));
          btn = btns3.find(b => {
            if (b.disabled) return false;
            const rect = b.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        }
        
        // Strategy 4: SVG buttons in forms
        if (!btn) {
          const btns4 = Array.from(document.querySelectorAll('button'));
          btn = btns4.find(b => {
            if (b.disabled) return false;
            const rect = b.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const hasSvg = b.querySelector('svg') !== null;
            const inForm = b.closest('form') !== null || b.closest('[role="form"]') !== null;
            return hasSvg && inForm;
          });
        }
        
        if (btn) { 
          btn.click(); 
          return 'CLICKED'; 
        }
        
        // Fallback: Enter key on input
        const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], input:not([type="hidden"]):not([type="file"])'));
        let el = els.find(e => {
          const rect = e.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !e.disabled;
        });
        if (el) {
          el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, composed:true, cancelable:true }));
          return 'ENTER';
        }
        return 'NO_ACTION';
      } catch(e) { return 'ERROR:' + e.message; } })()`
    };
  }

  // ── Execute injection for each selected panel ──────────────────
  for (const panelId of selectedIds) {
    const d = panelViews.get(panelId);
    if (!d || !d.enabled) {
      results[panelId] = { success: false, error: 'Panel not found or disabled' };
      continue;
    }

    try {
      const { fillScript, submitScript } = getInjectionScripts(panelId, prompt);

      // Step 0: Inject System File natively via internal CDP protocol if selected
      if (filePath) {
        let attachedFile = false;
        let successfulNodes = 0;
        console.log(`[TabSyncerAI] Attempting to attach file for ${panelId}:`, filePath);

        try {
          if (!d.view.webContents.debugger.isAttached()) {
            d.view.webContents.debugger.attach('1.3');
          }
          await d.view.webContents.debugger.sendCommand('DOM.enable');

          // First, try to click any file upload buttons to reveal hidden inputs
          const clickUploadButton = `(function() {
            try {
              // Gemini-specific: Look for the upload icon button more precisely
              const uploadBtns = Array.from(document.querySelectorAll(
                'button[aria-label*="ttach"], button[aria-label*="pload"], ' +
                'button[aria-label*="Add"], button[aria-label*="add"], ' +
                'button[title*="ttach"], button[title*="pload"], ' +
                'input[type="file"] + button, label[for*="file"], ' +
                'button[data-tooltip*="ttach"], button[data-tooltip*="pload"]'
              ));
              
              for (const btn of uploadBtns) {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && !btn.disabled) {
                  console.log('Clicking upload button:', btn.getAttribute('aria-label') || btn.getAttribute('title') || 'unknown');
                  btn.click();
                  return 'CLICKED';
                }
              }
              
              // Fallback: Look for any button with an upload-like SVG icon
              const allButtons = Array.from(document.querySelectorAll('button'));
              for (const btn of allButtons) {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && !btn.disabled) {
                  const svg = btn.querySelector('svg');
                  if (svg && (btn.innerHTML.includes('path') || btn.innerHTML.includes('polygon'))) {
                    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                    const title = btn.getAttribute('title')?.toLowerCase() || '';
                    if (ariaLabel.includes('file') || title.includes('file') || 
                        ariaLabel.includes('image') || title.includes('image') ||
                        ariaLabel.includes('upload') || title.includes('upload')) {
                      console.log('Clicking fallback upload button:', ariaLabel || title);
                      btn.click();
                      return 'CLICKED';
                    }
                  }
                }
              }
              
              return 'NO_BUTTON';
            } catch(e) { return 'ERROR:' + e.message; }
          })()`;
          
          const clickResult = await d.view.webContents.executeJavaScript(clickUploadButton);
          console.log(`[TabSyncerAI] Upload button click result for ${panelId}:`, clickResult);
          
          if (clickResult === 'CLICKED') {
            // For Gemini, wait longer as the file input appears with animation
            const waitTime = panelId === 'gemini' ? 1500 : 500;
            await new Promise(r => setTimeout(r, waitTime));
          }

          // Try multiple times for Gemini since it's tricky
          const maxAttempts = panelId === 'gemini' ? 3 : 1;
          
          for (let attempt = 0; attempt < maxAttempts && !attachedFile; attempt++) {
            if (attempt > 0) {
              console.log(`[TabSyncerAI] Retry attempt ${attempt + 1} for ${panelId}`);
              await new Promise(r => setTimeout(r, 800));
            }

            const { root } = await d.view.webContents.debugger.sendCommand('DOM.getDocument', { depth: -1, pierce: true });
            const { searchId, resultCount } = await d.view.webContents.debugger.sendCommand('DOM.performSearch', {
              query: 'input[type="file"]',
              includeUserAgentShadowDOM: true
            });

            if (resultCount > 0) {
              console.log(`[TabSyncerAI] Found ${resultCount} file inputs via Shadow-piercing on ${panelId} (attempt ${attempt + 1}).`);
              const { nodeIds } = await d.view.webContents.debugger.sendCommand('DOM.getSearchResults', {
                searchId,
                fromIndex: 0,
                toIndex: resultCount
              });
              
              for (const nId of nodeIds) {
                try {
                  await d.view.webContents.debugger.sendCommand('DOM.setFileInputFiles', { nodeId: nId, files: [filePath] });
                  successfulNodes++;
                  attachedFile = true;
                  console.log(`[TabSyncerAI] Successfully attached file to node ${nId} for ${panelId}`);
                } catch (subErr) { 
                  console.warn(`[TabSyncerAI] Failed to attach to node ${nId}:`, subErr.message);
                }
              }
            } else {
              console.warn(`[TabSyncerAI] No file input fields found for ${panelId} (attempt ${attempt + 1})!`);
            }
          }
          
          // If still no file input found for Gemini, try clicking again and searching
          if (!attachedFile && panelId === 'gemini') {
            console.log(`[TabSyncerAI] Trying alternative approach for Gemini...`);
            
            // Try clicking the upload button again
            await d.view.webContents.executeJavaScript(clickUploadButton);
            await new Promise(r => setTimeout(r, 2000));
            
            // Search one more time
            const { root } = await d.view.webContents.debugger.sendCommand('DOM.getDocument', { depth: -1, pierce: true });
            const { searchId, resultCount } = await d.view.webContents.debugger.sendCommand('DOM.performSearch', {
              query: 'input[type="file"]',
              includeUserAgentShadowDOM: true
            });
            
            if (resultCount > 0) {
              console.log(`[TabSyncerAI] Found ${resultCount} file inputs on final Gemini attempt.`);
              const { nodeIds } = await d.view.webContents.debugger.sendCommand('DOM.getSearchResults', {
                searchId,
                fromIndex: 0,
                toIndex: resultCount
              });
              
              for (const nId of nodeIds) {
                try {
                  await d.view.webContents.debugger.sendCommand('DOM.setFileInputFiles', { nodeId: nId, files: [filePath] });
                  successfulNodes++;
                  attachedFile = true;
                  console.log(`[TabSyncerAI] Successfully attached file to node ${nId} for Gemini on final attempt`);
                } catch (subErr) { 
                  console.warn(`[TabSyncerAI] Failed to attach to node ${nId}:`, subErr.message);
                }
              }
            }
          }
        } catch (e) {
          console.warn(`[TabSyncerAI] CDP File Attachment internally bypassed for ${panelId}:`, e.message);
        } finally {
          try {
            await d.view.webContents.debugger.sendCommand('DOM.disable');
            d.view.webContents.debugger.detach();
          } catch (e) { }
        }

        if (attachedFile) {
          console.log(`[TabSyncerAI] Successfully injected file into ${successfulNodes} inputs for ${panelId}!`);
          await new Promise(r => setTimeout(r, 1600));
        } else {
          console.warn(`[TabSyncerAI] File attachment failed for ${panelId}, continuing with text only`);
        }
      }

      // Step 1: Fill the input
      const fillResult = await d.view.webContents.executeJavaScript(fillScript);
      if (fillResult === 'INPUT_NOT_FOUND') {
        results[panelId] = { success: false, error: 'Input element not found — is the page fully loaded?' };
        continue;
      }
      if (typeof fillResult === 'string' && fillResult.startsWith('ERROR:')) {
        results[panelId] = { success: false, error: fillResult };
        continue;
      }

      // Step 2: Wait a moment, then submit
      await new Promise(r => setTimeout(r, 700));
      const submitResult = await d.view.webContents.executeJavaScript(submitScript);
      console.log(`[TabSyncerAI] Submit result for ${panelId}:`, submitResult);

      results[panelId] = { success: true };
    } catch (err) {
      results[panelId] = { success: false, error: err.message };
    }
  }

  return results;
});

// ─── App Lifecycle ───────────────────────────────────────────────

app.whenReady().then(() => {
  // Let Electron spoof Chrome by removing its own traces dynamically based on its real inner V8
  const actualChrome = process.versions.chrome || '122.0.0.0';
  app.userAgentFallback = `Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / ${actualChrome} Safari / 537.36`;

  loadConfig();
  loadState();
  createMainWindow();
});

app.on('window-all-closed', () => {
  saveState();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});

// Auto-save every 2 minutes
setInterval(() => { if (mainWindow) saveState(); }, 120_000);
