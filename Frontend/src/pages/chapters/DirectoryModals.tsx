import { useEffect, useState } from "react"
import {
  createPositionApplication,
  listAllPositionApplications,
  listMyPositionApplications,
  updatePositionApplicationStatus,
  type ApplicationStatus,
  type Chapter,
  type Executive,
  type Founder,
  type PositionApplication,
} from "../../services/chapters"
import {
  CHAPTER_TYPES,
  buildSeats,
  newSeatsFor,
  processImage,
  slug,
} from "./data"
import { parseImport } from "./importParser"
import { btnDanger, btnGold, btnSmallPrimary, btnSoft, inputClass } from "./styles"
import { Field, Modal, PhotoBox, Select, TextArea, TextInput } from "./ui"
import type { ToastFn } from "./useChaptersData"

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

function PhotoPicker(props: {
  photo: string | null
  name: string
  onChange: (photo: string | null) => void
  toast: ToastFn
}) {
  const { photo, name, onChange, toast } = props
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-3.5">
      <PhotoBox
        photo={photo}
        name={name}
        className="h-[74px] w-[74px] shrink-0 rounded-2xl border-2 border-accent"
        textClass="text-2xl"
      />
      <label className={`${btnSoft} cursor-pointer`}>
        Upload photo
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            input.value = ""
            if (!file) return
            processImage(file)
              .then(onChange)
              .catch((error: unknown) => toast(messageOf(error, "Could not read that image")))
          }}
        />
      </label>
      <button type="button" className={btnSoft} onClick={() => onChange(null)}>
        Remove
      </button>
    </div>
  )
}

/* ---------- Edit or add an executive seat ---------- */

export type SeatValues = Omit<Executive, "id">

