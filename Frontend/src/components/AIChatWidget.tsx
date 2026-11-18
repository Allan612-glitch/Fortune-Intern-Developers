import { useEffect, useRef, useState } from "react"
import type { AppUser } from "../App"
import logo from "../assets/attach1.png"

export default function AIChatWidget({ user }: { user: AppUser }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow ||
        !event.data ||
        typeof event.data !== "object" ||
        !("type" in event.data) ||
        event.data.type !== "fin-super-close"
      ) {
        return
      }

      setOpen(false)
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return (
    <div className="chat-widget">
      <div
        className={
          open
            ? "fixed inset-0 z-[105] overflow-hidden bg-white sm:absolute sm:inset-auto sm:bottom-[calc(100%+0.75rem)] sm:right-0 sm:h-[min(700px,calc(100dvh-8rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
            : "hidden"
        }
      >
        {!loaded && open && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0A3161]/20 border-t-[#0A3161]" aria-label="Loading Super AI" />
          </div>
        )}
          <iframe
            ref={iframeRef}
            src={`/super-ai.html?embedded=1&admin=${user.isAdmin ? "1" : "0"}`}
            title={`Super AI assistant for ${user.name}`}
            className="block h-full w-full border-0"
            onLoad={() => setLoaded(true)}
          />
      </div>
      <button
        type="button"
        onClick={() => setOpen((currentlyOpen) => !currentlyOpen)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
        aria-label={open ? "Close Super AI Assistant" : "Open Super AI Assistant"}
        aria-expanded={open}
      >
        {open ? (
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <img
            src={logo}
            alt=""
            className="h-11 w-11 rounded-full bg-white object-contain"
          />
        )}
      </button>
    </div>
  )
}
