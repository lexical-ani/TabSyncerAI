/**
 * AI Wall — Preload Script
 *
 * Exposes safe IPC channels to the renderer process
 * via the contextBridge API.
 */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('aiWall', {
    // Reveal absolute local file path for File objects
    getFilePath: (file) => webUtils.getPathForFile(file),

    // Send a prompt to selected panels
    sendPrompt: (prompt, selectedPanelIds, filePath) =>
        ipcRenderer.invoke('send-prompt', prompt, selectedPanelIds, filePath),

    // Reload a specific panel
    reloadPanel: (panelId) =>
        ipcRenderer.invoke('reload-panel', panelId),

    // Navigate back
    navigateBack: (panelId) =>
        ipcRenderer.invoke('navigate-back', panelId),

    // Navigate to a new URL
    navigateUrl: (panelId, url) =>
        ipcRenderer.invoke('navigate-url', panelId, url),

    // Start fresh chat
    startFreshChat: (panelId) =>
        ipcRenderer.invoke('start-fresh-chat', panelId),

    // Toggle panel width (1x or 2x)
    togglePanelWidth: (panelId) =>
        ipcRenderer.invoke('toggle-panel-width', panelId),

    // Toggle fullscreen mode
    toggleFullscreen: (panelId) =>
        ipcRenderer.invoke('toggle-fullscreen', panelId),

    // Toggle panel enabled/disabled
    togglePanel: (panelId, enabled) =>
        ipcRenderer.invoke('toggle-panel', panelId, enabled),

    // Get panel configuration
    getPanels: () =>
        ipcRenderer.invoke('get-panels'),

    // Save and apply new configurations (width, re-ordering)
    saveConfig: (updates) =>
        ipcRenderer.invoke('save-config', updates),

    // Fully reset the application state
    resetPanels: () =>
        ipcRenderer.invoke('reset-panels'),

    // Reset a single tab's data
    resetTab: (panelId) =>
        ipcRenderer.invoke('reset-tab', panelId),

    // Scroll panels (continuous pixels)
    scrollPanels: (deltaX) =>
        ipcRenderer.invoke('scroll-panels', deltaX),

    // Jump to a specific scroll fraction (0 to 1)
    scrollToFraction: (fraction) =>
        ipcRenderer.invoke('scroll-to-fraction', fraction),

    // Get current scroll state
    getScrollState: () =>
        ipcRenderer.invoke('get-scroll-state'),

    // Listen for panel info updates
    onPanelInfo: (callback) =>
        ipcRenderer.on('panel-info', (_e, panels) => callback(panels)),

    // Listen for toolbar info updates
    onToolbarInfo: (callback) =>
        ipcRenderer.on('toolbar-info', (_e, panels) => callback(panels)),

    // Listen for scroll state updates
    onScrollState: (callback) =>
        ipcRenderer.on('scroll-state', (_e, state) => callback(state))
});
