# Prompt: Build TabSyncerAI with Chromium Browser (Not Electron)

## Project Overview

Create a desktop application similar to TabSyncerAI that allows users to broadcast prompts to multiple AI services simultaneously, but built using **Chromium browser** instead of Electron. The application should be a native desktop app that embeds Chromium for rendering web content.

## Core Requirements

### 1. Technology Stack

**Primary Framework Options:**
- **CEF (Chromium Embedded Framework)** - C++ based
- **CefSharp** - .NET/C# wrapper for CEF (Windows)
- **WebView2** - Microsoft Edge WebView2 (Windows only, Chromium-based)
- **Qt WebEngine** - Qt framework with Chromium
- **Tauri** - Rust-based with system WebView (uses Chromium on Windows via WebView2)

**Recommended:** Use **Tauri** or **CefSharp** for easier development.

### 2. Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Main Window                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Toolbar (Panel Tabs)                            │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  ┌────────┬────────┬────────┬─────────────────┐ │  │
│  │  │ Panel1 │ Panel2 │ Panel3 │  Control Panel  │ │  │
│  │  │ChatGPT │ Gemini │ Claude │                 │ │  │
│  │  │        │        │        │  [Prompt Input] │ │  │
│  │  │        │        │        │  [Send Button]  │ │  │
│  │  │        │        │        │  [File Attach]  │ │  │
│  │  └────────┴────────┴────────┴─────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3. Core Features to Implement

#### A. Multi-Panel Browser Views
- Create multiple Chromium browser instances/views
- Each panel loads a different AI service URL:
  - ChatGPT: https://chatgpt.com
  - Gemini: https://gemini.google.com/app
  - Claude: https://claude.ai
  - Copilot: https://copilot.microsoft.com
  - Grok: https://grok.x.ai
  - DeepSeek: https://chat.deepseek.com
  - Perplexity: https://www.perplexity.ai
  - Mistral: https://chat.mistral.ai

#### B. Prompt Broadcasting System
- Input field in control panel
- Send button to broadcast to selected panels
- JavaScript injection to fill input fields on each AI site
- Automatic form submission after filling

#### C. File Upload Support
- File picker for images/documents
- Inject files into each AI panel's file input
- Support for multiple file formats (PNG, JPG, PDF, etc.)

#### D. Session Persistence
- Separate cookie/session storage per panel
- Persistent login sessions across app restarts
- Use Chromium's profile/partition system

#### E. Panel Management
- Enable/disable individual panels
- Drag-to-reorder panels
- Reload individual panels
- Reset panel sessions (clear cookies/cache)

#### F. UI Components
- Top toolbar with panel tabs
- Horizontal scrolling for multiple panels
- Right sidebar control panel
- Settings overlay

## Detailed Implementation Guide

### Phase 1: Project Setup

#### Option A: Using Tauri (Recommended for Cross-Platform)

**1. Install Prerequisites:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (for frontend)
# Download from nodejs.org

