import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  Code,
  Download,
  GraduationCap,
  MapPin,
  MessageCircle,
  Network,
  Pause,
  PenTool,
  Play,
  Radio,
  X,
  type LucideIcon,
} from "lucide-react"

import { listSiteImages, type SiteImageSlot } from "../../services/siteImages"

import {
  curriculumAsText,
  curriculumIntro,
  curriculumReferences,
  deskLink,
  events,
  finDoorways,
  labBuilds,
  labTracks,
  modules,
  partnerCampusPartnerships,
  partnerHowItWorks,
  partnerSectors,
  partners,
  programs,
  soonPrograms,
  type FinAreaId,
  type FinEvent,
  type FinEventIcon,
  type FinInfographic,
  type FinProgram,
} from "./finConnectData"

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Read once when the page loads; events before today are hidden.
const NOW = Date.now()
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function dayParts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return { day: String(day).padStart(2, "0"), month: `${MONTHS[month - 1]} ${year}` }
}

function isUpcoming(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day, 23, 59, 59).getTime() >= NOW
}

const pad = (value: number) => String(value).padStart(2, "0")

// Colour families from the original FIN CONNECT design.
type Tone = "green" | "navy" | "blue" | "orange" | "wine" | "gold"

const tones: Record<Tone, { c1: string; c2: string }> = {
  green: { c1: "#1E7A46", c2: "#0E4D2C" },
  navy: { c1: "#1B2A5E", c2: "#101C44" },
  blue: { c1: "#2C6FAE", c2: "#174B7E" },
  orange: { c1: "#E8722A", c2: "#B44E12" },
  wine: { c1: "#7A1F3D", c2: "#54122A" },
  gold: { c1: "#C8941F", c2: "#8F6A10" },
}

const toneGradient = (tone: Tone) =>
  `linear-gradient(135deg, ${tones[tone].c1}, ${tones[tone].c2})`

const dotPattern: CSSProperties = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.16) 1.6px, transparent 1.6px)",
  backgroundSize: "26px 26px",
}

const doorwayTones: Record<FinAreaId, Tone> = {
  programs: "orange",
  guide: "green",
  lab: "blue",
  partners: "wine",
}

// Accent colour of each detail window (headings and ticks).
const areaAccents: Record<FinAreaId, string> = {
  programs: "#C05617",
  guide: "#1E7A46",
  lab: "#2C6FAE",
  partners: "#7A1F3D",
}

const eventTones: Record<string, Tone> = {
  "summit-2026": "navy",
  "da-cohort-4": "blue",
  "gd-seminar": "orange",
  "launchpad-finale": "green",
  "networking-q1": "wine",
  "rc-conference": "gold",
  "lab-cohort-4": "blue",
  "partner-briefing": "wine",
}

const moduleTones: Record<number, Tone> = {
  0: "green",
  2: "blue",
  3: "orange",
  5: "wine",
}

const doorwayIcons: Record<FinAreaId, LucideIcon> = {
  programs: CalendarDays,
  guide: BookOpen,
  lab: Code,
  partners: Building2,
}

const eventIcons: Record<FinEventIcon, LucideIcon> = {
  cast: Radio,
  chart: BarChart3,
  pen: PenTool,
  cap: GraduationCap,
  net: Network,
  book: BookOpen,
  code: Code,
}

const moduleIcons: Record<number, LucideIcon> = {
  0: GraduationCap,
  2: BarChart3,
  3: Radio,
  5: Network,
}

// Which admin-uploaded photo (Admin > Images) belongs to which slide.
const doorwaySlots: Record<FinAreaId, SiteImageSlot> = {
  programs: "fin-connect-programs",
  guide: "fin-connect-guide",
  lab: "fin-connect-lab",
  partners: "fin-connect-partners",
}

const areaTitles: Record<FinAreaId, { kicker: string; title: string }> = {
  programs: { kicker: "Programs & Events", title: "Flagship programs & events" },
  guide: { kicker: "Career Guide", title: "FIN Career Guide — curriculum" },
  lab: { kicker: "FIN Developer Lab", title: "FIN Developer Lab" },
  partners: { kicker: "FIN Partners", title: "Partner ecosystem" },
}

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
const btnGold = `${btnBase} bg-accent text-accent-foreground hover:bg-amber-300 focus-visible:ring-primary`
const btnGoldOnDark = `${btnBase} bg-accent text-accent-foreground hover:bg-amber-300 focus-visible:ring-accent focus-visible:ring-offset-[var(--story-ink)]`
const btnNavy = `${btnBase} bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary`
const btnGhost = `${btnBase} border border-border bg-white text-primary hover:bg-secondary focus-visible:ring-primary`
const btnTone = `${btnBase} text-white hover:brightness-110 focus-visible:ring-primary`

const feeText = (program: FinProgram) => (program.fee ? `GHS ${program.fee}` : "Free")

function registerLink(program: FinProgram) {
  return deskLink(
    `Hello FIN desk, I would like to register for ${program.title} (${feeText(program)}).\nName:\nInstitution:\nChapter / City:`,
  )
}

const labLink = deskLink(
  "Hello FIN desk, I would like to apply to the FIN Developer Lab.\nName:\nTrack:\nPortfolio / GitHub link (optional):",
)

const inviteLink =
  "mailto:fortuneintern.gh@gmail.com?subject=Partnership%20Enquiry"

function downloadCurriculum() {
  const blob = new Blob([curriculumAsText()], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "FIN_Career_Guide_Curriculum.txt"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 400)
}

// ---------------------------------------------------------------------------
// Pieces used inside the detail windows
// ---------------------------------------------------------------------------

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[var(--acc,var(--gold-text))]">
      {children}
    </h4>
  )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <Check className="mt-1 size-4 shrink-0 text-[var(--acc,#0F9D6E)]" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Chip({ children, dashed = false }: { children: ReactNode; dashed?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        dashed
          ? "border border-dashed border-border text-muted-foreground"
          : "bg-secondary text-primary"
      }`}
    >
      {children}
    </span>
  )
}

function Infographic({
  data,
  icon: Icon,
  tone,
}: {
  data: FinInfographic
  icon: LucideIcon
  tone: Tone
}) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-white">
      <div
        className="relative flex items-center gap-2.5 px-4 py-3 text-white"
        style={{ background: toneGradient(tone) }}
      >
        <span className="pointer-events-none absolute inset-0" style={dotPattern} aria-hidden="true" />
        <Icon className="relative size-5" aria-hidden="true" />
        <b className="relative text-xs font-bold uppercase tracking-[0.12em]">{data.label}</b>
      </div>
      <div className="flex flex-wrap items-start gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {data.stats.map(([value, label]) => (
            <div
              key={label}
              className="min-w-24 rounded-xl border border-border bg-surface px-3 py-2 text-center"
            >
              <b
                className="block text-lg font-extrabold leading-tight"
                style={{ color: tones[tone].c1 }}
              >
                {value}
              </b>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="min-w-48 flex-1">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {data.chips.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{data.note}</p>
        </div>
      </div>
    </div>
  )
}

function EventCard({ event }: { event: FinEvent }) {
  const Icon = eventIcons[event.icon]
  const tone = eventTones[event.id] ?? "navy"
  const { day, month } = dayParts(event.date)
  const program =
    event.action.kind === "program"
      ? programs.find((item) => item.id === (event.action as { programId: string }).programId)
      : undefined
  const toneButton: CSSProperties = { background: tones[tone].c1 }

  let action: ReactNode = null
  if (event.action.kind === "program" && program) {
    action = (
      <a
        href={registerLink(program)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnTone} self-start`}
        style={toneButton}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        Register · {feeText(program)}
      </a>
    )
  } else if (event.action.kind === "lab") {
    action = (
      <a
        href={labLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnTone} self-start`}
        style={toneButton}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        Apply to join
      </a>
    )
  } else if (event.action.kind === "invite") {
    action = (
      <a href={inviteLink} className={`${btnTone} self-start`} style={toneButton}>
        Request an invite
      </a>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
      <div className="relative p-5 text-white" style={{ background: toneGradient(tone) }}>
        <span className="pointer-events-none absolute inset-0" style={dotPattern} aria-hidden="true" />
        <Icon className="relative size-12" strokeWidth={1.8} aria-hidden="true" />
        <div className="absolute right-4 top-4 rounded-xl bg-surface px-3.5 py-2 text-center shadow-md">
          <b className="block text-xl font-extrabold leading-none text-[#1B2A5E]">{day}</b>
          <span
            className="mt-1 block text-xs font-extrabold tracking-wide"
            style={{ color: tones[tone].c1 }}
          >
            {month}
          </span>
        </div>
        <h4 className="relative mt-3 pr-24 text-lg font-extrabold leading-snug">{event.title}</h4>
        <p className="relative mt-2 flex items-center gap-1.5 text-xs text-white/90">
          <MapPin className="size-3.5 shrink-0 fill-accent text-accent" aria-hidden="true" />
          {event.location}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{event.body}</p>
        {action}
      </div>
    </div>
  )
}

function UpcomingEvents({ area, emptyText }: { area: FinEvent["area"]; emptyText?: string }) {
  const items = events.filter((event) => event.area === area && isUpcoming(event.date))
  if (!items.length) {
    return emptyText ? <p className="text-sm text-muted-foreground">{emptyText}</p> : null
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Window bodies
// ---------------------------------------------------------------------------

function ProgramsBody({ onPick }: { onPick: (id: string) => void }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Every program below runs under the FIN Campus Chapter Blueprint, and the calendar carries the
        live cohorts and competitions. Tap any program for its educational lecture, career paths,
        notable beneficiaries and skill demand, then register through the FIN desk on WhatsApp. Fees
        are one time and shown before you register; free programs need no payment.
      </p>
      <SubHeading>Upcoming events & cohorts</SubHeading>
      <UpcomingEvents
        area="programs"
        emptyText="No dated events are open right now. Message the desk to hear about the next cohort."
      />
      <SubHeading>All programs</SubHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {programs.map((program) => (
          <button
            key={program.id}
            type="button"
            onClick={() => onPick(program.id)}
            className="rounded-2xl border border-border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--acc)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                program.fee
                  ? "bg-accent/20 text-[var(--gold-text)]"
                  : "bg-secondary text-primary"
              }`}
            >
              {feeText(program)}
            </span>
            <h4 className="mt-2 text-sm font-bold text-primary">{program.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{program.tag}</p>
          </button>
        ))}
        <div className="rounded-2xl border border-dashed border-border bg-surface p-4">
          <span className="inline-block rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
          <h4 className="mt-2 text-sm font-bold text-primary">More programs & events</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Openings reserved for content yet to be posted: {soonPrograms.join(", ")}.
          </p>
        </div>
      </div>
    </>
  )
}

