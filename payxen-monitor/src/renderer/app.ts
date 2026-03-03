type RuntimeStatus = {
  connected: boolean;
  backendBaseUrl: string;
  trackingEnabled: boolean;
  isPaused: boolean;
  autoStart: boolean;
  consentAccepted: boolean;
  currentService: string | null;
  lastSyncAt: string | null;
  syncState: "idle" | "syncing" | "offline" | "error";
  queueSize: number;
  trackingServiceStatus: "active" | "inactive";
  profile: { name: string; email: string; image: string | null } | null;
  activeServiceCards: Array<{
    id: string;
    serviceName: string;
    nextBillingDate: string;
    lastUsedAt: string | null;
    focusedMinutesToday: number;
    unsyncedMinutes: number;
  }>;
  todaySummary: Array<{ serviceName: string; minutes: number }>;
  syncError: string | null;
};

type MonitorApi = {
  getState: () => Promise<RuntimeStatus>;
  setTrackingEnabled: (enabled: boolean) => Promise<RuntimeStatus>;
  setPaused: (paused: boolean) => Promise<RuntimeStatus>;
  setAutoStart: (enabled: boolean) => Promise<RuntimeStatus>;
  setConsentAccepted: (accepted: boolean) => Promise<RuntimeStatus>;
  connectWithToken: (payload: { backendBaseUrl: string; token: string }) => Promise<RuntimeStatus>;
  loginWithEmail: (payload: { backendBaseUrl: string; email: string; password: string }) => Promise<RuntimeStatus>;
  loginWithGoogle: (payload: { backendBaseUrl: string }) => Promise<RuntimeStatus>;
  disconnectAccount: () => Promise<RuntimeStatus>;
  deleteLocalData: (serviceName?: string) => Promise<RuntimeStatus>;
  refreshActiveServices: () => Promise<RuntimeStatus>;
  onStatus: (callback: (status: RuntimeStatus) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
  quitApp: () => Promise<void>;
};

declare global {
  interface Window {
    payxenMonitor: MonitorApi;
  }
}

const api = window.payxenMonitor;

const serviceIcons: Record<string, string> = {
  Netflix: "N",
  "Amazon Prime": "A",
  "Disney+": "D",
  "HBO Max": "H",
  "Apple TV+": "TV",
  Spotify: "S",
  "Apple Music": "AM",
  "YouTube Music": "YT",
  Gaana: "G",
  JioSaavn: "JS",
  "Google One": "GO",
  "Microsoft 365": "M",
  Canva: "C",
  Notion: "N",
  ChatGPT: "AI",
  Xbox: "X",
  PlayStation: "P",
  Steam: "St",
  Coursera: "Co",
  Udemy: "U",
  MasterClass: "MC",
};

let latestState: RuntimeStatus | null = null;

function byId<T extends HTMLElement>(id: string) {
  return document.getElementById(id) as T | null;
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Never";
  }
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function syncStateText(syncState: RuntimeStatus["syncState"]) {
  switch (syncState) {
    case "syncing":
      return "Sync in progress...";
    case "offline":
      return "Offline mode: retrying automatically.";
    case "error":
      return "Sync error detected.";
    default:
      return "Sync engine ready.";
  }
}

function renderTodaySummary(rows: RuntimeStatus["todaySummary"]) {
  const list = byId<HTMLUListElement>("today-summary");
  if (!list) return;
  list.innerHTML = "";
  if (rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No focused usage recorded yet today.";
    list.appendChild(li);
    return;
  }
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = `<span style="flex:1">${row.serviceName}</span><span style="font-weight:500;color:#fafafa">${row.minutes} min</span>`;
    list.appendChild(li);
  });
}

function renderUsageCards(cards: RuntimeStatus["activeServiceCards"]) {
  const usageCards = byId<HTMLDivElement>("usage-cards");
  if (!usageCards) return;
  usageCards.innerHTML = "";
  if (cards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No active subscriptions found.";
    usageCards.appendChild(empty);
    return;
  }

  cards.forEach((card) => {
    const wrapper = document.createElement("article");
    wrapper.className = "usage-card";
    wrapper.innerHTML = `
      <div class="usage-top">
        <div class="app-chip">
          <span class="service-icon">${serviceIcons[card.serviceName] ?? "•"}</span>
          <span>${card.serviceName}</span>
        </div>
        <button class="icon-button service-clear" data-service="${card.serviceName}" title="Clear local unsynced data">✕</button>
      </div>
      <div class="row"><strong>Next Billing</strong> <span>${formatDate(card.nextBillingDate)}</span></div>
      <div class="row"><strong>Last Used</strong> <span>${formatDateTime(card.lastUsedAt)}</span></div>
      <div class="row"><strong>Focused Today</strong> <span>${card.focusedMinutesToday} min</span></div>
      <div class="row"><strong>Unsynced</strong> <span>${card.unsyncedMinutes} min</span></div>
    `;
    usageCards.appendChild(wrapper);
  });
}

