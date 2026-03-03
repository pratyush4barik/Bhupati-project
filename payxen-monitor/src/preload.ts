import { contextBridge, ipcRenderer } from "electron";
import type { ActiveServiceUsageCard, RuntimeStatus } from "./core/types";

const api = {
  getState: () => ipcRenderer.invoke("monitor:get-state") as Promise<RuntimeStatus>,
  setTrackingEnabled: (enabled: boolean) =>
    ipcRenderer.invoke("monitor:set-tracking-enabled", enabled) as Promise<RuntimeStatus>,
  setPaused: (paused: boolean) =>
    ipcRenderer.invoke("monitor:set-paused", paused) as Promise<RuntimeStatus>,
  setAutoStart: (enabled: boolean) =>
    ipcRenderer.invoke("monitor:set-auto-start", enabled) as Promise<RuntimeStatus>,
  setConsentAccepted: (accepted: boolean) =>
    ipcRenderer.invoke("monitor:set-consent-accepted", accepted) as Promise<RuntimeStatus>,
  connectWithToken: (payload: { backendBaseUrl: string; token: string }) =>
    ipcRenderer.invoke("monitor:connect-with-token", payload) as Promise<RuntimeStatus>,
  loginWithEmail: (payload: { backendBaseUrl: string; email: string; password: string }) =>
    ipcRenderer.invoke("monitor:login-email", payload) as Promise<RuntimeStatus>,
  loginWithGoogle: (payload: { backendBaseUrl: string }) =>
    ipcRenderer.invoke("monitor:login-google", payload) as Promise<RuntimeStatus>,
  disconnectAccount: () =>
    ipcRenderer.invoke("monitor:disconnect-account") as Promise<RuntimeStatus>,
  deleteLocalData: (serviceName?: ActiveServiceUsageCard["serviceName"]) =>
    ipcRenderer.invoke("monitor:delete-local-data", serviceName) as Promise<RuntimeStatus>,
  refreshActiveServices: () =>
    ipcRenderer.invoke("monitor:refresh-active-services") as Promise<RuntimeStatus>,
  onStatus: (callback: (status: RuntimeStatus) => void) => {
    const listener = (_event: unknown, status: RuntimeStatus) => callback(status);
    ipcRenderer.on("monitor:status", listener);
    return () => ipcRenderer.removeListener("monitor:status", listener);
  },
  openExternal: (url: string) => ipcRenderer.invoke("monitor:open-external", url) as Promise<void>,
  quitApp: () => ipcRenderer.invoke("monitor:quit-app") as Promise<void>,
};

contextBridge.exposeInMainWorld("payxenMonitor", api);
