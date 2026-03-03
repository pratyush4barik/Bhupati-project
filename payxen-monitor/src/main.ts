import path from "node:path";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from "electron";
import { MonitorController } from "./core/monitor-controller";
import type { ActiveServiceUsageCard } from "./core/types";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const controller = new MonitorController();

function getAppIcon() {
  // Try ICO first, then PNG, then fallback
  for (const ext of ["icon.ico", "icon.png"]) {
    const p = path.join(__dirname, "..", "..", "build", ext);
    try {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) return img;
    } catch { /* try next */ }
  }
  return nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIUlEQVQ4T2NkoBAwUqifYdQABhqG0QCsQYIhQxGoAAAOXwE6hO8fYQAAAABJRU5ErkJggg==",
  );
}

function createTray() {
  tray = new Tray(getAppIcon().resize({ width: 16, height: 16 }));
  tray.setToolTip("PayXen Monitor");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open PayXen Monitor",
        click: () => {
          if (!mainWindow || mainWindow.isDestroyed()) {
            createWindow();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: "Quit PayXen Monitor",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );

  tray.on("double-click", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    mainWindow.show();
    mainWindow.focus();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    title: "PayXen Monitor",
    icon: getAppIcon(),
    backgroundColor: "#09090b",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const htmlPath = path.join(__dirname, "..", "renderer", "index.html");
  void mainWindow.loadFile(htmlPath);

  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });

  /* Re-send current status whenever the window is brought back,
     so the renderer always has the latest connected/token state. */
  mainWindow.on("show", () => {
    emitStatusToRenderer();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function emitStatusToRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("monitor:status", controller.getRuntimeStatus());
}

function applyAutoStart(enabled: boolean) {
  app.setLoginItemSettings({ openAtLogin: enabled });
}

function validateBackendUrl(value: string) {
  try {
    const url = new URL(value);
    const isHttps = url.protocol === "https:";
    const isLocal = url.protocol === "http:" && url.hostname === "localhost";
    return isHttps || isLocal;
  } catch {
    return false;
  }
}

function registerIpcHandlers() {
  ipcMain.handle("monitor:get-state", () => controller.getRuntimeStatus());

  ipcMain.handle("monitor:set-tracking-enabled", (_event, enabled: boolean) => {
    controller.updateSettings({ trackingEnabled: Boolean(enabled) });
    return controller.getRuntimeStatus();
  });

  ipcMain.handle("monitor:set-paused", (_event, paused: boolean) => {
    controller.updateSettings({ isPaused: Boolean(paused) });
    return controller.getRuntimeStatus();
  });

  ipcMain.handle("monitor:set-auto-start", (_event, enabled: boolean) => {
    const value = Boolean(enabled);
    controller.updateSettings({ autoStart: value });
    applyAutoStart(value);
    return controller.getRuntimeStatus();
  });

  ipcMain.handle("monitor:set-consent-accepted", (_event, accepted: boolean) => {
    controller.updateSettings({ consentAccepted: Boolean(accepted) });
    return controller.getRuntimeStatus();
  });

  ipcMain.handle(
    "monitor:connect-with-token",
    async (_event, payload: { backendBaseUrl: string; token: string }) => {
      const backendBaseUrl = payload.backendBaseUrl.trim();
      if (!validateBackendUrl(backendBaseUrl)) {
        throw new Error("Backend URL must be HTTPS. Use http://localhost for local development.");
      }
      const state = await controller.connectWithToken({
        backendBaseUrl,
        token: payload.token,
      });
      return state;
    },
  );

  ipcMain.handle(
    "monitor:login-email",
    async (_event, payload: { backendBaseUrl: string; email: string; password: string }) => {
      const backendBaseUrl = payload.backendBaseUrl.trim();
      if (!validateBackendUrl(backendBaseUrl)) {
        throw new Error("Backend URL must be HTTPS. Use http://localhost for local development.");
      }
      const state = await controller.loginWithEmail({
        backendBaseUrl,
        email: payload.email,
        password: payload.password,
      });
      return state;
    },
  );

  ipcMain.handle(
    "monitor:login-google",
    async (_event, payload: { backendBaseUrl: string }) => {
      const backendBaseUrl = payload.backendBaseUrl.trim();
      if (!validateBackendUrl(backendBaseUrl)) {
        throw new Error("Backend URL must be HTTPS. Use http://localhost for local development.");
      }

      return new Promise<ReturnType<typeof controller.getRuntimeStatus>>((resolve, reject) => {
        const callbackUrl = new URL("/api/monitor/provision/google-callback", backendBaseUrl).toString();
        const googleStartUrl = new URL("/api/monitor/provision/google-start", backendBaseUrl);
        googleStartUrl.searchParams.set("callbackURL", callbackUrl);

        const authWin = new BrowserWindow({
          width: 520,
          height: 700,
          parent: mainWindow ?? undefined,
          modal: true,
          title: "Sign in with Google",
          backgroundColor: "#09090b",
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });
        authWin.setMenuBarVisibility(false);
        void authWin.loadURL(googleStartUrl.toString());

        let settled = false;

        /* Listen for the callback page that sets the document title */
        authWin.webContents.on("page-title-updated", (_titleEvent, title) => {
          if (!title.startsWith("PAYXEN_AUTH_RESULT:")) return;
          settled = true;
          try {
            const jsonStr = title.slice("PAYXEN_AUTH_RESULT:".length);
            const data = JSON.parse(jsonStr) as {
              token: string;
              expiresAt: string;
              user: { id: string; name: string; email: string; image: string | null };
            };
            const state = controller.connectWithProvisionResult({
              backendBaseUrl,
              token: data.token,
              user: data.user,
            });
            resolve(state);
          } catch (error) {
            reject(error instanceof Error ? error : new Error("Google login failed."));
          } finally {
            authWin.close();
          }
        });

        authWin.on("closed", () => {
          if (!settled) {
            reject(new Error("Google login was cancelled."));
          }
        });
      });
    },
  );

  ipcMain.handle("monitor:disconnect-account", () => {
    controller.disconnectAccount();
    return controller.getRuntimeStatus();
  });

  ipcMain.handle("monitor:delete-local-data", (_event, serviceName?: ActiveServiceUsageCard["serviceName"]) => {
    controller.deleteLocalData(serviceName);
    return controller.getRuntimeStatus();
  });

  ipcMain.handle("monitor:refresh-active-services", async () => {
    await controller.refreshActiveServices();
    return controller.getRuntimeStatus();
  });

  ipcMain.handle("monitor:open-external", async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle("monitor:quit-app", () => {
    isQuitting = true;
    app.quit();
  });
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  controller.on("status", emitStatusToRenderer);
  applyAutoStart(controller.getSettings().autoStart);
  controller.start();
  createTray();
  createWindow();
});

app.on("activate", () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  mainWindow.show();
  mainWindow.focus();
});

app.on("before-quit", () => {
  isQuitting = true;
  controller.stop();
});
