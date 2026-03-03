"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallSection() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    /* Detect if already installed */
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    setInstalling(true);
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    deferredPrompt.current = null;
    setCanInstall(false);
    setInstalling(false);
  };

  return (
    <section className="rounded-2xl border bg-gradient-to-br from-violet-950/40 to-zinc-900 p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-violet-400"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
            Web App
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Install PayXen as an App
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-300">
            Install PayXen directly on your device — no app store needed. Get a
            dedicated window, taskbar icon, and the same login experience as the
            website. Works on Windows, macOS, Linux, and ChromeOS.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {installed ? (
              <span className="inline-flex items-center gap-2 rounded-md border border-green-700 bg-green-950/40 px-4 py-2 text-sm font-medium text-green-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                PayXen App Installed
              </span>
            ) : canInstall ? (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
              >
                {installing ? (
                  "Installing…"
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Install PayXen Web App
                  </>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Use Chrome, Edge, or Brave to install
              </span>
            )}
          </div>

          {/* Manual instructions */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-zinc-400 hover:text-zinc-200">
              Manual install instructions
            </summary>
            <ol className="mt-3 space-y-2 text-sm text-zinc-400">
              <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <span className="font-medium text-zinc-200">1.</span> Open PayXen
                in <strong className="text-zinc-200">Chrome</strong>,{" "}
                <strong className="text-zinc-200">Edge</strong>, or{" "}
                <strong className="text-zinc-200">Brave</strong>.
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <span className="font-medium text-zinc-200">2.</span> Click the
                install icon{" "}
                <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300">
                  ⊕
                </kbd>{" "}
                in the address bar, or open the browser menu → &quot;Install
                PayXen&quot;.
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <span className="font-medium text-zinc-200">3.</span> PayXen will
                open in its own window with a taskbar shortcut.
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <span className="font-medium text-zinc-200">4.</span> Sign in
                with your existing PayXen account — same credentials, same data.
              </li>
            </ol>
          </details>
        </div>
      </div>
    </section>
  );
}
