/**
 * AI Wall — Panel Preload (Minimal)
 *
 * Injected into each AI panel view. ONLY purpose:
 * capture horizontal scroll gestures (Shift+Wheel or trackpad horizontal)
 * and forward them to the main process for panel scrolling.
 *
 * Does NOT expose any API to the web page — fully isolated.
 */

const { ipcRenderer, webFrame } = require('electron');

// --- Kill Passkey / Windows Hello Prompt in the Main World ---
// This safely bypasses Google's strict "Choose Passkey" loop by pretending the browser doesn't support them.
webFrame.executeJavaScript(`
    window.PublicKeyCredential = undefined;
    if (window.navigator && window.navigator.credentials) {
        window.navigator.credentials.get = function() { return Promise.reject(new Error("Passkeys disabled")); };
        window.navigator.credentials.create = function() { return Promise.reject(new Error("Passkeys disabled")); };
    }
`);

let pendingDelta = 0;
let ticking = false;

window.addEventListener('wheel', (e) => {
    const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const isShiftScroll = e.shiftKey;

    // Only intercept horizontal gestures or Shift+Wheel
    if (!isHorizontal && !isShiftScroll) return;

    // Scale delta for smooth tracking
    const delta = isHorizontal ? e.deltaX : e.deltaY;

    pendingDelta += delta;

    if (!ticking) {
        window.requestAnimationFrame(() => {
            if (pendingDelta !== 0) {
                // Send continuous pixel delta
                ipcRenderer.send('panel-horizontal-scroll', pendingDelta);
                pendingDelta = 0;
            }
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });
