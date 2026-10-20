// Progressive web app helpers: service worker registration and the
// "install to home screen" prompt.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

// The browser fires `beforeinstallprompt` once, early, and not again. It is
// caught here at module level (this file loads at startup) so the event is
// never missed, even if a React component has not mounted yet.
let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop the browser's own mini install bar; our banner replaces it.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    notify()
  })
}

export function getInstallPrompt() {
  return deferredPrompt
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Opens the browser's install dialog. Returns the visitor's answer, or null if no prompt was ready. */
export async function promptInstall() {
  const event = deferredPrompt
  if (!event) return null
                                                                                                                                                                                       
  await event.prompt()
  const { outcome } = await event.userChoice

  // A saved prompt can only be used once.
  deferredPrompt = null
  notify()
  return outcome
}

/** True on iPhone and iPad. Safari there has no install prompt, so we show a how-to hint instead. */
export function isIOS() {
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || isIPadOS
}

/** True when the site is already running as an installed app. */
export function isInstalledApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Registers the service worker. Production only, so local development never caches anything. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installing is a bonus feature; the site works fine without it.
    })
  })
}
