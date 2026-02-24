# Build TabSyncerAI with Native Chromium (CEF/Puppeteer) - Complete Specification

## Project Overview

Build a multi-panel AI browser workspace application that broadcasts prompts to multiple AI websites simultaneously (ChatGPT, Gemini, Claude, DeepSeek, Grok, Copilot, Perplexity, Mistral, etc.) using **native Chromium** instead of Electron.

## Current Architecture (Electron-based)

The existing application uses:
- **Electron 33.2.0** with BaseWindow and WebContentsView API
- Multiple persistent browser sessions (one per AI panel)
- IPC communication between main process and UI views
- Custom preload scripts for secure context bridging
- Native file attachment via Chrome DevTools Protocol (CDP)
- Horizontal scrolling panel layout with fixed widths
- Persistent state management (window bounds, panel URLs, enabled states)

## Target Architecture (Chromium-based)

Replace Electron with one of these Chromium embedding approaches:

### Option 1: Chromium Embedded Framework (CEF) - Recommended
- **Language**: C++ with optional C# bindings (CefSharp for Windows)
- **Best for**: Native desktop application with full control
- **Advantages**: Maximum performance, full Chromium API access, true multi-process architecture

### Option 2: Puppeteer/Playwright + Web UI
- **Language**: Node.js + HTML/CSS/JavaScript
- **Best for**: Rapid development, cross-platform
- **Advantages**: Familiar web stack, easier development, good CDP access

### Option 3: Chromium + Native GUI Framework
- **Language**: C++/Rust + Qt/GTK
- **Best for**: Maximum control and customization
- **Advantages**: Native OS integration, smallest binary size

## Core Requirements

### 1. Multi-Panel Browser Management

**Current Electron Implementation:**
```javascript
// Creates WebContentsView for each AI panel with persistent partition
const view = new WebContentsView({
  webPreferences: {
    partition: `persist:${panel.id}`,
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

**Chromium Equivalent Requirements:**
- Create separate browser contexts for each AI panel (ChatGPT, Gemini, Claude, etc.)
- Each context must have persistent storage (cookies, localStorage, IndexedDB)
- Support for 8+ concurrent browser instances
- Each panel should maintain independent session state
- Panel dimensions: configurable width (default 390px), full height minus toolbar (40px) and scrollbar (14px)

### 2. Panel Configuration

**Config Structure (config.json):**
```json
{
  "panelWidth": 390,
  "controlPanelWidth": 340,
  "panels": [
    {
      "id": "gemini",
      "label": "Gemini",
      "url": "https://gemini.google.com/app",
      "color": "#4285f4",
      "enabled": true
    },
    {
      "id": "chatgpt",
      "label": "ChatGPT",
      "url": "https://chatgpt.com",
      "color": "#10a37f",
      "enabled": true
    }
    // ... 6 more panels
  ]
}
```

**Requirements:**
- Load configuration from JSON file
- Support dynamic panel enable/disable
- Support panel reordering via drag-and-drop
- Persist panel states (enabled, current URL, scroll position)
- Save state to `state.json` in user data directory

### 3. Session & Permission Management

**Current Electron Implementation:**
```javascript
function setupPanelSession(partitionName) {
  const ses = session.fromPartition(partitionName);
  
  // Grant all permissions
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(true);
  });
  
  // Remove restrictive headers
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    callback({ cancel: false, responseHeaders: headers });
  });
}
```

**Chromium Requirements:**
- Auto-approve all permission requests (clipboard, notifications, media, geolocation)
- Strip X-Frame-Options and CSP headers to allow embedding
- Handle OAuth popups (Google, Microsoft auth) as native windows
- Maintain window.opener relationship for OAuth callbacks
- Custom User-Agent spoofing to avoid bot detection
- Certificate error handling for corporate proxies

### 4. Prompt Broadcasting System

**Core Functionality:**
The application must inject text prompts and optionally file attachments into multiple AI chat interfaces simultaneously.

**Per-Site Injection Scripts:**

Each AI platform has unique DOM structures requiring tailored injection logic:

#### ChatGPT (chatgpt.com)
```javascript
// Input: #prompt-textarea or contenteditable ProseMirror
// Submit: button[data-testid="send-button"]
// Fallback: Enter key dispatch
```

#### Gemini (gemini.google.com)
```javascript
// Input: .ql-editor[contenteditable="true"] (may be in Shadow DOM)
// Submit: button[aria-label="Send message"]
// Requires: Shadow DOM piercing for input detection
```

#### Claude (claude.ai)
```javascript
// Input: [contenteditable="true"]
// Submit: button with SVG icon near contenteditable
// Method: document.execCommand('insertText')
```

#### DeepSeek (chat.deepseek.com)
```javascript
// Input: #chat-input or textarea
// Submit: button[aria-label*="Send"] or type="submit"
```

#### Perplexity (perplexity.ai)
```javascript
// Input: textarea or [role="textbox"]
// Submit: Complex button detection (SVG-based, multiple strategies)
// Fallback: Ctrl+Enter then Enter
```

#### Copilot (copilot.microsoft.com)
```javascript
// Input: textarea or [contenteditable="true"]
// Submit: button[aria-label*="Submit"]
```

#### Mistral (chat.mistral.ai)
```javascript
// Input: textarea or [contenteditable="true"]
// Submit: button[aria-label*="Send"] or form button with SVG
```

#### Grok (grok.x.ai) + Generic Fallback
```javascript
// Input: First visible textarea/contenteditable/[role="textbox"]
// Submit: Multi-strategy button detection
```

**Injection Requirements:**
1. **Text Filling:**
   - Focus the input element
   - For `<textarea>`: Use native value setter + input event dispatch
   - For contenteditable: Use `document.execCommand('insertText')` or Selection API
   - Trigger React/Vue change detection via proper event bubbling

2. **File Attachment (Critical Feature):**
   - Use Chrome DevTools Protocol (CDP) `DOM.setFileInputFiles` command
   - Pierce Shadow DOM to find `input[type="file"]` elements
   - Click upload buttons to reveal hidden file inputs
   - Support images (PNG, JPG), PDFs, CSVs
   - Special handling for Gemini (requires 1500ms delay after button click)
   - Retry logic for flaky file input detection (3 attempts for Gemini)

3. **Submit Execution:**
   - Primary: Click visible, enabled send button
   - Fallback: Dispatch Enter keydown/keypress/keyup events
   - Wait 700ms between fill and submit for React state updates

**CDP File Attachment Flow:**
```javascript
// 1. Attach debugger
webContents.debugger.attach('1.3');
await webContents.debugger.sendCommand('DOM.enable');

