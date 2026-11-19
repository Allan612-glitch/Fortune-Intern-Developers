import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import type { Chapter, Executive } from "../../services/chapters"
import { displayName } from "./data"
import { btnSmallPrimary, btnSoft, goldText } from "./styles"
import { PhotoBox } from "./ui"

/** The side panel that lists one chapter's executive board. */
export default function BoardDrawer(props: {
  chapter: Chapter
  seats: Executive[]
  isAdmin: boolean
  onClose: () => void
  onSeat: (seat: Executive) => void
  onAddSeat: () => void
  onExport: () => void
}) {
  const { chapter, seats, isAdmin, onClose, onSeat, onAddSeat, onExport } = props
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-[300] bg-primary/55 backdrop-blur-sm print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${chapter.name} executive board`}
        className="fixed bottom-0 right-0 top-0 z-[301] flex w-[min(460px,100%)] flex-col bg-white print:hidden"
      >
        <div className="relative bg-primary px-6 py-5 text-white">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent">
            {chapter.type}
          </span>
          <h3 className="mt-1 pr-10 font-display text-xl">{chapter.name}</h3>
          <p className="mt-1 text-sm text-white/75">
            {chapter.inst}
            {chapter.city ? ` · ${chapter.city}` : ""}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {seats.map((seat) => {
            const open = seat.status === "seat"
            return (
              <button
                key={seat.id}
                type="button"
                onClick={() => onSeat(seat)}
                className="mb-2.5 flex w-full items-center gap-3 rounded-2xl border border-border bg-white p-2.5 text-left transition-colors hover:border-primary/30"
              >
                <PhotoBox
                  photo={seat.photo}
                  name={seat.name || seat.role}
                  className="h-11 w-11 shrink-0 rounded-xl"
                  textClass="text-base"
                />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-bold text-primary">{displayName(seat)}</b>
                  <span className={`text-xs font-bold ${goldText}`}>{seat.role}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                    open ? "bg-secondary text-muted-foreground" : "bg-accent/20 text-primary"
                  }`}
                >
                  {open ? (isAdmin ? "Open" : "Apply →") : "Active"}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-3.5">
          <button type="button" className={`${btnSoft} flex-1`} onClick={onExport}>
            Export chapter
          </button>
          {isAdmin ? (
            <button type="button" className={`${btnSmallPrimary} flex-1`} onClick={onAddSeat}>
              + Add seat
            </button>
          ) : null}
        </div>
      </aside>
    </>
  )
}