function ProgramBody({ program }: { program: FinProgram }) {
  return (
    <>
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
          program.fee ? "bg-accent/20 text-[var(--gold-text)]" : "bg-secondary text-primary"
        }`}
      >
        Registration: {feeText(program)}
      </span>
      <SubHeading>Educational lecture — why it matters</SubHeading>
      <p className="text-sm leading-relaxed text-muted-foreground">{program.lecture}</p>
      <SubHeading>Jobs you can get</SubHeading>
      <CheckList items={program.jobs} />
      <SubHeading>Personalities who show the path</SubHeading>
      <CheckList items={program.people} />
      <SubHeading>Demand today</SubHeading>
      <p className="text-sm leading-relaxed text-muted-foreground">{program.demand}</p>
    </>
  )
}

function GuideBody() {
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">
        A modular and outcomes first curriculum for every chapter. Each module pairs measurable
        outcomes with contemporary online lessons, an evidence infographic, a practical lab, a graded
        assignment and one reflection question, all aligned to the blueprint cadence. Download it for
        classroom use.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{curriculumIntro}</p>
      {modules.map((module, index) => (
        <section key={module.title} className="mt-8">
          <h4 className="text-base font-bold text-primary">{module.title}</h4>
          {module.infographic && (
            <Infographic
              data={module.infographic}
              icon={moduleIcons[index] ?? BookOpen}
              tone={moduleTones[index] ?? "navy"}
            />
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{module.intro}</p>
          <SubHeading>Outcomes</SubHeading>
          <CheckList items={module.outcomes} />
          <SubHeading>Core lessons</SubHeading>
          <CheckList items={module.lessons} />
          <SubHeading>Practical lab</SubHeading>
          <p className="text-sm leading-relaxed text-muted-foreground">{module.lab}</p>
          <SubHeading>Assignment and assessment</SubHeading>
          <p className="text-sm leading-relaxed text-muted-foreground">{module.assignment}</p>
          <p className="mt-4 rounded-xl border-l-4 border-[var(--acc)] bg-secondary px-4 py-3 text-sm italic text-primary">
            Experimental question: {module.question}
          </p>
          <SubHeading>Blueprint alignment</SubHeading>
          <p className="text-sm leading-relaxed text-muted-foreground">{module.alignment}</p>
        </section>
      ))}
      <SubHeading>Contemporary sources and references</SubHeading>
      <p className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
        {curriculumReferences}
      </p>
    </>
  )
}

function LabBody() {
  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-base font-bold leading-snug text-white"
        style={{ background: "#0A3161" }}
      >
        <span className="pointer-events-none absolute inset-0" style={dotPattern} aria-hidden="true" />
        <span className="relative">
          “<span className="text-accent">We build productive, efficient and scalable digital solutions.</span>”
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The established software development and digital solutions chamber of the FIN Academy,
        offering services across software engineering, data analytics, ML and AI and all IT solutions.
      </p>
      <div className="mt-5">
        <UpcomingEvents area="lab" />
      </div>
      <Infographic
        icon={Code}
        tone="blue"
        data={{
          label: "Lab · Tracks & hiring loop",
          stats: [
            ["5", "Tracks"],
            ["7 days", "Shortlist reply"],
            ["1", "Shipped project / cycle"],
          ],
          chips: labTracks,
          note: "Latest ship: the FIN website ecosystem — portal, chapters, documents and FIN CONNECT.",
        }}
      />
      <SubHeading>What the lab builds</SubHeading>
      <CheckList items={labBuilds} />
      <SubHeading>Recent project</SubHeading>
      <p className="text-sm leading-relaxed text-muted-foreground">
        <b className="text-primary">The Fortune Intern Network website ecosystem:</b> portal,
        chapters directory, document studio for letters, assessments and certificates, and this FIN
        CONNECT experience.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {labTracks.map((track) => (
          <Chip key={track}>{track}</Chip>
        ))}
        <Chip dashed>Research track · soon</Chip>
      </div>
    </>
  )
}

function PartnersBody() {
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Organisations across banking, telecoms, energy, health, insurance, manufacturing,
        construction and media host FIN interns and work and study members. Openings remain for new
        partners each cycle.
      </p>
      <div className="mt-5">
        <UpcomingEvents area="partners" />
      </div>
      <Infographic
        icon={BarChart3}
        tone="wine"
        data={{
          label: "Partners · Coverage & target",
          stats: [
            [String(partners.length), "Host organisations"],
            [String(partnerSectors.length), "Sectors"],
            ["70%", "Placement target"],
          ],
          chips: partnerSectors,
          note: "The seventy percent placement target is set by the Campus Chapter Blueprint for eligible members.",
        }}
      />
      <SubHeading>Host organisations</SubHeading>
      <div className="flex flex-wrap gap-2">
        {partners.map((partner) => (
          <Chip key={partner}>{partner}</Chip>
        ))}
        <Chip dashed>Your organisation here · partner opening</Chip>
        <Chip dashed>More partners · soon</Chip>
      </div>
      <SubHeading>Strategic campus partnerships (Blueprint section 4)</SubHeading>
      <ul className="space-y-2">
        {partnerCampusPartnerships.map((item) => (
          <li key={item.title} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Check className="mt-1 size-4 shrink-0 text-[var(--acc)]" aria-hidden="true" />
            <span>
              <b className="text-primary">{item.title}:</b> {item.text}
            </span>
          </li>
        ))}
      </ul>
      <SubHeading>How partnership works</SubHeading>
      <CheckList items={partnerHowItWorks} />
    </>
  )
}

// ---------------------------------------------------------------------------
// The detail window
// ---------------------------------------------------------------------------

function FinDialog({ area, onClose }: { area: FinAreaId; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const suppressedCloseEventsRef = useRef(0)
  const [programId, setProgramId] = useState<string | null>(null)
  const program = programId ? programs.find((item) => item.id === programId) ?? null : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    closeButtonRef.current?.focus()
    return () => {
      if (dialog.open) {
        suppressedCloseEventsRef.current += 1
        dialog.close()
      }
    }
  }, [])

  useEffect(() => {
    dialogRef.current?.scrollTo({ top: 0 })
  }, [programId])

  const heading = program
    ? { kicker: "Program detail", title: program.title }
    : areaTitles[area]

  const iconButton =
    "flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"

  let body: ReactNode
  let footer: ReactNode = null
  if (program) {
    body = <ProgramBody program={program} />
    footer = (
      <>
        <a
          href={registerLink(program)}
          target="_blank"
          rel="noopener noreferrer"
          className={btnGold}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Register now · {feeText(program)}
        </a>
        <button type="button" onClick={() => setProgramId(null)} className={btnGhost}>
          Back to programs
        </button>
      </>
    )
  } else if (area === "programs") {
    body = <ProgramsBody onPick={setProgramId} />
  } else if (area === "guide") {
    body = <GuideBody />
    footer = (
      <button type="button" onClick={downloadCurriculum} className={btnGold}>
        <Download className="size-4" aria-hidden="true" />
        Download curriculum (.txt)
      </button>
    )
  } else if (area === "lab") {
    body = <LabBody />
    footer = (
      <a href={labLink} target="_blank" rel="noopener noreferrer" className={btnGold}>
        <MessageCircle className="size-4" aria-hidden="true" />
        Apply to join the Lab
      </a>
    )
  } else {
    body = <PartnersBody />
    footer = (
      <>
        <a href={inviteLink} className={btnGold}>
          Partner with FIN
        </a>
        <a
          href={deskLink("Hello FIN desk, I would like to talk about partnering with FIN.")}
          target="_blank"
          rel="noopener noreferrer"
          className={btnNavy}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          WhatsApp the desk
        </a>
      </>
    )
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="fin-dialog-title"
      style={{ "--acc": areaAccents[area] } as CSSProperties}
      onClose={() => {
        if (suppressedCloseEventsRef.current > 0) {
          suppressedCloseEventsRef.current -= 1
          return
        }
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-foreground shadow-lg backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-[#0A3161] px-5 py-4 text-white">
        {program && (
          <button
            type="button"
            onClick={() => setProgramId(null)}
            aria-label="Back to programs"
            className={iconButton}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{heading.kicker}</p>
          <h3 id="fin-dialog-title" className="mt-0.5 text-base font-bold leading-snug sm:text-lg">
            {heading.title}
          </h3>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close window"
          className={iconButton}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5 sm:p-6">{body}</div>
      {footer && (
        <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-border bg-surface px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  )
}

// ---------------------------------------------------------------------------
// The slider
// ---------------------------------------------------------------------------

const AUTOPLAY_MS = 6000

const sectionBackground =
  "radial-gradient(120% 80% at 80% -10%, rgba(245,183,49,0.18) 0%, transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(245,183,49,0.08) 0%, transparent 60%), linear-gradient(180deg, #06182e 0%, #0d2440 60%, #1a3a5c 100%)"

// Scattered circle field behind the heading: [cx, cy, r, colour, opacity]
const circles: [number, number, number, string, number][] = [
  [60, 120, 26, "#E8722A", 0.28], [140, 300, 14, "#F5B731", 0.35],
  [210, 80, 40, "#1E7A46", 0.22], [300, 220, 10, "#F5F5F0", 0.25],
  [360, 360, 30, "#7A1F3D", 0.25], [430, 120, 18, "#2C6FAE", 0.3],
  [520, 280, 44, "#F5B731", 0.2], [610, 90, 12, "#E8722A", 0.35],
  [660, 380, 22, "#1E7A46", 0.28], [740, 200, 34, "#7A1F3D", 0.2],
  [820, 340, 12, "#F5F5F0", 0.3], [880, 110, 26, "#2C6FAE", 0.26],
  [960, 260, 46, "#E8722A", 0.18], [1040, 140, 16, "#F5B731", 0.32],
  [1100, 330, 28, "#1E7A46", 0.24], [1160, 90, 10, "#7A1F3D", 0.3],
  [90, 430, 18, "#2C6FAE", 0.22], [250, 460, 12, "#F5B731", 0.28],
  [480, 450, 20, "#E8722A", 0.22], [700, 470, 14, "#1E7A46", 0.26],
  [900, 450, 24, "#F5B731", 0.18], [1080, 460, 12, "#2C6FAE", 0.26],
  [30, 260, 10, "#F5F5F0", 0.22], [560, 30, 8, "#F5F5F0", 0.25],
  [980, 40, 12, "#1E7A46", 0.22], [180, 180, 8, "#7A1F3D", 0.3],
]

function FinCarousel({
  photos,
  modalOpen,
  onOpen,
}: {
  photos: Partial<Record<SiteImageSlot, string>>
  modalOpen: boolean
  onOpen: (id: FinAreaId, trigger: HTMLElement) => void
}) {
  const count = finDoorways.length
  const [current, setCurrent] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const barRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef(0)
  const touchStartRef = useRef<number | null>(null)

  // Slides advance by themselves only when nothing says "wait": the visitor has
  // not paused, is not pointing at or focused inside the slider, no window is
  // open, and the device does not ask for reduced motion.
  const autoplay = !reduceMotion && !userPaused && !hovered && !focused && !modalOpen && count > 1

  const goTo = (index: number) => {
    elapsedRef.current = 0
    setCurrent(((index % count) + count) % count)
  }

  useEffect(() => {
    const bar = barRef.current
    if (!autoplay) {
      elapsedRef.current = 0
      if (bar) bar.style.transform = "scaleX(0)"
      return
    }
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      // Cap each step so a background tab does not make the slide jump on return.
      elapsedRef.current += Math.min(now - last, 100)
      last = now
      const ratio = Math.min(1, elapsedRef.current / AUTOPLAY_MS)
      if (bar) bar.style.transform = `scaleX(${ratio})`
      if (ratio >= 1) {
        elapsedRef.current = 0
        setCurrent((value) => (value + 1) % count)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [autoplay, count])

  const active = finDoorways[current]

  return (
    <>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="FIN CONNECT programs"
        tabIndex={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === "ArrowRight") {
            event.preventDefault()
            goTo(current + 1)
          } else if (event.key === "ArrowLeft") {
            event.preventDefault()
            goTo(current - 1)
          } else if (event.key === "Home") {
            event.preventDefault()
            goTo(0)
          } else if (event.key === "End") {
            event.preventDefault()
            goTo(count - 1)
          }
        }}
        onTouchStart={(event) => {
          touchStartRef.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current
          touchStartRef.current = null
          if (start === null) return
          const delta = (event.changedTouches[0]?.clientX ?? start) - start
          if (Math.abs(delta) > 50) goTo(delta < 0 ? current + 1 : current - 1)
        }}
        className="relative overflow-hidden rounded-3xl border border-accent/20 shadow-[0_24px_60px_-20px_rgba(6,24,46,0.55)] outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/25"
        style={{ background: "linear-gradient(180deg, rgba(13,36,64,0.5), rgba(6,24,46,0.7))" }}
      >
        <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-white/10" aria-hidden="true">
          <div
            ref={barRef}
            className="h-full w-full origin-left bg-accent"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        <div
          className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {finDoorways.map((doorway, index) => {
            const Icon = doorwayIcons[doorway.id]
            const tone = doorwayTones[doorway.id]
            const photo = photos[doorwaySlots[doorway.id]] ?? doorway.image
            const isActive = index === current
            return (
              <div
                key={doorway.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}: ${doorway.title}`}
                aria-hidden={!isActive}
                inert={!isActive}
                className="grid min-w-full shrink-0 basis-full md:grid-cols-[1.1fr_1fr]"
              >
                <div
                  className="relative min-h-56 overflow-hidden md:min-h-[24rem] lg:min-h-[30rem]"
                  style={{ background: toneGradient(tone) }}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0" style={dotPattern} aria-hidden="true" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon
                          className="size-20 text-white/90"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        />
                      </div>
                    </>
                  )}
                  <div
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(6,24,46,0.95)_0%,rgba(6,24,46,0.1)_70%,rgba(6,24,46,0)_100%)] md:bg-[linear-gradient(90deg,rgba(6,24,46,0)_0%,rgba(6,24,46,0.15)_55%,rgba(6,24,46,0.92)_100%)]"
                    aria-hidden="true"
                  />
                </div>
                <div
                  className="flex flex-col justify-center gap-4 p-7 sm:p-10 lg:p-12"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(26,58,92,0.6), rgba(13,36,64,0.85))",
                  }}
                >
                  <span className="self-start rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-accent-foreground">
                    {doorway.title}
                  </span>
                  <h3 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                    {doorway.title}
                  </h3>
                  <p className="max-w-[52ch] text-base leading-relaxed text-white/80">
                    {doorway.description}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-white/70">
                    <span className="text-xl leading-none text-accent" aria-hidden="true">
                      •
                    </span>
                    {doorway.meta}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => onOpen(doorway.id, event.currentTarget)}
                    className={`${btnGoldOnDark} mt-2 self-start`}
                  >
                    {doorway.cta}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => goTo(current - 1)}
          aria-label="Previous program"
          className="absolute left-2 top-28 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[rgba(6,24,46,0.55)] text-white backdrop-blur transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:left-4 sm:size-12 md:top-1/2"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => goTo(current + 1)}
          aria-label="Next program"
          className="absolute right-2 top-28 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[rgba(6,24,46,0.55)] text-white backdrop-blur transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-4 sm:size-12 md:top-1/2"
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 max-md:justify-center">
        <span
          className="min-w-20 text-sm font-semibold tracking-[0.1em] text-accent"
          aria-hidden="true"
        >
          {pad(current + 1)} / {pad(count)}
        </span>
        <div className="flex items-center" role="group" aria-label="Choose slide">
          {finDoorways.map((doorway, index) => (
            <button
              key={doorway.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to ${doorway.title}`}
              aria-current={index === current}
              className="grid size-11 place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span
                className={`h-2.5 rounded-full transition-all ${
                  index === current ? "w-7 bg-accent" : "w-2.5 bg-white/30 hover:bg-white/55"
                }`}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((value) => !value)}
              aria-pressed={userPaused}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[var(--story-paper)] transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {userPaused ? (
                <Play className="size-4" aria-hidden="true" />
              ) : (
                <Pause className="size-4" aria-hidden="true" />
              )}
              {userPaused ? "Play slideshow" : "Pause slideshow"}
            </button>
          )}
          <button
            type="button"
            onClick={(event) => onOpen("programs", event.currentTarget)}
            className="inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-1.5 text-sm font-semibold text-[var(--story-paper)] transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            See all programs
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <span className="sr-only" aria-live={autoplay ? "off" : "polite"}>
        Slide {current + 1} of {count}: {active.title}
      </span>
    </>
  )
}

// ---------------------------------------------------------------------------
// The landing page section
// ---------------------------------------------------------------------------

export default function FinConnectSection() {
  const [area, setArea] = useState<FinAreaId | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [photos, setPhotos] = useState<Partial<Record<SiteImageSlot, string>>>({})

  // Slide photos set by admins. They are fetched only when the section is about
  // to scroll into view, and any failure simply leaves the colour slides as they are.
  useEffect(() => {
    let active = true
    const load = () => {
      listSiteImages()
        .then((found) => {
          if (active) setPhotos(found)
        })
        .catch(() => undefined)
    }
    const node = sectionRef.current
    if (!node || !("IntersectionObserver" in window)) {
      load()
      return () => {
        active = false
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          load()
        }
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(node)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [])

  const openArea = (id: FinAreaId, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setArea(id)
  }

  return (
    <>
      <section
        ref={sectionRef}
        id="fin-connect"
        aria-labelledby="fin-connect-title"
        className="section-space relative isolate scroll-mt-[4.5rem] overflow-hidden text-[var(--story-paper)]"
        style={{ backgroundImage: sectionBackground }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0 -z-10 h-[min(600px,78%)] w-full"
          viewBox="0 0 1200 520"
          preserveAspectRatio="xMidYMin slice"
          aria-hidden="true"
        >
          {circles.map(([cx, cy, r, fill, opacity]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} opacity={opacity} />
          ))}
        </svg>
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
              One network, many doorways
            </p>
            <h2
              id="fin-connect-title"
              className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
            >
              FIN <span className="text-accent">CONNECT</span>
            </h2>
            <span className="mt-5 block h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
            <p className="mt-5 text-base leading-relaxed text-white/80">
              Slide through our live programs and pick the path that fits you, then jump straight
              into the programs, the curriculum, the Developer Lab or our partner ecosystem.
            </p>
          </div>

          <div className="mt-10">
            <FinCarousel photos={photos} modalOpen={area !== null} onOpen={openArea} />
          </div>
        </div>
      </section>

      {area && (
        <FinDialog
          area={area}
          onClose={() => {
            setArea(null)
            window.requestAnimationFrame(() => triggerRef.current?.focus())
          }}
        />
      )}
    </>
  )
}
