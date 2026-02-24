# ⚡ TabSyncerAI

> **Multi-panel AI browser workspace** — broadcast prompts to ChatGPT, Gemini, Claude, DeepSeek, Grok, Copilot, Perplexity, Mistral, and more, all in one window.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-33.2.0-blue.svg)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/yourusername/TabSyncerAI)

---

## 📥 Installation

### Option 1: Download Pre-built Binary (Recommended)

1. Go to the [Releases](https://github.com/yourusername/TabSyncerAI/releases) page
2. Download the latest version for your platform:
   - **Windows**: `TabSyncerAI-Setup-1.0.0.exe` (installer) or `TabSyncerAI-1.0.0-portable.exe` (portable)
   - **macOS**: `TabSyncerAI-1.0.0.dmg`
   - **Linux**: `TabSyncerAI-1.0.0.AppImage` or `tabsyncerai_1.0.0_amd64.deb`
3. Run the installer and follow the prompts

**Note for Windows users**: You may see a SmartScreen warning because the app is not code-signed (certificates cost $400/year). This is normal for free open-source software. Click "More info" → "Run anyway". See [Installation Guide](INSTALLATION_GUIDE.md) for details.

### Option 2: Build from Source

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Launch the app
npm start
```

## 📦 Build for Distribution

```bash
# Build for your current platform
npm run build

# Platform-specific builds
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

The built application will be in the `dist/` folder.

## 💡 Usage

1. **Launch TabSyncerAI** - Open the application
2. **Login to AI Services** - Click on each panel and login to your AI accounts
3. **Select Targets** - Check the AI services you want to send prompts to
4. **Type Your Prompt** - Enter your message in the control panel
5. **Attach Files (Optional)** - Click the 📎 button to attach images or documents
6. **Send** - Click send or press Enter to broadcast to all selected AIs
7. **Customize** - Click ⚙️ to adjust panel widths, reorder tabs, or reset sessions

## 🎯 Features

- **Multi-Panel Layout** — Load multiple AI websites side-by-side as real browser views
- **Prompt Broadcasting** — Type once, send to all selected AI assistants simultaneously
- **File Upload Support** — Attach images and documents to your prompts (supported by most AI platforms)
- **Persistent Sessions** — Login once per AI site, sessions survive restarts
- **Individual Controls** — Reload, enable/disable, reset each panel independently
- **Drag & Drop Reordering** — Rearrange panels to your preference
- **Chat-Style UI** — Messenger-like control panel with message history
- **Configurable** — Add/remove AI panels via `config.json`
- **State Persistence** — Window size and panel states saved automatically
- **Cross-Platform** — Works on Windows, macOS, and Linux

## 🤖 Supported AI Platforms

- **ChatGPT** (OpenAI)
- **Gemini** (Google)
- **Claude** (Anthropic)
- **Copilot** (Microsoft)
- **Grok** (xAI)
- **DeepSeek**
- **Perplexity**
- **Mistral**
- ...and easily add more!

## ⚙️ Configuration

Edit `config.json` to customize panels:

```json
{
  "panelWidth": 420,
  "controlPanelWidth": 340,
  "panels": [
    { "id": "chatgpt", "label": "ChatGPT", "url": "https://chat.openai.com", "enabled": true, "color": "#10a37f" },
    { "id": "gemini", "label": "Gemini", "url": "https://gemini.google.com", "enabled": true, "color": "#4285f4" },
    { "id": "deepseek", "label": "DeepSeek", "url": "https://chat.deepseek.com", "enabled": true, "color": "#6c5ce7" },
    { "id": "grok", "label": "Grok", "url": "https://grok.x.ai", "enabled": true, "color": "#e74c3c" }
  ],
  "selectors": {
    "chatgpt": "textarea, #prompt-textarea, [contenteditable='true']",
    "gemini": "textarea, .ql-editor, [contenteditable='true']",
    "deepseek": "textarea, #chat-input, [contenteditable='true']",
    "grok": "textarea, [contenteditable='true']"
  }
}
```

### Adding a New Panel

Add a new entry to the `panels` array:

```json
{ "id": "claude", "label": "Claude", "url": "https://claude.ai", "enabled": true, "color": "#d97706" }
```

Optionally add a custom selector in the `selectors` object.

## 🏗️ Architecture

```
src/
├── main.js              # Electron main process — window & BrowserView management
├── preload.js           # Secure IPC bridge via contextBridge
└── ui/
    ├── base.html        # Main window background
    ├── toolbar.html     # Top toolbar with panel tabs, reload, toggle
    └── control-panel.html  # Right sidebar — prompt input, chat history
```

## 🔐 Session Handling

Each AI panel uses a persistent Electron partition (`persist:<id>`), so your login sessions survive app restarts. Data is stored in the Electron `userData` directory.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please open an issue on GitHub!

## 📸 Screenshots

<!-- Add screenshots here -->

## 🛣️ Roadmap

- [ ] Custom keyboard shortcuts
- [ ] Export chat history
- [ ] Theme customization
- [ ] Plugin system for custom AI platforms
- [ ] Cloud sync for settings
- [ ] Mobile companion app

## ⚠️ Disclaimer

TabSyncerAI is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI, Google, Anthropic, Microsoft, xAI, or any other AI service provider. All trademarks belong to their respective owners.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Inspired by the need for efficient multi-AI workflows
- Thanks to all contributors!

## 💬 Community

- GitHub Issues: Bug reports and feature requests
- Discussions: Share ideas and ask questions

---

Made with ⚡ by the TabSyncerAI community