function renderAuthView(state: RuntimeStatus) {
  const authForm = byId<HTMLDivElement>("auth-form");
  const authProfile = byId<HTMLDivElement>("auth-profile");
  const authConnecting = byId<HTMLParagraphElement>("auth-connecting");
  if (!authForm || !authProfile || !authConnecting) return;

  const connected = Boolean(state.profile && state.connected);
  authForm.classList.toggle("hidden", connected);
  authProfile.classList.toggle("hidden", !connected);
  authConnecting.classList.add("hidden");

  if (!connected || !state.profile) return;

  const profileImage = byId<HTMLImageElement>("profile-image");
  const profileGreeting = byId<HTMLParagraphElement>("profile-greeting");
  const profileEmail = byId<HTMLParagraphElement>("profile-email");
  if (!profileImage || !profileGreeting || !profileEmail) return;

  profileImage.src =
    state.profile.image ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' rx='28' fill='%2327272a'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%23a1a1aa' font-size='18' font-family='Segoe UI'%3E%3F%3C/text%3E%3C/svg%3E";
  profileGreeting.textContent = `Hi ${state.profile.name}`;
  profileEmail.textContent = state.profile.email;
}

function renderState(state: RuntimeStatus) {
  latestState = state;
  const serviceStateText = state.trackingServiceStatus === "active" ? "Active" : "Inactive";

  const connectionBadge = byId<HTMLSpanElement>("connection-badge");
  if (connectionBadge) {
    connectionBadge.textContent = state.connected ? "Connected" : "Disconnected";
    connectionBadge.style.color = state.connected ? "#4ade80" : "#71717a";
  }

  const sidebarServiceStatus = byId<HTMLParagraphElement>("sidebar-service-status");
  if (sidebarServiceStatus) {
    sidebarServiceStatus.textContent = `Tracking: ${serviceStateText}`;
  }

  const trackingServiceState = byId<HTMLSpanElement>("tracking-service-state");
  if (trackingServiceState) trackingServiceState.textContent = serviceStateText;

  const usageTrackingServiceState = byId<HTMLSpanElement>("usage-tracking-service-state");
  if (usageTrackingServiceState) usageTrackingServiceState.textContent = serviceStateText;

  const currentService = byId<HTMLSpanElement>("current-service");
  if (currentService) currentService.textContent = state.currentService ?? "Not tracking";

  const lastSync = byId<HTMLSpanElement>("last-sync");
  if (lastSync) lastSync.textContent = formatDateTime(state.lastSyncAt);

  const queueSize = byId<HTMLSpanElement>("queue-size");
  if (queueSize) queueSize.textContent = String(state.queueSize);

  const syncStatus = byId<HTMLParagraphElement>("sync-status");
  if (syncStatus) syncStatus.textContent = syncStateText(state.syncState);

  const toggleTracking = byId<HTMLButtonElement>("toggle-tracking");
  if (toggleTracking) toggleTracking.textContent = state.trackingEnabled ? "Turn Tracking Off" : "Turn Tracking On";

  const pauseTracking = byId<HTMLButtonElement>("pause-tracking");
  if (pauseTracking) {
    pauseTracking.textContent = state.isPaused ? "Resume Tracking" : "Pause Tracking";
    pauseTracking.disabled = !state.trackingEnabled;
  }

  const autoStart = byId<HTMLInputElement>("auto-start");
  if (autoStart) autoStart.checked = state.autoStart;

  const consentCheckbox = byId<HTMLInputElement>("consent-checkbox");
  if (consentCheckbox) consentCheckbox.checked = state.consentAccepted;

  const consentCard = byId<HTMLDivElement>("consent-card");
  if (consentCard) consentCard.classList.toggle("hidden", state.consentAccepted);

  const backendUrl = byId<HTMLInputElement>("backend-url");
  if (backendUrl && document.activeElement !== backendUrl) {
    backendUrl.value = state.backendBaseUrl ?? "";
  }

  renderTodaySummary(state.todaySummary);
  renderUsageCards(state.activeServiceCards);
  renderAuthView(state);

  const syncError = byId<HTMLParagraphElement>("sync-error");
  if (syncError) {
    if (state.syncError) {
      syncError.classList.remove("hidden");
      syncError.textContent = state.syncError;
    } else {
      syncError.classList.add("hidden");
      syncError.textContent = "";
    }
  }
}

