# Changelog

All notable changes to TabSyncerAI will be documented in this file.

## [2.0.0] - 2025-02-24

### Added
- 🎉 **Multi-Platform Support** - Full support for Windows, macOS, and Linux
- 📦 **macOS Packages** - DMG and ZIP distributions
- 🐧 **Linux Packages** - AppImage and DEB distributions
- 🔧 **Automated Releases** - GitHub Actions workflow for all platforms
- 📝 **Enhanced Documentation** - Platform-specific installation guides

### Changed
- Improved build configuration for cross-platform compatibility
- Updated electron-builder to latest version (26.8.1)
- Enhanced package metadata with proper author and maintainer info
- Optimized build process for faster releases

### Fixed
- macOS code signing issues (disabled for unsigned builds)
- Linux .deb package creation (added required maintainer field)
- Cross-platform build compatibility issues
- GitHub Actions permissions for release creation

### Technical
- Disabled hardened runtime for macOS (no code signing required)
- Added system dependencies for Linux builds
- Improved workflow with separate build jobs per platform
- Added comprehensive error handling in CI/CD pipeline

## [1.0.0] - 2025-02-24

### Added
- 🎯 **Multi-Panel AI Workspace** - Side-by-side AI websites in a unified interface
- 📡 **Prompt Broadcasting** - Send messages to multiple AI services simultaneously
- 🤖 **AI Platform Support** - ChatGPT, Gemini, Claude, DeepSeek, Grok, Copilot, Perplexity, Mistral
- 📎 **File Upload Support** - Attach images and documents to prompts
- 💾 **Persistent Sessions** - Login sessions survive app restarts
- 🎨 **Customizable Interface** - Adjustable panel widths and layouts
- 🔄 **Drag & Drop Reordering** - Rearrange panels to your preference
- 💬 **Chat-Style Control Panel** - Messenger-like interface with message history
- ⚙️ **JSON Configuration** - Easy panel management via config.json
- 🔒 **Secure Architecture** - Modern Electron with WebContentsView API
- 🌐 **Cross-Platform Support** - Windows, macOS, and Linux builds
- 📱 **Responsive Design** - Adaptive layout for different screen sizes
- 🎯 **Individual Panel Controls** - Enable/disable, reload, reset each panel
- 💫 **Smooth Scrolling** - Horizontal panel navigation with scroll indicators
- 🔧 **State Persistence** - Window size and panel states automatically saved

### Technical Features
- Built with Electron 33.2.0
- Modern WebContentsView API (replaces deprecated BrowserView)
- Secure IPC communication via contextBridge
- Persistent session management with separate partitions
- Automatic state saving and restoration
- Cross-platform icon support (ICO, ICNS, PNG)
- NSIS installer for Windows with desktop shortcuts
- DMG packaging for macOS with drag-to-Applications
- AppImage and DEB packages for Linux

### Developer Experience
- MIT License for open source distribution
- Comprehensive documentation and setup guides
- GitHub Actions for automated releases
- Issue templates for bug reports and feature requests
- Contributing guidelines and code of conduct
- Security policy for responsible disclosure

[2.0.0]: https://github.com/lexical-ani/TabSyncerAI/releases/tag/v2.0.0
[1.0.0]: https://github.com/lexical-ani/TabSyncerAI/releases/tag/v1.0.0
