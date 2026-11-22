import { useMemo, useState } from "react"
import { Search, Upload } from "lucide-react"
import type { Chapter, Executive, Founder } from "../../services/chapters"
import {
  btnSmallGold,
  btnSmallPrimary,
  btnSoft,
  cardClass,
  goldText,
  inputClass,
} from "./styles"
import type { LoadState, ToastFn } from "./useChaptersData"

const TYPE_FILTERS = [
  "All",
  "Public University",
  "Technical University",
  "Private / Specialised",
  "Other Institution",
]

type Stat = { t: number; f: number; p: number }

function typeStyle(type: string) {
  if (type === "Technical University") return { strip: "bg-primary", label: "text-primary" }
  if (type === "Private / Specialised") return { strip: "bg-muted-foreground", label: "text-muted-foreground" }
  if (type === "Other Institution") return { strip: "bg-border", label: "text-muted-foreground" }
  return { strip: "bg-accent", label: goldText }
}

export default function ChaptersTab(props: {
  chapters: Chapter[]
  executives: Executive[]
  founders: Founder[]
  loadState: LoadState
  isAdmin: boolean
  onOpenBoard: (id: string) => void
  onAddChapter: () => void
  onImport: () => void
  onMyApplications: () => void
  onReviewApplications: () => void
  toast: ToastFn
}) {
  const { chapters, executives, founders, loadState, isAdmin } = props
  const [query, setQuery] = useState("")
  const [type, setType] = useState("All")
  const [sort, setSort] = useState("az")

  const stats = useMemo(() => {
    const map = new Map<string, Stat>()
    executives.forEach((e) => {
      const s = map.get(e.chapter) ?? { t: 0, f: 0, p: 0 }
      s.t += 1
      if (e.name) s.f += 1
      if (e.photo) s.p += 1
      map.set(e.chapter, s)
    })
    return map
  }, [executives])
  const statOf = (id: string): Stat => stats.get(id) ?? { t: 0, f: 0, p: 0 }

  const filled = executives.filter((e) => e.name).length
  const photos = executives.filter((e) => e.photo).length + founders.filter((f) => f.photo).length

  const shown = useMemo(() => {
    const q = query.toLowerCase()
    const list = chapters.filter((c) => {
      if (type !== "All" && c.type !== type) return false
      if (q && !`${c.name} ${c.inst} ${c.city} ${c.region}`.toLowerCase().includes(q)) return false
      return true
    })
    if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === "type") list.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    if (sort === "filled") {
      const ratio = (id: string) => {
        const s = stats.get(id) ?? { t: 0, f: 0, p: 0 }
        return s.f / (s.t || 1)
      }
      list.sort((a, b) => ratio(b.id) - ratio(a.id))
    }
    return list
  }, [chapters, query, type, sort, stats])

  const emptyMessage = chapters.length
    ? "No chapters match your search or filters."
    : loadState === "error"
      ? "The shared directory could not be loaded. Refresh to try again."
      : loadState === "empty"
        ? "No chapters have been published yet. Please check back soon."
        : "Loading the shared directory…"

  const metrics: [string, string | number, string?][] = [
    ["Chapters", chapters.length],
    ["Executive seats", executives.length],
    ["Seats filled", filled, `(${Math.round((filled / (executives.length || 1)) * 100)}%)`],
    ["Photos added", photos],
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-7 sm:px-6">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {metrics.map(([label, value, note]) => (
          <div key={label} className={`${cardClass} p-5`}>
            <b className="block font-mono text-2xl font-bold leading-tight text-primary">{value}</b>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
              {note ? <i className={`ml-1 not-italic ${goldText}`}>{note}</i> : null}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chapter, institution, city…"
            aria-label="Search chapters"
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort chapters"
          className={`${inputClass} w-auto`}
        >
          <option value="az">Sort: A–Z</option>
          <option value="filled">Sort: Most filled</option>
          <option value="type">Sort: Type</option>
        </select>
        {isAdmin ? (
          <>
            <button type="button" className={btnSmallPrimary} onClick={props.onAddChapter}>
              + Add Chapter
            </button>
            <button type="button" className={btnSmallGold} onClick={props.onImport}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Import
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <button type="button" className={btnSoft} onClick={props.onMyApplications}>
          My position applications
        </button>
        {isAdmin ? (
          <button type="button" className={btnSmallPrimary} onClick={props.onReviewApplications}>
            Review applications
          </button>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={`min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              type === t ? "bg-primary text-white" : "bg-secondary text-primary hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="mt-3.5 text-sm font-semibold text-muted-foreground">
        {shown.length} chapters shown · {executives.length} seats tracked
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-dashed border-border bg-white p-8 text-center text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          shown.map((c) => {
            const s = statOf(c.id)
            const pct = s.t ? Math.round((s.f / s.t) * 100) : 0
            const style = typeStyle(c.type)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => props.onOpenBoard(c.id)}
                className="relative block overflow-hidden rounded-2xl border border-border bg-white p-5 pt-6 text-left transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${style.strip}`} />
                <span className={`block text-[10.5px] font-extrabold uppercase tracking-[0.12em] ${style.label}`}>
                  {c.type}
                </span>
                <span className="mt-1.5 block font-display text-lg font-bold leading-snug text-primary">
                  {c.name}
                </span>
                <span className="mt-1 block min-h-10 text-sm leading-snug text-muted-foreground">{c.inst}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {c.city}
                  {c.region ? ` · ${c.region}` : ""}
                </span>
                <span className="mt-3.5 block h-1.5 overflow-hidden rounded-full bg-secondary">
                  <i className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </span>
                <span className="mt-2 flex justify-between font-mono text-[11.5px] font-medium text-muted-foreground">
                  <span>
                    {s.f}/{s.t} filled
                  </span>
                  <span>{s.p} photos</span>
                </span>
                <span className="mt-3 block text-sm font-semibold text-primary">View board →</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
