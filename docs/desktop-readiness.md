# Aillame Desktop Readiness & Boot Strategy

This document outlines the foundation for Aillame's transition to a Desktop App / Local AI Hub.

## 1. Local Server Boot Flow
When packaged as a desktop application (e.g., using Tauri or Electron), the Aillame node server will be launched in the background.
- The desktop shell must check `http://127.0.0.1:<PORT>/api/aillame/health` before showing the UI.
- If health check fails or returns degraded status, the desktop app should show a loading/diagnostic screen.

## 2. API Base URL
- Development: `http://localhost:3000`
- Production Desktop: The app will read the dynamically assigned port from the local server process or an IPC channel.

## 3. Background/Tray App
Aillame is designed to run persistently in the background.
- It will feature a system tray icon for quick access to status, memory, and settings.
- The UI can be completely closed while the local server continues serving external API requests.

## 4. Production Secret Handling
- Desktop builds will NOT package `.env` with raw secrets.
- Any required user API keys will be requested via the UI and stored securely in the local OS keychain (e.g., via `keytar` or Tauri secure storage plugin).
- The Local AI Hub server will read these secrets securely at runtime.

## 5. Windows Path Notes
- All path interactions (for models, datasets, etc.) must use `path.join` and `path.normalize` to avoid Windows/Unix separator issues.
- Project scanner already accounts for Windows drives.

## 6. Desktop Packaging Later Checklist
- [ ] Configure Tauri/Electron builder
- [ ] Setup secure keychain plugin
- [ ] Implement local server child-process management
- [ ] Add auto-updater foundation
- [ ] Test completely offline mode
