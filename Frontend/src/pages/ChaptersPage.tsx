import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Menu, Upload, X } from "lucide-react"
import { Link } from "react-router-dom"
import logo from "../assets/logo.webp"
import type { AppUser } from "../App"
import Footer from "../components/layout/Footer"
import type { Chapter, Executive } from "../services/chapters"
import { getSlideDefs } from "./chapters/BlueprintSlides"
import BlueprintTab from "./chapters/BlueprintTab"
import BoardDrawer from "./chapters/BoardDrawer"
import ChaptersTab from "./chapters/ChaptersTab"
import { slug } from "./chapters/data"
import {
  ApplicationsModal,
  ChapterModal,
  ExecutiveModal,
  FounderModal,
  ImportModal,
  PositionApplicationModal,
  type SeatValues,
} from "./chapters/DirectoryModals"
import { downloadBlob } from "./chapters/exports"
import FoundersTab from "./chapters/FoundersTab"
import { btnGold, btnOutline, btnPrimary, btnSoft } from "./chapters/styles"
import { Toast } from "./chapters/ui"
import { useChaptersData, type ToastFn } from "./chapters/useChaptersData"

type Tab = "chapters" | "founders" | "blueprint"

type Dialog =
  | { kind: "seat"; seatId: string | null; chapterId: string }
  | { kind: "addChapter" }
  | { kind: "import" }
  | { kind: "apply"; chapterId: string; chapterName: string; positionTitle: string }
  | { kind: "applications"; admin: boolean }
  | { kind: "founder"; founderId: string | null }

const BLUEPRINT_PAGES = getSlideDefs({}).length

const navItem = (active: boolean) =>
  `inline-block cursor-pointer text-sm font-medium underline decoration-2 underline-offset-[10px] transition-colors hover:text-primary hover:decoration-accent ${
    active ? "text-primary decoration-accent" : "text-muted-foreground decoration-transparent"
  }`

