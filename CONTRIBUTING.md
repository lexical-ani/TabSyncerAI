# Contributing to TabSyncerAI

Thank you for your interest in contributing to TabSyncerAI! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Electron version, etc.)

### Suggesting Features

We love new ideas! Open an issue with:
- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/TabSyncerAI.git
cd TabSyncerAI

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build
```

### Code Style

- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns
- Test your changes before submitting

### Adding New AI Platforms

To add support for a new AI platform:

1. Add the platform to `config.json`:
```json
{
  "id": "newai",
  "label": "New AI",
  "url": "https://newai.com",
  "enabled": true,
  "color": "#ff6b35"
}
```

2. Add platform-specific injection scripts in `src/main.js`:
```javascript
if (panelId === 'newai') {
  return {
    fillScript: `...`,
    submitScript: `...`
  };
}
```

3. Test thoroughly with text and file uploads

## Questions?

Feel free to open an issue for any questions or discussions!