async function withBusyAction(action: () => Promise<RuntimeStatus>, options: { connect?: boolean } = {}) {
  const connect = options.connect ?? false;
  const authConnecting = byId<HTMLParagraphElement>("auth-connecting");
  const connectToken = byId<HTMLButtonElement>("connect-token");

  try {
    if (connect && authConnecting && connectToken) {
      authConnecting.classList.remove("hidden");
      connectToken.disabled = true;
    }
    const next = await action();
    renderState(next);
  } catch (error) {
    const syncError = byId<HTMLParagraphElement>("sync-error");
    if (syncError) {
      syncError.classList.remove("hidden");
      syncError.textContent = error instanceof Error ? error.message : "Action failed";
    }
  } finally {
    if (connect && authConnecting && connectToken) {
      authConnecting.classList.add("hidden");
      connectToken.disabled = false;
    }
  }
}

function attachActions() {
  const quitApp = byId<HTMLButtonElement>("quit-app");
  if (quitApp) quitApp.addEventListener("click", () => void api.quitApp());

  const openTerms = byId<HTMLButtonElement>("open-terms");
  if (openTerms) {
    openTerms.addEventListener("click", () => {
      const backendUrl = byId<HTMLInputElement>("backend-url");
      const base = (backendUrl?.value || "https://payxen.com").replace(/\/$/, "");
      void api.openExternal(`${base}/terms-and-conditions`);
    });
  }

  const openPrivacy = byId<HTMLButtonElement>("open-privacy");
  if (openPrivacy) {
    openPrivacy.addEventListener("click", () => {
      const backendUrl = byId<HTMLInputElement>("backend-url");
      const base = (backendUrl?.value || "https://payxen.com").replace(/\/$/, "");
      void api.openExternal(`${base}/privacy-policy`);
    });
  }

  const consentCheckbox = byId<HTMLInputElement>("consent-checkbox");
  if (consentCheckbox) {
    consentCheckbox.addEventListener("change", () => {
      void withBusyAction(() => api.setConsentAccepted(consentCheckbox.checked));
    });
  }

  const toggleTracking = byId<HTMLButtonElement>("toggle-tracking");
  if (toggleTracking) {
    toggleTracking.addEventListener("click", () => {
      const state = latestState;
      if (!state?.consentAccepted) {
        const syncError = byId<HTMLParagraphElement>("sync-error");
        if (syncError) {
          syncError.classList.remove("hidden");
          syncError.textContent = "Consent is required before tracking can start.";
        }
        return;
      }
      void withBusyAction(() => api.setTrackingEnabled(!state.trackingEnabled));
    });
  }

  const pauseTracking = byId<HTMLButtonElement>("pause-tracking");
  if (pauseTracking) {
    pauseTracking.addEventListener("click", () => {
      const state = latestState;
      if (!state?.trackingEnabled) return;
      void withBusyAction(() => api.setPaused(!state.isPaused));
    });
  }

  const connectToken = byId<HTMLButtonElement>("connect-token");
  if (connectToken) {
    connectToken.addEventListener("click", () => {
      const backendUrl = byId<HTMLInputElement>("backend-url");
      const monitorToken = byId<HTMLInputElement>("monitor-token");
      void withBusyAction(
        () =>
          api.connectWithToken({
            backendBaseUrl: backendUrl?.value.trim() ?? "",
            token: monitorToken?.value.trim() ?? "",
          }),
        { connect: true },
      );
    });
  }

  const removeAuth = byId<HTMLButtonElement>("remove-auth");
  if (removeAuth) {
    removeAuth.addEventListener("click", () => {
      const monitorToken = byId<HTMLInputElement>("monitor-token");
      if (monitorToken) monitorToken.value = "";
      void withBusyAction(() => api.disconnectAccount());
    });
  }

  const refreshUsage = byId<HTMLButtonElement>("refresh-usage");
  if (refreshUsage) {
    refreshUsage.addEventListener("click", () => void withBusyAction(() => api.refreshActiveServices()));
  }

  const usageCards = byId<HTMLDivElement>("usage-cards");
  if (usageCards) {
    usageCards.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("service-clear")) return;
      const serviceName = target.dataset.service;
      if (!serviceName) return;
      void withBusyAction(() => api.deleteLocalData(serviceName));
    });
  }

  const autoStart = byId<HTMLInputElement>("auto-start");
  if (autoStart) {
    autoStart.addEventListener("change", () => void withBusyAction(() => api.setAutoStart(autoStart.checked)));
  }

  const clearLocalData = byId<HTMLButtonElement>("clear-local-data");
  if (clearLocalData) {
    clearLocalData.addEventListener("click", () => void withBusyAction(() => api.deleteLocalData()));
  }
}

export async function initMonitorApp() {
  attachActions();
  const initial = await api.getState();
  renderState(initial);
  api.onStatus((next) => {
    renderState(next);
  });
}