export default function ChaptersPage({ user }: { user: AppUser }) {
  const isAdmin = user.isAdmin
  const accountName = user.name || user.email || "FIN member"

  const [tab, setTab] = useState<Tab>("chapters")
  const [menuOpen, setMenuOpen] = useState(false)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [toastState, setToastState] = useState<{ text: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const toast = useCallback<ToastFn>((text, undo) => {
    setToastState({ text, undo })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastState(null), undo ? 7000 : 2800)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    const previous = document.title
    document.title = "Campus Chapters · Fortune Intern Network"
    return () => {
      document.title = previous
    }
  }, [])

  const {
    chapters,
    executives,
    loadState,
    founders,
    canEditFounders,
    updateDirectory,
    saveFounder,
    deleteFounder,
  } = useChaptersData(isAdmin, toast)

  const showTab = (next: Tab) => {
    setTab(next)
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }

  const chapterById = (id: string): Chapter =>
    chapters.find((c) => c.id === id) ?? {
      id,
      name: id,
      inst: "",
      city: "",
      region: "",
      type: "Other Institution",
    }

  const onSeat = (seat: Executive) => {
    if (isAdmin) {
      setDialog({ kind: "seat", seatId: seat.id, chapterId: seat.chapter })
      return
    }
    if (seat.status === "seat") {
      setDialog({
        kind: "apply",
        chapterId: seat.chapter,
        chapterName: chapterById(seat.chapter).name,
        positionTitle: seat.role,
      })
      return
    }
    toast("This chapter position is currently filled.")
  }

  const saveSeat = (seatId: string | null, values: SeatValues) => {
    if (!isAdmin) {
      toast("Administrator access is required.")
      return
    }
    updateDirectory((d) => ({
      ...d,
      executives: seatId
        ? d.executives.map((e) => (e.id === seatId ? { ...e, ...values } : e))
        : [...d.executives, { ...values, id: `n${Date.now()}` }],
    }))
    setDialog(null)
    toast(seatId ? "Profile saved" : "Seat added")
  }

  const deleteSeat = (seatId: string) => {
    if (!isAdmin) return
    const index = executives.findIndex((e) => e.id === seatId)
    const record = executives[index]
    if (!record) return
    updateDirectory((d) => ({ ...d, executives: d.executives.filter((e) => e.id !== seatId) }))
    setDialog(null)
    toast("Seat deleted", () =>
      updateDirectory((d) => {
        const next = [...d.executives]
        next.splice(Math.min(index, next.length), 0, record)
        return { ...d, executives: next }
      }),
    )
  }

  const createChapter = (chapter: Chapter, seats: Executive[]) => {
    if (!isAdmin) {
      toast("Administrator access is required.")
      return
    }
    updateDirectory((d) => ({
      chapters: [...d.chapters, chapter],
      executives: [...d.executives, ...seats],
    }))
    setDialog(null)
    toast(`Chapter created with ${seats.length} seats`)
  }

  const applyImport = (nextChapters: Chapter[], nextExecutives: Executive[], message: string) => {
    if (!isAdmin) {
      toast("Administrator access is required.")
      return
    }
    updateDirectory(() => ({ chapters: nextChapters, executives: nextExecutives }))
    setDialog(null)
    toast(message)
  }

  const exportBoard = () => {
    if (!boardId) return
    const chapter = chapterById(boardId)
    downloadBlob(
      new Blob(
        [JSON.stringify({ chapter, executives: executives.filter((e) => e.chapter === boardId) }, null, 2)],
        { type: "application/json" },
      ),
      `FIN_${slug(chapter.name)}.json`,
    )
    toast("Chapter exported")
  }

  const tabs: [Tab, string, number][] = [
    ["chapters", "Chapters", chapters.length],
    ["founders", "Founding Team", founders.length],
    ["blueprint", "Blueprint & SOP", BLUEPRINT_PAGES],
  ]

  const seatForDialog =
    dialog?.kind === "seat" && dialog.seatId
      ? (executives.find((e) => e.id === dialog.seatId) ?? null)
      : null
  const founderForDialog =
    dialog?.kind === "founder" && dialog.founderId
      ? (founders.find((f) => f.id === dialog.founderId) ?? null)
      : null

  return (
    <div className="landing-fonts min-h-screen bg-surface text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-white/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-18 max-w-7xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-left leading-tight">
              <span className="block font-display text-lg text-primary">Fortune</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em]">
                <span className="text-accent">Intern</span> <span className="text-foreground">Network</span>
              </span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            <Link to="/app/dashboard" className={navItem(false)}>
              Student portal
            </Link>
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => showTab(id)}
                className={navItem(tab === id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <Link
            to="/app/account"
            aria-label={`Open profile for ${accountName}`}
            title={`Open profile for ${accountName}`}
            className="ml-auto flex max-w-48 items-center gap-2 rounded-full border border-border bg-surface p-1 pr-3 text-sm font-bold text-primary md:ml-7"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent text-xs font-extrabold text-accent-foreground">
              {user.avatar || "FIN"}
            </span>
            <span className="hidden truncate sm:block">{accountName}</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="ml-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5 text-primary" strokeWidth={2.4} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5 text-primary" strokeWidth={2.4} aria-hidden="true" />
            )}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-border bg-white px-4 py-4 md:hidden">
            <nav className="space-y-1">
              <Link to="/app/dashboard" className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-secondary">
                Student portal
              </Link>
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => showTab(id)}
                  className={`w-full rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-secondary ${
                    tab === id ? "bg-secondary text-primary" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <section className="chapters-intro border-b border-border bg-white print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="mt-3.5 font-display text-4xl font-extrabold leading-[1.1] text-primary sm:text-5xl">
            Campus Chapters
          </h1>
          <p className="mt-3.5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every Fortune Intern Network tertiary chapter runs on the same constitution, the same eleven seat
            executive board and the same reporting cadence. Browse chapters, meet the founding team, and open the
            full operational blueprint. Signed-in members can apply for open chapter positions and track their
            applications.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" className={btnPrimary} onClick={() => showTab("chapters")}>
              Browse Chapters
            </button>
            <button type="button" className={btnOutline} onClick={() => showTab("founders")}>
              Founding Team
            </button>
            <button type="button" className={btnOutline} onClick={() => showTab("blueprint")}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Blueprint &amp; SOP
            </button>
            {isAdmin ? (
              <button type="button" className={btnGold} onClick={() => setDialog({ kind: "import" })}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Import Directory
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sticky top-[4.5rem] z-40 border-b border-border bg-surface/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6" role="tablist" aria-label="Chapter sections">
          {tabs.map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => showTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-4 pb-3 pt-3.5 text-sm font-bold ${
                tab === id
                  ? "border-accent text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary"
              }`}
            >
              {label}
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold ${
                  tab === id
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="chapters-content">
        <section hidden={tab !== "chapters"}>
          <ChaptersTab
            chapters={chapters}
            executives={executives}
            founders={founders}
            loadState={loadState}
            isAdmin={isAdmin}
            onOpenBoard={setBoardId}
            onAddChapter={() => setDialog({ kind: "addChapter" })}
            onImport={() => setDialog({ kind: "import" })}
            onMyApplications={() => setDialog({ kind: "applications", admin: false })}
            onReviewApplications={() => setDialog({ kind: "applications", admin: true })}
            toast={toast}
          />
        </section>

        <section hidden={tab !== "founders"}>
          <FoundersTab
            founders={founders}
            canEdit={canEditFounders}
            onAdd={() => setDialog({ kind: "founder", founderId: null })}
            onEdit={(id) => setDialog({ kind: "founder", founderId: id })}
            onSavePhoto={saveFounder}
            toast={toast}
          />
        </section>

        <section hidden={tab !== "blueprint"}>
          <BlueprintTab active={tab === "blueprint"} isAdmin={isAdmin} toast={toast} />
        </section>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>

      {boardId ? (
        <BoardDrawer
          chapter={chapterById(boardId)}
          seats={executives.filter((e) => e.chapter === boardId)}
          isAdmin={isAdmin}
          onClose={() => setBoardId(null)}
          onSeat={onSeat}
          onAddSeat={() => setDialog({ kind: "seat", seatId: null, chapterId: boardId })}
          onExport={exportBoard}
        />
      ) : null}

      {dialog?.kind === "seat" && isAdmin && (!dialog.seatId || seatForDialog) ? (
        <ExecutiveModal
          key={dialog.seatId ?? "new-seat"}
          executive={seatForDialog}
          defaultChapter={dialog.chapterId || boardId || chapters[0]?.id || ""}
          chapters={chapters}
          onClose={() => setDialog(null)}
          onSave={(values) => saveSeat(dialog.seatId, values)}
          onDelete={() => dialog.seatId && deleteSeat(dialog.seatId)}
          toast={toast}
        />
      ) : null}

      {dialog?.kind === "addChapter" && isAdmin ? (
        <ChapterModal onClose={() => setDialog(null)} onCreate={createChapter} toast={toast} />
      ) : null}

      {dialog?.kind === "import" && isAdmin ? (
        <ImportModal
          chapters={chapters}
          executives={executives}
          onClose={() => setDialog(null)}
          onApply={applyImport}
          toast={toast}
        />
      ) : null}

      {dialog?.kind === "apply" ? (
        <PositionApplicationModal
          position={{
            chapterId: dialog.chapterId,
            chapterName: dialog.chapterName,
            positionTitle: dialog.positionTitle,
          }}
          onClose={() => setDialog(null)}
          toast={toast}
        />
      ) : null}

      {dialog?.kind === "applications" && (!dialog.admin || isAdmin) ? (
        <ApplicationsModal admin={dialog.admin} onClose={() => setDialog(null)} toast={toast} />
      ) : null}

      {dialog?.kind === "founder" && canEditFounders && (!dialog.founderId || founderForDialog) ? (
        <FounderModal
          key={dialog.founderId ?? "new-founder"}
          founder={founderForDialog}
          onClose={() => setDialog(null)}
          onSave={saveFounder}
          onDelete={deleteFounder}
          toast={toast}
        />
      ) : null}

      {toastState ? (
        <Toast
          text={toastState.text}
          onUndo={
            toastState.undo
              ? () => {
                  toastState.undo?.()
                  setToastState(null)
                }
              : undefined
          }
        />
      ) : null}
    </div>
  )
}

// Kept so the small "secondary" button style stays available to this page.
void btnSoft
