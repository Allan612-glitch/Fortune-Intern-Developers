import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  getConsent,
  onCookieSettingsOpen,
  setConsent,
} from "../services/consent"

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => getConsent() === null)

  const [notice, setNotice] = useState("")

  const noticeTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(noticeTimerRef.current)
  }, [])

  // Lets the footer's "Cookie settings" link bring the banner back.
  useEffect(() => onCookieSettingsOpen(() => setVisible(true)), [])

  const choose = (value: "all" | "necessary") => {
    setConsent(value)

    setVisible(false)

    setNotice(
      value === "all"
        ? "All cookies accepted"
        : "Cookies rejected. Necessary storage only",
    )

    window.clearTimeout(noticeTimerRef.current)

    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2600)
  }

  const linkClass =
    "font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"

  return (
    <>
      {visible && (
        <aside
          aria-labelledby="cookie-consent-title"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-border bg-white p-5 shadow-lg"
        >
          <h2
            id="cookie-consent-title"
            className="text-base font-semibold text-primary"
          >
            We value your privacy
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We use only necessary storage to keep you signed in and save your
            documents. Analytics and marketing cookies remain off unless you
            accept, and rejecting them does not affect your access. Cookie
            details are in Section 5 of our{" "}
            <Link to="/privacy-policy" className={linkClass}>
              Privacy Policy
            </Link>{" "}
            and refund rules are in our{" "}
            <Link to="/terms#refunds" className={linkClass}>
              Terms and Conditions
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => choose("all")}
              className="min-h-11 flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Accept all cookies
            </button>
            <button
              type="button"
              onClick={() => choose("necessary")}
              className="min-h-11 flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Reject all cookies
            </button>
          </div>
        </aside>
      )}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-4 z-[70] flex justify-center"
      >
        {notice && (
          <p className="max-w-full rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg">
            {notice}
          </p>
        )}
      </div>
    </>
  )
}
