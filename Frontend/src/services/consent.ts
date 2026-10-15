import { useSyncExternalStore } from "react"

export type ConsentChoice = "all" | "necessary"

// Optional storage that needs an explicit "all" choice before it may load.
export type ConsentCategory = "analytics" | "marketing"

export const COOKIE_CONSENT_KEY = "fin_cookie_consent"

const CONSENT_CHANGE_EVENT = "fin:cookie-consent-change"
const CONSENT_REOPEN_EVENT = "fin:cookie-consent-reopen"

// Keeps the choice for this visit when browser storage is blocked.
let memoryChoice: ConsentChoice | null = null

function isChoice(value: string | null): value is ConsentChoice {
  return value === "all" || value === "necessary"
}

/** The saved choice, or null when the visitor has not chosen yet. */
export function getConsent(): ConsentChoice | null {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (isChoice(stored)) return stored
  } catch {
    // Storage can be blocked; fall back to the in-memory choice.
  }
  return memoryChoice
}

export function setConsent(choice: ConsentChoice) {
  memoryChoice = choice
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice)
  } catch {
    // Storage can be blocked; the choice still applies for this visit.
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
}

// The choice each optional category needs. Today both need "all"; give a
// category its own entry here if the banner ever offers finer options.
const requiredChoice: Record<ConsentCategory, ConsentChoice> = {
  analytics: "all",
  marketing: "all",
}

/** Optional categories are off until the visitor accepts all cookies. */
export function hasConsent(category: ConsentCategory): boolean {
  return getConsent() === requiredChoice[category]
}

export function subscribeConsent(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    // key is null when site data is cleared, so that counts as a change too.
    if (event.key === null || event.key === COOKIE_CONSENT_KEY) listener()
  }
  window.addEventListener(CONSENT_CHANGE_EVENT, listener)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** React hook that re-renders whenever the saved choice changes. */
export function useConsent() {
  return useSyncExternalStore(subscribeConsent, getConsent, () => null)
}

/** Asks the cookie banner to open again so the visitor can change their choice. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))
}

export function onCookieSettingsOpen(listener: () => void) {
  window.addEventListener(CONSENT_REOPEN_EVENT, listener)
  return () => window.removeEventListener(CONSENT_REOPEN_EVENT, listener)
}

/**
 * Runs `start` only while the visitor has consented to `category`: now if they
 * already have, or as soon as they accept. If they later switch to necessary
 * only, the cleanup that `start` returned is called. Use this for any
 * analytics or marketing script, so rejecting actually keeps it from loading.
 */
export function runWhenConsented(
  category: ConsentCategory,
  start: () => void | (() => void),
) {
  let cleanup: void | (() => void)
  let running = false

  const sync = () => {
    const allowed = hasConsent(category)
    if (allowed && !running) {
      running = true
      cleanup = start()
    } else if (!allowed && running) {
      running = false
      if (typeof cleanup === "function") cleanup()
      cleanup = undefined
    }
  }

  sync()
  const unsubscribe = subscribeConsent(sync)

  return () => {
    unsubscribe()
    if (running && typeof cleanup === "function") cleanup()
    running = false
  }
}