// 2. Click upload button to reveal input
const clickResult = await executeJavaScript(clickUploadButtonScript);
await delay(1500); // Gemini needs longer

// 3. Search for file inputs (pierce Shadow DOM)
const { root } = await debugger.sendCommand('DOM.getDocument', { 
  depth: -1, 
  pierce: true 
});
const { searchId, resultCount } = await debugger.sendCommand('DOM.performSearch', {
  query: 'input[type="file"]',
  includeUserAgentShadowDOM: true
});

// 4. Inject file into all found inputs
const { nodeIds } = await debugger.sendCommand('DOM.getSearchResults', {
  searchId, fromIndex: 0, toIndex: resultCount
});
for (const nodeId of nodeIds) {
  await debugger.sendCommand('DOM.setFileInputFiles', { 
    nodeId, 
    files: [absoluteFilePath] 
  });
}

// 5. Cleanup
await debugger.sendCommand('DOM.disable');
debugger.detach();
```

### 5. UI Layout System

**Window Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar (40px height)                                       │
│ [Tab1][Tab2][Tab3][Tab4]...                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Panel1  │  Panel2  │  Panel3  │  Panel4  │  Control Panel │
│  (390px) │  (390px) │  (390px) │  (390px) │    (340px)     │
│          │          │          │          │                 │
│          │          │          │          │  [Checkboxes]  │
│          │          │          │          │  [Messages]    │
│          │          │          │          │  [Input Area]  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Scrollbar (14px height)                                     │
└─────────────────────────────────────────────────────────────┘
```

**Layout Requirements:**

1. **Toolbar (toolbar.html):**
   - Chrome-style tabs with rounded top corners
   - Each tab shows: back button, colored dot, label, URL input, reload button
   - Drag-and-drop tab reordering using Pointer Events API
   - Horizontal scroll synchronized with panels below
   - Tab width matches panel width (390px default)
   - Background: #202124 (Chrome dark mode)
   - Active tab: #323639 with 2px colored top border

2. **AI Panels:**
   - Fixed width (configurable, default 390px)
   - Horizontal scrolling when total width exceeds viewport
   - Smooth scroll with mouse wheel (deltaX or deltaY)
   - Offscreen panels positioned at x: -9999 (hidden but functional)
   - Each panel is a full Chromium browser instance
   - No iframe restrictions (direct browser context)

3. **Control Panel (control-panel.html):**
   - Fixed width (340px)
   - Always visible on right side
   - Sections:
     - Header with logo and settings button
     - Target selection (checkboxes for each panel)
     - Message history (chat-style bubbles)
     - Input area (textarea + attach button + send button)
   - Dark theme: #111117 background, #7c6aef accent
   - Messenger-style UI with Inter font

