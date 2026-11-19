import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Printer,
} from "lucide-react"
import "./chapters.css"
import { ART, META, SLOTS, type PosterKey } from "./art"
import { BLUEPRINT_STORAGE_KEY, loadLocal, processImage, saveLocal } from "./data"
import {
  buildPDF,
  buildPPTX,
  capturePages,
  downloadBlob,
  ensureHtml2canvas,
} from "./exports"
import { getSlideDefs, type Photos, type SlideDef } from "./BlueprintSlides"
import { darkBar } from "./styles"
import { Modal } from "./ui"
import type { ToastFn } from "./useChaptersData"

const POSTER_KEYS = Object.keys(META) as PosterKey[]

function loadPhotos(): Photos {
  const stored = loadLocal<Record<string, unknown>>(BLUEPRINT_STORAGE_KEY, {})
  const photos: Photos = {}
  POSTER_KEYS.forEach((key) => {
    const value = stored[key]
    if (typeof value === "string") photos[key] = value
  })
  return photos
}

function SlideFrame(props: { def: SlideDef; index: number; total: number; active: boolean }) {
  const { def, index, total, active } = props
  return (
    <section className={`slide${def.dark ? " dark" : ""}${active ? " active" : ""}`}>
      <div className="wm" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ART.mark }} />
      <header className="s-head">
        <span className="s-logo">
          <span className="s-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ART.mark }} />
          <em>
            FORTUNE<b>INTERN NETWORK</b>
          </em>
        </span>
        <span className="s-kick">{def.kick}</span>
      </header>
      {def.body}
      <footer className="s-foot">
        <span>Fortune Intern Network · Bridging Dreams and Careers</span>
        <span>
          Page {index + 1} of {total}
        </span>
      </footer>
    </section>
  )
}

const toolBtn = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold whitespace-nowrap disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"

