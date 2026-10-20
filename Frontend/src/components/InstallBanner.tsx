import { useState, useSyncExternalStore } from "react"
import { useLocation } from "react-router-dom"
import logo from "../assets/attach1.png"
import {
  getInstallPrompt,
  isInstalledApp,
  isIOS,
  promptInstall,
  subscribeInstallPrompt,
} from "../pwa"
import { useConsent } from "../services/consent"

const DISMISS_KEY = "fin_install_dismissed"
const DISMISS_DAYS = 7

function recentlyDismissed() {
  try {
    const savedAt = Number(localStorage.getItem(DISMISS_KEY))
    return savedAt > 0 && Date.now() - savedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

// Inside the logged-in app on phones, the banner sits above the bottom bar and
// stops short of the chat button (bottom-right). On large screens there is no
// bottom bar, so it uses the same centred spot as on public pages.
const publicPosition = "inset-x-3 bottom-3 mx-auto max-w-xl"
const appPosition =
  "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-[5.5rem] lg:inset-x-3 lg:bottom-3 lg:mx-auto lg:max-w-xl"

export default function InstallBanner() {
  const { pathname } = useLocation()
  const consent = useConsent()
  const canInstall = useSyncExternalStore(
    subscribeInstallPrompt,
    () => getInstallPrompt() !== null,
    () => false,
  )
  const [dismissed, setDismissed] = useState(recentlyDismissed)

  // iPhones and iPads cannot show an install prompt, so they get a short
  // "Share, then Add to Home Screen" hint instead of an Install button.
  const showIOSHint = !canInstall && isIOS()

  // Hidden when: there is nothing to offer (already installed, or a browser
  // with no install support), the visitor said "Not now" or "Got it" in the
  // last 7 days, or the cookie banner is still waiting for an answer (so two
  // banners never stack).
  if (
    (!canInstall && !showIOSHint) ||
    dismissed ||
    consent === null ||
    isInstalledApp()
  ) {
    return null
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Storage can be blocked; the banner still hides for this visit.
    }
    setDismissed(true)
  }

  const position = pathname.startsWith("/app") ? appPosition : publicPosition

  const secondaryButtonClass =
    "min-h-11 flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"

  return (
    <aside
      aria-labelledby="install-banner-title"
      className={`fixed z-[55] rounded-2xl border border-border bg-white p-4 shadow-lg ${position}`}
    >
      <div className="flex items-center gap-3">
        <img
          src={logo}
          alt="Fortune Intern Network logo"
          className="h-12 w-12 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
        />
        <div className="min-w-0">
          <h2
            id="install-banner-title"
            className="text-base font-semibold text-primary"
          >
            Install Fortune Intern
          </h2>
          {showIOSHint ? (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
              Tap the Share button{" "}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline h-4 w-4 align-text-bottom text-primary"
              >
                <path d="M12 15V3" />
                <path d="M8 7l4-4 4 4" />
                <path d="M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8" />
              </svg>
              , then choose &ldquo;Add to Home Screen&rdquo;.
            </p>
          ) : (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
              Add the app to your home screen to open it quickly, like any other
              app.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {showIOSHint ? (
          <button type="button" onClick={dismiss} className={secondaryButtonClass}>
            Got it
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="min-h-11 flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Install
            </button>
            <button type="button" onClick={dismiss} className={secondaryButtonClass}>
              Not now
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