4. **Scrollbar (scrollbar.html):**
   - Custom horizontal scrollbar (14px height)
   - Draggable thumb for precise navigation
   - Synchronized with panel scroll offset
   - Shows scroll position indicator

**Responsive Layout Calculation:**
```javascript
const winWidth = windowWidth;
const winHeight = windowHeight;
const controlWidth = 340;
const toolbarHeight = 40;
const scrollbarHeight = 14;
const availableWidth = winWidth - controlWidth;
const fixedPanelWidth = 390;

const enabledPanels = panels.filter(p => p.enabled);
const totalContentWidth = enabledPanels.length * fixedPanelWidth;
const maxScroll = Math.max(0, totalContentWidth - availableWidth);

// Position each panel
enabledPanels.forEach((panel, idx) => {
  const startX = (idx * fixedPanelWidth) - scrollOffsetX;
  const endX = startX + fixedPanelWidth;
  
  if (startX < availableWidth && endX > 0) {
    // Visible: position normally
    panel.setBounds({
      x: startX,
      y: toolbarHeight,
      width: fixedPanelWidth,
      height: winHeight - toolbarHeight - scrollbarHeight
    });
  } else {
    // Offscreen: hide but keep dimensions for JS queries
    panel.setBounds({ x: -9999, y: -9999, width: fixedPanelWidth, height: ... });
  }
});
```

### 6. State Persistence

**State File (state.json):**
```json
{
  "windowBounds": {
    "width": 1920,
    "height": 1080,
    "x": 100,
    "y": 100
  },
  "enabledPanels": {
    "chatgpt": true,
    "gemini": true,
    "claude": false
  },
  "panelUrls": {
    "chatgpt": "https://chatgpt.com/c/abc123",
    "gemini": "https://gemini.google.com/app/xyz"
  },
  "lastSaved": "2026-02-24T10:30:00.000Z"
}
```

**Persistence Requirements:**
- Save state on window close
- Auto-save every 2 minutes
- Restore window size/position on launch
- Restore last visited URL for each panel
- Restore enabled/disabled state for each panel
- Store in user data directory (platform-specific)

### 7. Settings & Configuration UI

**Settings Panel Features:**
- Global panel width slider (300px - 1200px)
- Drag-and-drop panel reordering
- Toggle switches for each panel (enable/disable)
- Reset individual tab button (clears cookies, cache, storage)
- Reset application button (clears all state, relaunches app)
- Real-time config saving (no "Apply" button needed)

**Reset Tab Functionality:**
```javascript
async function resetTab(panelId) {
  // Clear all storage for this panel's context
  await clearStorageData();
  await clearCache();
  await clearHostResolverCache();
  await clearAuthCache();
  
  // Reload original URL
  await loadURL(panel.config.url);
}
```

**Reset Application Functionality:**
```javascript
async function resetApplication() {
  // Delete state.json
  fs.unlinkSync(STATE_PATH);
  
  // Clear all panel contexts
  for (const panel of panels) {
    await clearAllStorageForContext(panel.id);
  }
  
  // Relaunch application
  relaunch();
  exit();
}
```

### 8. Cross-Platform Build System

**Target Platforms:**
- Windows (NSIS installer + portable)
- macOS (DMG + ZIP)
- Linux (AppImage + DEB)

**Build Requirements:**
- Automated icon generation (16x16 to 1024x1024)
- Code signing support (optional, warn users about SmartScreen)
- Auto-updater integration (optional)
- Minimal dependencies
- Single executable distribution

**Icon Assets (assets/ folder):**
- icon.ico (Windows)
- icon.icns (macOS)
- icon.png (Linux, 512x512)
- Multiple PNG sizes (16, 24, 32, 48, 64, 128, 256, 512, 1024)

### 9. Security & Privacy

**Requirements:**
- No telemetry or analytics
- All data stored locally
- No external API calls (except AI websites)
- Sandboxed browser contexts
- Secure IPC communication
- No code injection into user's system
- Respect AI platform terms of service

**User-Agent Spoofing:**
```javascript
// Use real Chrome version from Chromium build
const chromeVersion = process.versions.chrome || '122.0.0.0';
const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
```

### 10. Error Handling

**Required Error Handling:**
- Page load failures (show error message, retry button)
- Network errors (offline detection, reconnect)
- Certificate errors (auto-accept for corporate proxies)
- Injection failures (log to console, show user notification)
- File attachment failures (fallback to text-only)
- OAuth popup blocking (show instructions)
- Crash recovery (restore last session)

**Logging:**
- Console logging for debugging
- Error reporting to user (non-intrusive notifications)
- No crash reports sent externally

## Implementation Recommendations