export function ExecutiveModal(props: {
  executive: Executive | null
  defaultChapter: string
  chapters: Chapter[]
  onClose: () => void
  onSave: (values: SeatValues) => void
  onDelete: () => void
  toast: ToastFn
}) {
  const { executive, defaultChapter, chapters, onClose, onSave, onDelete, toast } = props
  const [name, setName] = useState(executive?.name ?? "")
  const [role, setRole] = useState(executive?.role ?? "")
  const [chapter, setChapter] = useState(executive?.chapter ?? defaultChapter)
  const [status, setStatus] = useState(executive?.status ?? "seat")
  const [email, setEmail] = useState(executive?.email ?? "")
  const [phone, setPhone] = useState(executive?.phone ?? "")
  const [bio, setBio] = useState(executive?.bio ?? "")
  const [resp, setResp] = useState(executive?.resp?.join("\n") ?? "")
  const [photo, setPhoto] = useState<string | null>(executive?.photo ?? null)

  const save = () => {
    const trimmedRole = role.trim()
    if (!trimmedRole) {
      toast("A role is required")
      return
    }
    const trimmedName = name.trim()
    onSave({
      name: trimmedName,
      role: trimmedRole,
      chapter,
      status: trimmedName ? status : "seat",
      email: email.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      resp: resp.split("\n").map((line) => line.trim()).filter(Boolean),
      photo,
    })
  }

  return (
    <Modal
      title={executive ? executive.name || executive.role : "New seat"}
      description="Profile, role and photo. Changes are saved to the shared directory."
      onClose={onClose}
    >
      <PhotoPicker photo={photo} name={name || role} onChange={setPhoto} toast={toast} />
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="Full name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Blank = open seat" />
        </Field>
        <Field label="Role / position">
          <TextInput value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label="Chapter">
          <Select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="seat">Seat open</option>
          </Select>
        </Field>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      <Field label="Short bio">
        <TextArea value={bio} onChange={(e) => setBio(e.target.value)} />
      </Field>
      <Field label="Responsibilities (one per line)">
        <TextArea value={resp} onChange={(e) => setResp(e.target.value)} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-2">
        {executive ? (
          <button type="button" className={`${btnDanger} flex-1`} onClick={onDelete}>
            Delete
          </button>
        ) : null}
        <button type="button" className={`${btnSoft} flex-1`} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={`${btnGold} flex-1`} onClick={save}>
          Save
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Add a chapter ---------- */

export function ChapterModal(props: {
  onClose: () => void
  onCreate: (chapter: Chapter, seats: Executive[]) => void
  toast: ToastFn
}) {
  const { onClose, onCreate, toast } = props
  const [name, setName] = useState("")
  const [inst, setInst] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [type, setType] = useState<string>(CHAPTER_TYPES[0])

  const create = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast("Chapter name is required")
      return
    }
    const id = `${slug(trimmed)}-${Date.now().toString().slice(-4)}`
    onCreate(
      { id, name: trimmed, inst: inst.trim() || trimmed, city: city.trim(), region: region.trim(), type },
      newSeatsFor(id, "n"),
    )
  }

  return (
    <Modal title="Add a Chapter" description="An eleven seat executive board is created automatically." onClose={onClose}>
      <Field label="Chapter name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UCC Chapter" />
      </Field>
      <Field label="Institution full name">
        <TextInput value={inst} onChange={(e) => setInst(e.target.value)} />
      </Field>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="City / Town">
          <TextInput value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Region">
          <TextInput value={region} onChange={(e) => setRegion(e.target.value)} />
        </Field>
      </div>
      <Field label="Type">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {CHAPTER_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={`${btnSoft} flex-1`} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={`${btnGold} flex-1`} onClick={create}>
          Create Chapter
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Import the master directory ---------- */

export function ImportModal(props: {
  chapters: Chapter[]
  executives: Executive[]
  onClose: () => void
  onApply: (chapters: Chapter[], executives: Executive[], message: string) => void
  toast: ToastFn
}) {
  const { chapters, executives, onClose, onApply, toast } = props
  const [text, setText] = useState("")
  const [chapterId, setChapterId] = useState(
    chapters.some((c) => c.id === "knust") ? "knust" : (chapters[0]?.id ?? ""),
  )
  const [mode, setMode] = useState<"merge" | "replace">("merge")
  const [summary, setSummary] = useState<string[] | null>(null)
  const [hint, setHint] = useState("Nothing parsed yet.")

  const chapterName = (id: string, extra: Chapter[]) =>
    [...chapters, ...extra].find((c) => c.id === id)?.name ?? id

  const preview = () => {
    if (!text.trim()) {
      setSummary(null)
      setHint("Paste some text first.")
      return
    }
    const result = parseImport(text, chapterId, chapters)
    if (result.notice) toast(result.notice)
    const touched = new Set(result.records.map((r) => r.chapter))
    setHint(`${result.records.length} records across ${touched.size} chapters.`)
    const lines = result.records
      .slice(0, 12)
      .map((r) => `${chapterName(r.chapter, result.newChapters)} → ${r.name} · ${r.role}`)
    if (result.records.length > 12) lines.push(`…and ${result.records.length - 12} more`)
    setSummary(lines)
  }

  const apply = () => {
    // Always read the text as it is now, so the import matches what is on screen.
    const result = text.trim() ? parseImport(text, chapterId, chapters) : null
    if (result?.notice) toast(result.notice)
    if (!result || !result.records.length) {
      toast("Nothing to import — check the format")
      return
    }
    const nextChapters = [...chapters, ...result.newChapters]
    let directory = [...executives, ...result.newSeats].map((e) => ({ ...e }))
    if (mode === "replace") {
      directory = buildSeats()
      nextChapters.forEach((c) => {
        if (!directory.some((e) => e.chapter === c.id)) directory.push(...newSeatsFor(c.id, "r"))
      })
    }
    let filled = 0
    let added = 0
    result.records.forEach((p) => {
      const slot =
        directory.find((e) => e.chapter === p.chapter && e.role === p.role && !e.name) ??
        directory.find((e) => e.chapter === p.chapter && e.role === p.role)
      if (slot) {
        slot.name = p.name
        slot.status = "active"
        if (p.email) slot.email = p.email
        if (p.phone) slot.phone = p.phone
        if (p.bio) slot.bio = p.bio
        filled += 1
      } else {
        directory.push({
          id: `p${Date.now()}${added}`,
          name: p.name,
          role: p.role,
          chapter: p.chapter,
          status: "active",
          email: p.email,
          phone: p.phone,
          bio: p.bio,
          resp: [],
          photo: null,
        })
        added += 1
      }
    })
    onApply(nextChapters, directory, `Imported: ${filled} filled, ${added} added`)
  }

  return (
    <Modal
      title="Import the Master Directory"
      description="Paste the directory text from your Word file. Chapters, names, roles, emails and phones are detected automatically."
      onClose={onClose}
    >
      <div className="mb-3.5 rounded-xl border border-accent/50 bg-accent/10 p-3.5 text-xs leading-7 text-foreground">
        Accepted formats:
        <br />
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">KNUST Chapter</code> heading on its own line
        <br />
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">Campus Ambassador: Ama Mensah</code>
        <br />
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">Ama Mensah — Media Head — ama@fin.com — 0240000000</code>
        <br />
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">Name, Role, Chapter, Email, Phone</code> CSV, or a JSON array.
      </div>
      <Field label="Paste text, CSV or JSON">
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste here…"
          className="min-h-48 font-mono text-xs leading-6"
        />
      </Field>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="Default chapter">
          <Select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mode">
          <Select value={mode} onChange={(e) => setMode(e.target.value === "replace" ? "replace" : "merge")}>
            <option value="merge">Merge — fill open seats</option>
            <option value="replace">Replace — rebuild boards</option>
          </Select>
        </Field>
      </div>
      <div className="mt-3 max-h-44 overflow-auto rounded-xl border border-border bg-surface p-3.5 text-xs leading-7 text-muted-foreground">
        {summary ? (
          <>
            <b>{hint}</b>
            <div className="mt-2">
              {summary.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </>
        ) : (
          hint
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={`${btnSoft} flex-1`} onClick={preview}>
          Preview
        </button>
        <button type="button" className={`${btnSoft} flex-1`} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={`${btnGold} flex-1`} onClick={apply}>
          Apply Import
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Apply for an open position ---------- */

export function PositionApplicationModal(props: {
  position: { chapterId: string; chapterName: string; positionTitle: string }
  onClose: () => void
  toast: ToastFn
}) {
  const { position, onClose, toast } = props
  const [motivation, setMotivation] = useState("")
  const [sending, setSending] = useState(false)

  const submit = () => {
    const text = motivation.trim()
    if (text.length < 20) {
      toast("Please write at least 20 characters about your interest.")
      return
    }
    setSending(true)
    createPositionApplication({
      chapter_id: position.chapterId,
      chapter_name: position.chapterName,
      position_title: position.positionTitle,
      motivation: text,
    })
      .then(() => {
        toast("Your application was submitted to FIN administrators.")
        onClose()
      })
      .catch((error: unknown) => {
        setSending(false)
        toast(messageOf(error, "Could not submit your application."))
      })
  }

  return (
    <Modal
      title="Apply for a chapter position"
      description={`${position.chapterName} · ${position.positionTitle}`}
      onClose={onClose}
    >
      <Field label="Why are you interested in this role?">
        <TextArea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          minLength={20}
          maxLength={4000}
          required
          placeholder="Share your relevant experience, skills, and what you would contribute."
        />
      </Field>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={`${btnSoft} flex-1`} onClick={onClose}>
          Cancel
        </button>
        <button type="button" disabled={sending} className={`${btnGold} flex-1`} onClick={submit}>
          Submit application
        </button>
      </div>
    </Modal>
  )
}

/* ---------- My applications / review applications (admin) ---------- */

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
]

export function ApplicationsModal(props: { admin: boolean; onClose: () => void; toast: ToastFn }) {
  const { admin, onClose, toast } = props
  const [applications, setApplications] = useState<PositionApplication[] | null>(null)
  const [problem, setProblem] = useState("")
  const [chosen, setChosen] = useState<Record<string, ApplicationStatus>>({})

  useEffect(() => {
    let active = true
    const request = admin ? listAllPositionApplications() : listMyPositionApplications()
    request
      .then((list) => {
        if (active) setApplications(list)
      })
      .catch((error: unknown) => {
        if (active) setProblem(messageOf(error, "Could not load applications."))
      })
    return () => {
      active = false
    }
  }, [admin])

  const saveStatus = (application: PositionApplication) => {
    const status = chosen[application.id] ?? application.status
    updatePositionApplicationStatus(application.id, status)
      .then(() => {
        setApplications((current) =>
          current ? current.map((a) => (a.id === application.id ? { ...a, status } : a)) : current,
        )
        toast("Application status updated")
      })
      .catch((error: unknown) => toast(messageOf(error, "Could not update the status.")))
  }

  return (
    <Modal
      title={admin ? "Review position applications" : "My position applications"}
      description={
        admin
          ? "Review applicants and update each application status."
          : "Applications submitted from your FIN account."
      }
      onClose={onClose}
    >
      {problem ? (
        <p className="text-sm text-red-700">{problem}</p>
      ) : applications === null ? (
        <p className="text-sm text-muted-foreground">Loading applications…</p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No position applications yet.</p>
      ) : (
        applications.map((a) => (
          <article key={a.id} className="my-3 rounded-xl border border-border p-3.5">
            <b className="text-primary">
              {a.chapter_name} · {a.position_title}
            </b>
            <p className="text-sm text-muted-foreground">
              Status: {a.status.replace("_", " ")} · {new Date(a.created_at).toLocaleDateString()}
            </p>
            {admin ? (
              <p className="text-sm">
                <b>{a.applicant_name || "FIN member"}</b> · {a.applicant_email || ""}
              </p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{a.motivation}</p>
            {admin ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  className={`${inputClass} max-w-48`}
                  aria-label={`Status for ${a.chapter_name} ${a.position_title}`}
                  value={chosen[a.id] ?? a.status}
                  onChange={(e) =>
                    setChosen((current) => ({ ...current, [a.id]: e.target.value as ApplicationStatus }))
                  }
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button type="button" className={btnSmallPrimary} onClick={() => saveStatus(a)}>
                  Save status
                </button>
              </div>
            ) : null}
          </article>
        ))
      )}
      <div className="mt-4">
        <button type="button" className={`${btnSoft} w-full`} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Founding team member ---------- */

export function FounderModal(props: {
  founder: Founder | null
  onClose: () => void
  onSave: (founder: Founder) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  toast: ToastFn
}) {
  const { founder, onClose, onSave, onDelete, toast } = props
  const [name, setName] = useState(founder?.name ?? "")
  const [title, setTitle] = useState(founder?.title ?? "")
  const [email, setEmail] = useState(founder?.email ?? "")
  const [phone, setPhone] = useState(founder?.phone ?? "")
  const [bio, setBio] = useState(founder?.bio ?? "")
  const [photo, setPhoto] = useState<string | null>(founder?.photo ?? null)
  const [busy, setBusy] = useState(false)

  const save = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast("A founding title is required")
      return
    }
    setBusy(true)
    onSave({
      id: founder?.id ?? `f${Date.now()}`,
      name: name.trim(),
      title: trimmedTitle,
      email: email.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      photo,
    })
      .then(() => {
        toast("Founding record saved")
        onClose()
      })
      .catch((error: unknown) => {
        setBusy(false)
        toast(messageOf(error, "Unable to save the founding profile."))
      })
  }

  const remove = () => {
    if (!founder) return
    setBusy(true)
    onDelete(founder.id)
      .then(() => {
        toast("Founding record deleted")
        onClose()
      })
      .catch((error: unknown) => {
        setBusy(false)
        toast(messageOf(error, "Unable to delete the founding profile."))
      })
  }

  return (
    <Modal
      title={founder ? founder.name || founder.title : "New founding member"}
      description="Founding registry record — kept separate from chapter boards."
      onClose={onClose}
    >
      <PhotoPicker photo={photo} name={name} onChange={setPhoto} toast={toast} />
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="Full name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Blank = open founding seat" />
        </Field>
        <Field label="Founding title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      <Field label="Bio">
        <TextArea value={bio} onChange={(e) => setBio(e.target.value)} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-2">
        {founder ? (
          <button type="button" disabled={busy} className={`${btnDanger} flex-1`} onClick={remove}>
            Delete
          </button>
        ) : null}
        <button type="button" className={`${btnSoft} flex-1`} onClick={onClose}>
          Cancel
        </button>
        <button type="button" disabled={busy} className={`${btnGold} flex-1`} onClick={save}>
          Save
        </button>
      </div>
    </Modal>
  )
}