# Install Tauri CLI
cargo install tauri-cli
```

**2. Create Project:**
```bash
npm create tauri-app@latest
# Choose:
# - Project name: tabsyncerai-chromium
# - Frontend: Vanilla (or React/Vue if preferred)
# - Package manager: npm
```

**3. Project Structure:**
```
tabsyncerai-chromium/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs      # Main application logic
│   │   ├── panels.rs    # Panel management
│   │   └── injection.rs # JavaScript injection
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                 # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── main.js
│   ├── styles.css
│   └── components/
│       ├── toolbar.js
│       ├── control-panel.js
│       └── settings.js
└── package.json
```

#### Option B: Using CefSharp (Windows, C#/.NET)

**1. Install Prerequisites:**
```bash
# Install Visual Studio 2022 with .NET Desktop Development
# Install .NET 6.0 or later SDK
```

**2. Create Project:**
```bash
dotnet new wpf -n TabSyncerAI.Chromium
cd TabSyncerAI.Chromium
dotnet add package CefSharp.Wpf --version 120.0.0
```

**3. Project Structure:**
```
TabSyncerAI.Chromium/
├── MainWindow.xaml       # Main UI layout
├── MainWindow.xaml.cs    # Main window logic
├── Models/
│   ├── PanelConfig.cs    # Panel configuration
│   └── AIPanel.cs        # Panel model
├── Services/
│   ├── PanelManager.cs   # Manage multiple panels
│   ├── InjectionService.cs # JavaScript injection
│   └── SessionManager.cs # Session persistence
├── Views/
│   ├── ToolbarView.xaml
│   ├── ControlPanelView.xaml
│   └── SettingsView.xaml
└── App.xaml
```

### Phase 2: Core Implementation

#### 1. Main Window Setup

**Tauri (Rust):**
```rust
// src-tauri/src/main.rs
use tauri::{Manager, Window};
use tauri::window::WindowBuilder;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Create main window
            let main_window = WindowBuilder::new(
                app,
                "main",
                tauri::WindowUrl::App("index.html".into())
            )
            .title("TabSyncerAI")
            .inner_size(1920.0, 1080.0)
            .min_inner_size(800.0, 600.0)
            .build()?;

            // Create panel windows (webviews)
            create_ai_panels(app)?;
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            send_prompt,
            reload_panel,
            toggle_panel,
            upload_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**CefSharp (C#):**
```csharp
// MainWindow.xaml.cs
using CefSharp;
using CefSharp.Wpf;

public partial class MainWindow : Window
{
    private List<ChromiumWebBrowser> aiPanels = new List<ChromiumWebBrowser>();
    
    public MainWindow()
    {
        InitializeComponent();
        InitializeCef();
        CreateAIPanels();
    }
    
    private void InitializeCef()
    {
        var settings = new CefSettings()
        {
            CachePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TabSyncerAI", "Cache"
            )
        };
        
        Cef.Initialize(settings);
    }
    
    private void CreateAIPanels()
    {
        var panelConfigs = new[]
        {
            new { Id = "chatgpt", Url = "https://chatgpt.com" },
            new { Id = "gemini", Url = "https://gemini.google.com/app" },
            new { Id = "claude", Url = "https://claude.ai" },
            // ... more panels
        };
        
        foreach (var config in panelConfigs)
        {
            var browser = new ChromiumWebBrowser(config.Url)
            {
                RequestContext = new RequestContext(
                    new RequestContextSettings
                    {
                        CachePath = Path.Combine(
                            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                            "TabSyncerAI", "Profiles", config.Id
                        )
                    }
                )
            };
            
            aiPanels.Add(browser);
            PanelContainer.Children.Add(browser);
        }
    }
}
```

#### 2. JavaScript Injection for Prompt Broadcasting

**Tauri:**
```rust
// src-tauri/src/injection.rs
use tauri::Window;

#[tauri::command]
pub async fn send_prompt(
    window: Window,
    prompt: String,
    panel_ids: Vec<String>,
    file_path: Option<String>
) -> Result<String, String> {
    for panel_id in panel_ids {
        let script = generate_injection_script(&panel_id, &prompt);
        
        // Execute JavaScript in the panel's webview
        window.eval(&script)
            .map_err(|e| e.to_string())?;
        
        // If file is attached, inject it
        if let Some(ref path) = file_path {
            inject_file(&window, &panel_id, path).await?;
        }
        
        // Submit the form
        let submit_script = generate_submit_script(&panel_id);
        window.eval(&submit_script)
            .map_err(|e| e.to_string())?;
    }
    
    Ok("Success".to_string())
}

fn generate_injection_script(panel_id: &str, prompt: &str) -> String {
    match panel_id {
        "chatgpt" => format!(r#"
            (function() {{
                const el = document.querySelector('#prompt-textarea') || 
                           document.querySelector('textarea');
                if (el) {{
                    el.value = '{}';
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                }}
            }})();
        "#, prompt),
        
        "gemini" => format!(r#"
            (function() {{
                const el = document.querySelector('.ql-editor[contenteditable="true"]');
                if (el) {{
                    el.innerText = '{}';
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                }}
            }})();
        "#, prompt),
        
        // Add more AI services...
        _ => String::new()
    }
}
```

**CefSharp:**
```csharp
// Services/InjectionService.cs
public class InjectionService
{
    public async Task<bool> SendPrompt(
        ChromiumWebBrowser browser,
        string panelId,
        string prompt,
        string filePath = null)
    {
        // Fill input field
        var fillScript = GenerateFillScript(panelId, prompt);
        await browser.EvaluateScriptAsync(fillScript);
        
        // Inject file if provided
        if (!string.IsNullOrEmpty(filePath))
        {
            await InjectFile(browser, panelId, filePath);
        }
        
        // Wait a moment
        await Task.Delay(700);
        
        // Submit
        var submitScript = GenerateSubmitScript(panelId);
        await browser.EvaluateScriptAsync(submitScript);
        
        return true;
    }
    
    private string GenerateFillScript(string panelId, string prompt)
    {
        var escapedPrompt = prompt.Replace("'", "\\'");
        
        return panelId switch
        {
            "chatgpt" => $@"
                (function() {{
                    const el = document.querySelector('#prompt-textarea') || 
                               document.querySelector('textarea');
                    if (el) {{
                        const setter = Object.getOwnPropertyDescriptor(
                            HTMLTextAreaElement.prototype, 'value'
                        ).set;
                        setter.call(el, '{escapedPrompt}');
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    }}
                }})();
            ",
            
            "gemini" => $@"
                (function() {{
                    const el = document.querySelector('.ql-editor[contenteditable=""true""]');
                    if (el) {{
                        el.innerText = '{escapedPrompt}';
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    }}
                }})();
            ",
            
            // Add more services...
            _ => ""
        };
    }
    
    private async Task InjectFile(
        ChromiumWebBrowser browser,
        string panelId,
        string filePath)
    {
        // Use DevTools Protocol to inject file
        var devToolsClient = browser.GetDevToolsClient();
        
        // Enable DOM
        await devToolsClient.DOM.EnableAsync();
        
        // Find file input
        var document = await devToolsClient.DOM.GetDocumentAsync();
        var fileInputs = await devToolsClient.DOM.QuerySelectorAllAsync(
            document.Root.NodeId,
            "input[type='file']"
        );
        
        if (fileInputs.NodeIds.Length > 0)
        {
            // Set files
            await devToolsClient.DOM.SetFileInputFilesAsync(
                new[] { filePath },
                fileInputs.NodeIds[0]
            );
        }
    }
}
```

#### 3. Panel Management

**Configuration File (config.json):**
```json
{
  "panelWidth": 390,
  "controlPanelWidth": 340,
  "panels": [
    {
      "id": "chatgpt",
      "label": "ChatGPT",
      "url": "https://chatgpt.com",
      "color": "#10a37f",
      "enabled": true
    },
    {
      "id": "gemini",
      "label": "Gemini",
      "url": "https://gemini.google.com/app",
      "color": "#4285f4",
      "enabled": true
    },
    {
      "id": "claude",
      "label": "Claude",
      "url": "https://claude.ai",
      "color": "#d97706",
      "enabled": true
    }
  ]
}
```

**Panel Manager (Rust/Tauri):**
```rust
// src-tauri/src/panels.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PanelConfig {
    pub id: String,
    pub label: String,
    pub url: String,
    pub color: String,
    pub enabled: bool,
}

pub struct PanelManager {
    panels: HashMap<String, PanelConfig>,
}

impl PanelManager {
    pub fn new() -> Self {
        let config = load_config();
        let mut panels = HashMap::new();
        
        for panel in config.panels {
            panels.insert(panel.id.clone(), panel);
        }
        
        Self { panels }
    }
    
    pub fn get_enabled_panels(&self) -> Vec<&PanelConfig> {
        self.panels
            .values()
            .filter(|p| p.enabled)
            .collect()
    }
    
    pub fn toggle_panel(&mut self, id: &str, enabled: bool) {
        if let Some(panel) = self.panels.get_mut(id) {
            panel.enabled = enabled;
        }
    }
}
```

#### 4. UI Components

**Control Panel (HTML/CSS/JS):**
```html
<!-- src/control-panel.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        .control-panel {
            width: 340px;
            height: 100vh;
            background: #111117;
            display: flex;
            flex-direction: column;
            border-left: 1px solid rgba(255,255,255,0.1);
        }
        
        .header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .targets-section {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .target-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            cursor: pointer;
        }
        
        .input-area {
            padding: 16px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .prompt-textarea {
            width: 100%;
            min-height: 80px;
            background: #1c1c26;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: #e8e8f0;
            padding: 10px;
            font-family: inherit;
            resize: vertical;
        }
        
        .send-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #7c6aef, #6055cc);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="control-panel">
        <div class="header">
            <h1>TabSyncerAI</h1>
        </div>
        
        <div class="targets-section">
            <div id="targetList"></div>
        </div>
        
        <div class="input-area">
            <textarea 
                id="promptInput" 
                class="prompt-textarea"
                placeholder="Type your prompt here..."
            ></textarea>
            <button id="attachBtn">📎 Attach File</button>
            <button id="sendBtn" class="send-btn">Send to Selected AIs</button>
        </div>
    </div>
    
    <script src="control-panel.js"></script>
</body>
</html>
```

### Phase 3: Advanced Features

#### 1. Session Persistence

**Tauri:**
- Use separate data directories for each panel
- Configure in `tauri.conf.json`:
```json
{
  "tauri": {
    "allowlist": {
      "fs": {
        "scope": ["$APPDATA/TabSyncerAI/*"]
      }
    }
  }
}
```

**CefSharp:**
```csharp
// Each browser gets its own RequestContext with separate cache
var requestContext = new RequestContext(
    new RequestContextSettings
    {
        CachePath = Path.Combine(appDataPath, "Profiles", panelId),
        PersistSessionCookies = true,
        PersistUserPreferences = true
    }
);
```

#### 2. File Upload via DevTools Protocol

**Both platforms support Chrome DevTools Protocol (CDP):**
```javascript
// Use CDP to inject files
const client = await browser.getDevToolsClient();
await client.send('DOM.enable');
const doc = await client.send('DOM.getDocument');
const nodes = await client.send('DOM.querySelectorAll', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
});

if (nodes.nodeIds.length > 0) {
    await client.send('DOM.setFileInputFiles', {
        files: [filePath],
        nodeId: nodes.nodeIds[0]
    });
}
```

#### 3. Drag-to-Reorder Panels

**Frontend JavaScript:**
```javascript
// control-panel.js
let draggedPanel = null;

function enableDragReorder() {
    const panels = document.querySelectorAll('.panel-item');
    
    panels.forEach(panel => {
        panel.draggable = true;
        
        panel.addEventListener('dragstart', (e) => {
            draggedPanel = panel;
            e.dataTransfer.effectAllowed = 'move';
        });
        
        panel.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(e.clientY);
            if (afterElement) {
                panel.parentNode.insertBefore(draggedPanel, afterElement);
            } else {
                panel.parentNode.appendChild(draggedPanel);
            }
        });
        
        panel.addEventListener('dragend', () => {
            savePanelOrder();
        });
    });
}
```

### Phase 4: Building and Distribution

#### Tauri Build:
```bash
# Development
npm run tauri dev

# Production build
npm run tauri build

# Output: src-tauri/target/release/bundle/
# - Windows: .msi installer
# - macOS: .dmg
# - Linux: .AppImage, .deb
```

#### CefSharp Build:
```bash
# Build
dotnet publish -c Release -r win-x64 --self-contained

# Create installer with Inno Setup or WiX
# Output: bin/Release/net6.0-windows/win-x64/publish/
```

### Phase 5: Key Differences from Electron

| Aspect | Electron | Chromium (Tauri/CefSharp) |
|--------|----------|---------------------------|
| **Bundle Size** | ~150MB | ~50MB (Tauri), ~100MB (CefSharp) |
| **Memory Usage** | Higher | Lower |
| **Startup Time** | Slower | Faster |
| **Native APIs** | Node.js | Rust/C# |
| **WebView** | Bundled Chromium | System WebView (Tauri) or CEF |
| **Updates** | electron-updater | Tauri updater / ClickOnce |
| **Security** | IPC bridge | Command system / .NET interop |

### Phase 6: Testing Checklist

- [ ] All 8 AI panels load correctly
- [ ] Prompt broadcasting works to all selected panels
- [ ] File upload works on each platform
- [ ] Sessions persist across app restarts
- [ ] Panel enable/disable works
- [ ] Drag-to-reorder panels works
- [ ] Settings save and load correctly
- [ ] Memory usage is acceptable
- [ ] No crashes or freezes
- [ ] Cross-platform compatibility (if using Tauri)

## Complete Example Project Structure

```
tabsyncerai-chromium/
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── panels.rs            # Panel management
│   │   ├── injection.rs         # JS injection
│   │   ├── session.rs           # Session handling
│   │   └── commands.rs          # Tauri commands
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── src/                          # Frontend
│   ├── index.html               # Main window
│   ├── main.js                  # Main logic
│   ├── styles.css               # Global styles
│   ├── components/
│   │   ├── toolbar.html
│   │   ├── toolbar.js
│   │   ├── control-panel.html
│   │   ├── control-panel.js
│   │   ├── settings.html
│   │   └── settings.js
│   └── utils/
│       ├── injection-scripts.js # AI-specific scripts
│       └── api.js               # Tauri API wrapper
├── config.json                   # Panel configuration
├── package.json
└── README.md
```

## Summary

This prompt provides a complete blueprint for rebuilding TabSyncerAI using native Chromium instead of Electron. The key advantages are:

1. **Smaller bundle size** (50-100MB vs 150MB)
2. **Better performance** (lower memory, faster startup)
3. **Native integration** (Rust/C# instead of Node.js)
4. **More control** over Chromium behavior

Choose **Tauri** for cross-platform support or **CefSharp** for Windows-only with .NET ecosystem integration.