### For CEF (C++/C#):
1. Use CefSharp for Windows (.NET bindings)
2. Create CefBrowser instance for each panel
3. Use CefRequestHandler to modify headers
4. Implement ICefLifeSpanHandler for popup management
5. Use CefDevToolsMessageObserver for CDP access
6. Create WPF/WinForms UI for control panel

### For Puppeteer/Playwright:
1. Launch persistent browser contexts for each panel
2. Use `page.evaluateHandle()` for injection scripts
3. Use `page.on('request')` to intercept and modify headers
4. Create Electron-like window with HTML/CSS/JS
5. Use IPC via WebSocket or HTTP server
6. Package with pkg or nexe

### For Native Chromium:
1. Build Chromium from source with custom patches
2. Use Content API for embedding
3. Implement custom RenderProcessHost
4. Create native UI with Qt/GTK
5. Maximum control but highest complexity

## Testing Requirements

**Manual Testing Checklist:**
- [ ] All 8 AI panels load correctly
- [ ] Login persists across restarts
- [ ] Prompt broadcasting works for all panels
- [ ] File attachment works (test with image and PDF)
- [ ] OAuth popups work (Google, Microsoft)
- [ ] Horizontal scrolling is smooth
- [ ] Tab drag-and-drop reordering works
- [ ] Panel enable/disable works
- [ ] Settings save and restore correctly
- [ ] Reset tab clears session
- [ ] Reset application clears all data
- [ ] Window size/position persists
- [ ] Keyboard shortcuts work (Enter to send, Shift+Enter for newline)
- [ ] No memory leaks after 1 hour of use
- [ ] CPU usage is reasonable (<10% idle)

## Performance Targets

- **Startup time**: < 3 seconds
- **Memory usage**: < 2GB with 8 panels loaded
- **CPU usage (idle)**: < 5%
- **CPU usage (active)**: < 30%
- **Scroll latency**: < 16ms (60 FPS)
- **Injection latency**: < 1 second

## Deliverables

1. **Source Code:**
   - Main application code (C++/C#/Node.js)
   - UI files (HTML/CSS/JS for control panel, toolbar, scrollbar)
   - Build scripts
   - Configuration files

2. **Documentation:**
   - README.md with installation instructions
   - CONTRIBUTING.md with development setup
   - CODE_SIGNING.md with signing instructions
   - RELEASE_GUIDE.md with release process

3. **Build Artifacts:**
   - Windows installer (NSIS)
   - macOS DMG
   - Linux AppImage
   - Portable executables

4. **Assets:**
   - Application icons (all sizes)
   - Screenshots for README
   - Demo video (optional)

## Key Differences from Electron

| Feature | Electron | Native Chromium |
|---------|----------|-----------------|
| **Process Model** | Main + Renderer | Custom multi-process |
| **API Access** | Node.js + Electron APIs | Native APIs + CDP |
| **Bundle Size** | ~150MB | ~80MB (CEF) / ~200MB (full Chromium) |
| **Startup Time** | 2-3s | 1-2s (CEF) / 3-5s (Puppeteer) |
| **Memory Usage** | Higher (Node.js overhead) | Lower (no Node.js) |
| **Development** | JavaScript/TypeScript | C++/C# or Node.js |
| **Debugging** | Chrome DevTools | Chrome DevTools + native debugger |
| **Updates** | electron-updater | Custom solution |
| **Packaging** | electron-builder | Custom build system |

## Additional Notes

- **OAuth Handling**: Critical for Google (Gemini) and Microsoft (Copilot). Popups must open as native windows with `window.opener` preserved.
- **Shadow DOM**: Gemini uses Shadow DOM extensively. CDP's `pierce: true` option is essential.
- **React Detection**: Many AI sites use React. Proper event dispatching (`bubbles: true, composed: true`) is required.
- **File Attachment**: Most fragile feature. Requires CDP, retry logic, and site-specific timing.
- **Performance**: 8 concurrent Chromium instances is resource-intensive. Consider lazy loading offscreen panels.
- **Updates**: Chromium updates frequently. Plan for regular Chromium version bumps.

## Success Criteria

The application is successful if:
1. All 8 AI panels load and function identically to their native websites
2. Prompt broadcasting works reliably (>95% success rate)
3. File attachments work for at least 6/8 platforms
4. OAuth login works for Google and Microsoft
5. Sessions persist across restarts
6. No crashes during normal use (8 hours continuous)
7. Memory usage stays under 2GB
8. Users can build and run from source without issues

---

**End of Specification**

This prompt provides complete technical specifications to rebuild TabSyncerAI using native Chromium instead of Electron. Choose your implementation approach (CEF, Puppeteer, or native) based on your language preference and performance requirements.
