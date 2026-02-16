import { activeWindow } from "active-win";
import { matchMonitoredService, type MonitorServiceName } from "./services";

export async function detectFocusedService(): Promise<MonitorServiceName | null> {
  const currentWindow = await activeWindow();
  if (!currentWindow) return null;

  const ownerName = currentWindow.owner?.name ?? "";
  const ownerPath = currentWindow.owner?.path ?? "";
  const title = currentWindow.title ?? "";

  return matchMonitoredService({ title, ownerName, ownerPath });
}
