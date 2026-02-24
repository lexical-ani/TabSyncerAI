# Changelog

All notable changes to TabSyncerAI will be documented in this file.

## [1.0.0] - 2025-02-24

### Added
- Initial release of TabSyncerAI (formerly AI Wall)
- Multi-panel AI browser workspace
- Support for 8 AI platforms: ChatGPT, Gemini, Claude, Copilot, Grok, DeepSeek, Perplexity, Mistral
- Prompt broadcasting to multiple AI services simultaneously
- File upload support (images, documents)
- Persistent login sessions
- Drag & drop panel reordering
- Individual panel controls (reload, enable/disable, reset)
- Chat-style control panel with message history
- Configurable panel widths and layouts
- State persistence across app restarts
- Cross-platform support (Windows, macOS, Linux)

### Fixed
- Settings page UI distortion issues
- File upload functionality for all platforms
- Send button detection for Copilot, Perplexity, Mistral, DeepSeek
- Gemini file upload with retry mechanism
- Button detection strategies for various AI platforms

### Technical
- Built with Electron 33.2.0
- Modern WebContentsView API
- CDP (Chrome DevTools Protocol) for file uploads
- Persistent Electron partitions for session management
- IPC communication for control panel
