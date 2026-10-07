import { useCallback, useEffect, useRef, useState } from "react"

import ApplyFormModal from "../components/ApplyFormModal"

import type { AppUser } from "../App"

import { listPrograms, type Program } from "../services/platform"

const types = ["All", "Technology", "Finance", "Marketing", "Media"]

type ProgramCard = Program & {
  role: string

  type: string

  tags: string[]

  logo: string

  color: string

  remote: boolean

  desc: string
}

function toProgramCard(program: Program, index: number): ProgramCard {
  const colors = ["#0F766E", "#B45309", "#2563EB", "#DC2626", "#65A30D"]

  return {
    ...program,

    role: program.name,

    type: program.category,

    tags: program.skills,

    logo: program.company

      .split(/\s+/)

      .map((word) => word[0])

      .join("")

      .slice(0, 2)

      .toUpperCase(),

    color: colors[index % colors.length],

    remote: /remote|hybrid/i.test(program.location),

    desc: program.description,
  }
}

export default function ProgramsPage({
  user,

  initialSelectedProgramId = null,

  onInitialSelectionHandled,
}: {
  user: AppUser

  initialSelectedProgramId?: string | null

  onInitialSelectionHandled?: () => void
}) {
  const [search, setSearch] = useState("")

  const [filter, setFilter] = useState("All")

  const [remoteOnly, setRemoteOnly] = useState(false)

  const [jobs, setJobs] = useState<ProgramCard[]>([])

  const [selected, setSelected] = useState<ProgramCard | null>(null)

  const [applyTarget, setApplyTarget] = useState<ProgramCard | null>(null)

  const [error, setError] = useState("")

  const [loading, setLoading] = useState(true)

  const [retryCount, setRetryCount] = useState(0)

  const [selectionNotice, setSelectionNotice] = useState("")

  const initialProgramId = useRef(initialSelectedProgramId)

  const initialSelectionHandled = useRef(false)

  const onInitialSelectionHandledRef = useRef(onInitialSelectionHandled)

  const shouldRevealDetailsRef = useRef(false)

  const mobileDetailsRef = useRef<HTMLElement>(null)

  const mobileDetailsTitleRef = useRef<HTMLHeadingElement>(null)

  onInitialSelectionHandledRef.current = onInitialSelectionHandled

  const revealMobileDetails = useCallback(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return

    mobileDetailsRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",

      block: "start",
    })

    mobileDetailsTitleRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    let active = true

    setLoading(true)

    listPrograms("", filter)

      .then((programs) => {
        if (!active) return

        const cards = programs.map(toProgramCard)

        setJobs(cards)

        const requestedProgram = initialProgramId.current
          ? cards.find((item) => item.id === initialProgramId.current)
          : undefined

        shouldRevealDetailsRef.current = Boolean(requestedProgram)

        setSelected(
          requestedProgram ||
            cards.find((item) => item.id === selected?.id) ||
            cards[0] ||
            null,
        )

        if (initialProgramId.current && !initialSelectionHandled.current) {
          initialSelectionHandled.current = true

          if (!requestedProgram) {
            setSelectionNotice(
              "The opportunity you selected is no longer available. Browse the current programs below.",
            )
          }

          onInitialSelectionHandledRef.current?.()
        }

        setError("")
      })

      .catch((requestError) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load programs.",
          )
      })

      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [filter, retryCount])

  useEffect(() => {
    if (!selected || !shouldRevealDetailsRef.current) return

    shouldRevealDetailsRef.current = false

    revealMobileDetails()
  }, [revealMobileDetails, selected])

  const filtered = jobs.filter((j) => {
    const normalizedSearch = search.trim().toLowerCase()

    const matchSearch =
      !normalizedSearch ||
      [
        j.name,

        j.company,

        j.description,

        j.category,

        j.location,

        j.duration,

        ...j.skills,
      ].some((value) => value.toLowerCase().includes(normalizedSearch))

    const matchType = filter === "All" || j.type === filter

    const matchRemote = !remoteOnly || j.remote

    return matchSearch && matchType && matchRemote
  })

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-3.5rem)]">
      {/* List panel */}
      <div className="w-full lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-white">
        <div className="p-4 border-b border-border space-y-3">
          <h2
            className="font-bold text-base"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Browse Programs
          </h2>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search roles, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === t
                    ? "text-white"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
                style={
                  filter === t
                    ? {
                        background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                      }
                    : {}
                }
              >
                {t}
              </button>
            ))}
          </div>
          <label
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setRemoteOnly(!remoteOnly)}
          >
            <div
              className="w-9 h-5 rounded-full transition-colors relative"
              style={{ background: remoteOnly ? "#2D3561" : "#e5e7eb" }}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  remoteOnly ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-xs text-muted-foreground">Remote only</span>
          </label>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <p className="px-4 py-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {error && (
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mx-4 mb-3 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Retry loading programs
            </button>
          )}
          {selectionNotice && (
            <p
              className="mx-4 mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              role="status"
            >
              {selectionNotice}
            </p>
          )}
          {loading && (
            <div
              className="space-y-3 p-4"
              aria-label="Loading programs"
              aria-live="polite"
            >
              <ProgramListSkeleton />
              <ProgramListSkeleton />
              <ProgramListSkeleton />
            </div>
          )}
          <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground">
            {filtered.length} programs found
          </p>
          {!loading && !error && filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No programs match your search and filters.
            </p>
          )}
          {!loading &&
            filtered.map((job) => (
              <button
                key={job.id}
                onClick={() => {
                  shouldRevealDetailsRef.current = false

                  setSelected(job)

                  revealMobileDetails()
                }}
                className={`w-full text-left px-4 py-3.5 border-b border-border hover:bg-muted/30 transition-colors ${
                  selected?.id === job.id ? "bg-secondary" : ""
                }`}
                aria-pressed={selected?.id === job.id}
                style={
                  selected?.id === job.id
                    ? { borderLeft: "3px solid #2D3561" }
                    : {}
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: job.color,

                      color: ["#F5B731", "#FBBF24"].includes(job.color)
                        ? "#1a1f3a"
                        : "white",
                    }}
                  >
                    {job.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{job.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.company} · {job.location}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {job.status}
                      </span>
                      <span className="lg:hidden text-[10px] font-semibold text-primary ml-auto">
                        View details
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {selected && (
        <section
          ref={mobileDetailsRef}
          className="lg:hidden bg-cream p-4 sm:p-6"
          aria-labelledby="mobile-program-details-title"
        >
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              {selected.category}
            </p>
            <h2
              ref={mobileDetailsTitleRef}
              id="mobile-program-details-title"
              tabIndex={-1}
              className="mt-2 text-xl font-bold text-primary"
            >
              {selected.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.company} · {selected.location}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ProgramDetail
                label="Duration"
                value={selected.duration || "Not specified"}
              />
              <ProgramDetail
                label="Deadline"
                value={
                  selected.deadline
                    ? new Date(selected.deadline).toLocaleDateString()
                    : "Not specified"
                }
              />
            </div>
            {selected.tags.length > 0 && (
              <div
                className="mt-4 flex flex-wrap gap-2"
                aria-label="Required skills"
              >
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h3 className="mt-5 font-semibold">About this role</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {selected.desc ||
                "No description has been provided for this program."}
            </p>
            <button
              type="button"
              onClick={() => setApplyTarget(selected)}
              className="mt-5 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Apply Now
            </button>
          </div>
        </section>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="hidden lg:flex flex-1 flex-col overflow-y-auto bg-cream">
          <div className="p-8 border-b border-border bg-white">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: selected.color,

                  color: ["#F5B731", "#FBBF24"].includes(selected.color)
                    ? "#1a1f3a"
                    : "white",
                }}
              >
                {selected.logo}
              </div>
              <div className="flex-1">
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {selected.name}
                </h2>
                <p className="text-muted-foreground">
                  {selected.company} · {selected.location}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 bg-secondary rounded-full font-medium"
                      style={{ color: "#2D3561" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                ["Duration", selected.duration],

                [
                  "Deadline",
                  selected.deadline
                    ? new Date(selected.deadline).toLocaleDateString()
                    : "Not specified",
                ],

                ["Format", selected.remote ? "Remote" : "On-site"],
              ].map(([label, value]) => (
                <div key={label} className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-semibold text-sm">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setApplyTarget(selected)}
              className="px-8 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
              }}
            >
              Apply Now
            </button>
          </div>

          <div className="p-8">
            <h3 className="font-semibold mb-3">About this role</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {selected.desc}
            </p>

            <h3 className="font-semibold mb-3">Requirements</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              {[
                "Currently enrolled in a university (Level 200–400)",

                "Strong communication skills",

                `Familiarity with ${selected.tags.join(", ")}`,

                "Minimum CGPA of 3.0 / 5.0",

                "Available for at least 3 months",
              ].map((r) => (
                <li key={r} className="flex gap-2">
                  <span style={{ color: "#10B981" }}>✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {applyTarget && (
        <ApplyFormModal
          prefilledCompany={applyTarget.company}
          prefilledRole={applyTarget.name}
          programId={applyTarget.id}
          ownerEmail={user.email}
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  )
}

interface ProgramDetailProps {
  label: string
  value: string
}

function ProgramDetail({ label, value }: ProgramDetailProps) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function ProgramListSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4" aria-hidden="true">
      <div className="motion-safe:animate-pulse">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
        <div className="mt-3 h-3 w-2/3 rounded bg-muted" />
      </div>
    </div>
  )
}