export default function BlueprintTab(props: {
  active: boolean
  isAdmin: boolean
  toast: ToastFn
}) {
  const { active, isAdmin, toast } = props
  const [photos, setPhotos] = useState<Photos>(loadPhotos)
  const [cur, setCur] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<"insert" | "assets" | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<number | null>(null)

  const slides = useMemo(() => getSlideDefs(photos), [photos])
  const total = slides.length

  useEffect(() => {
    const problem = saveLocal(BLUEPRINT_STORAGE_KEY, photos)
    if (problem) toast(`Could not save local data: ${problem}`)
  }, [photos, toast])

  // Show every page from the top when you move to it.
  useEffect(() => {
    const slide = stageRef.current?.querySelectorAll<HTMLElement>(".slide")[cur]
    const body = slide?.querySelector<HTMLElement>(".s-body")
    if (body) body.scrollTop = 0
  }, [cur])

  const go = useCallback(
    (index: number) => setCur(Math.max(0, Math.min(total - 1, index))),
    [total],
  )

  // Keyboard: arrows or space turn pages, P prints (only while this tab is open).
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName ?? ""
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (tag === "BUTTON" && event.key === " ") return
      if (document.querySelector('[role="dialog"]')) return
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault()
        setCur((c) => Math.min(total - 1, c + 1))
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        setCur((c) => Math.max(0, c - 1))
      } else if (event.key === "p" || event.key === "P") {
        window.print()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [active, total])

  const exportPages = async (kind: "pdf" | "pptx") => {
    if (busy) return
    setBusy(true)
    toast(kind === "pdf" ? "Preparing PDF…" : "Preparing PowerPoint…")
    try {
      await ensureHtml2canvas()
      const stage = stageRef.current
      if (!stage) throw new Error("The blueprint is not ready")
      const pages = await capturePages({
        stage,
        slides: Array.from(stage.querySelectorAll<HTMLElement>(".slide")),
        current: cur,
        show: (index) => flushSync(() => setCur(index)),
        onProgress: (index, count) => toast(`Rendering page ${index + 1} of ${count}`),
      })
      if (kind === "pdf") {
        downloadBlob(buildPDF(pages), "FIN_Campus_Blueprint_SOP.pdf")
        toast(`PDF downloaded — ${pages.length} pages`)
      } else {
        downloadBlob(buildPPTX(pages), "FIN_Campus_Blueprint_SOP.pptx")
        toast(`PowerPoint downloaded — ${pages.length} slides`)
      }
    } catch {
      if (kind === "pdf") {
        toast("Opening Print — choose Save as PDF")
        window.setTimeout(() => window.print(), 500)
      } else {
        toast("PowerPoint needs the renderer once — check connection")
      }
    } finally {
      setBusy(false)
    }
  }

  const choosePhoto = (key: PosterKey, input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = ""
    if (!file || !isAdmin) return
    processImage(file)
      .then((data) => {
        setPhotos((current) => ({ ...current, [key]: data }))
        toast("Photo inserted")
      })
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : "Could not read that image")
      })
  }

  const revertPhoto = (key: PosterKey) => {
    if (!isAdmin) return
    setPhotos((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    toast("Artwork restored")
  }

  const downloadPng = (key: PosterKey) => {
    const [width, height] = META[key].vb
    const svg = ART[key].replace("<svg ", `<svg width="${width}" height="${height}" `)
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width * 2
      canvas.height = height * 2
      const context = canvas.getContext("2d")
      if (!context) return
      context.fillStyle = "#fff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `FIN_${key}.png`)
      }, "image/png")
    }
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  return (
    <div
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current
        touchStart.current = null
        const end = event.changedTouches[0]?.clientX
        if (start === null || end === undefined) return
        const distance = end - start
        if (Math.abs(distance) > 50) go(cur + (distance < 0 ? 1 : -1))
      }}
    >
      <div
        className={`sticky top-[123px] z-30 flex items-center justify-between gap-3 border-b border-accent/20 px-4 py-2.5 sm:px-6 print:hidden ${darkBar}`}
      >
        <span className="hidden text-xs font-extrabold uppercase tracking-[0.14em] text-slate-300 md:block">
          <b className="text-accent">FIN</b> Campus Chapter Blueprint &amp; SOP · {total} pages
        </span>
        <span className="flex flex-wrap gap-1.5">
          {isAdmin ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setDialog("insert")}
              className={`${toolBtn} border border-accent bg-white text-primary`}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              Insert Photo
            </button>
          ) : null}
          <button type="button" disabled={busy} onClick={() => void exportPages("pdf")} className={`${toolBtn} bg-accent text-primary`}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            PDF
          </button>
          <button type="button" disabled={busy} onClick={() => void exportPages("pptx")} className={`${toolBtn} bg-accent text-primary`}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            PPTX
          </button>
          <button type="button" disabled={busy} onClick={() => window.print()} className={`${toolBtn} bg-white text-primary`}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </button>
          <button
            type="button"
            onClick={() => setDialog("assets")}
            className={`${toolBtn} border border-white/20 bg-white/10 text-slate-100`}
          >
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Assets
          </button>
        </span>
      </div>

      <div className="h-1 bg-accent transition-all print:hidden" style={{ width: `${((cur + 1) / total) * 100}%` }} />

      <div ref={stageRef} className="bp-stage">
        {slides.map((def, index) => (
          <SlideFrame key={index} def={def} index={index} total={total} active={index === cur} />
        ))}
      </div>

      <div className={`flex items-center justify-center gap-3 p-4 print:hidden ${darkBar}`}>
        <button
          type="button"
          aria-label="Previous page"
          disabled={cur === 0}
          onClick={() => go(cur - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-lg font-black text-primary disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="rounded-full bg-white/10 px-3.5 py-2 font-mono text-[13px] font-bold text-white">
          {cur + 1} / {total}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={cur === total - 1}
          onClick={() => go(cur + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-lg font-black text-primary disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {dialog === "insert" && isAdmin ? (
        <Modal
          title="Insert Real Photos"
          description="Replace any infographic with an actual picture. Included in PDF and PPTX exports."
          onClose={() => setDialog(null)}
        >
          <div>
            {SLOTS.map((slot) => {
              const photo = photos[slot.k]
              return (
                <div key={slot.k} className="mb-2.5 flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {photo ? (
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="block h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: ART[slot.k] }} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm text-primary">{slot.n}</b>
                    <span className="text-xs text-muted-foreground">Page {slot.pg}</span>
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    <label className="cursor-pointer rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-primary hover:bg-muted">
                      Choose
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => choosePhoto(slot.k, event.currentTarget)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => revertPhoto(slot.k)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      Revert
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setDialog(null)}
            className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground hover:bg-amber-300"
          >
            Done
          </button>
        </Modal>
      ) : null}

      {dialog === "assets" ? (
        <Modal
          title="Brand Assets & Posters"
          description="Download the original artwork as vector SVG or high resolution PNG."
          onClose={() => setDialog(null)}
        >
          <div>
            {POSTER_KEYS.map((key) => (
              <div key={key} className="mb-2.5 flex items-center gap-3 rounded-xl border border-border p-2.5">
                <span
                  className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: ART[key] }}
                />
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-primary">{META[key].n}</b>
                  <span className="text-xs text-muted-foreground">Original artwork</span>
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      downloadBlob(new Blob([ART[key]], { type: "image/svg+xml" }), `FIN_${key}.svg`)
                    }
                    className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-primary hover:bg-muted"
                  >
                    SVG
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPng(key)}
                    className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-primary hover:bg-muted"
                  >
                    PNG
                  </button>
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDialog(null)}
            className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground hover:bg-amber-300"
          >
            Close
          </button>
        </Modal>
      ) : null}
    </div>
  )
}
