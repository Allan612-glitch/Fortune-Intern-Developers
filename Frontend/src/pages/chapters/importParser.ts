import type { Chapter, Executive } from "../../services/chapters"
import { newSeatsFor, slug } from "./data"

export type ImportRecord = {
  chapter: string
  name: string
  role: string
  email: string
  phone: string
  bio: string
}

export type ImportResult = {
  records: ImportRecord[]
  /** Chapters found in the text that do not exist yet. */
  newChapters: Chapter[]
  /** Empty seats for those new chapters. */
  newSeats: Executive[]
  notice?: string
}

const ROLE_KEYS: [string, string][] = [
  ["ambassador", "Campus Ambassador"],
  ["president", "Chapter President"],
  ["vice president", "Vice President / Operations Lead"],
  ["operations lead", "Vice President / Operations Lead"],
  ["deputy general", "Deputy General Secretary"],
  ["deputy secretary", "Deputy General Secretary"],
  ["general secretary", "General Secretary"],
  ["secretary", "General Secretary"],
  ["financial", "Financial Secretary & Treasurer"],
  ["treasurer", "Financial Secretary & Treasurer"],
  ["public relations", "PR & Communications Director"],
  ["communications", "PR & Communications Director"],
  ["media", "Media Head"],
  ["graphic", "Graphic Designer"],
  ["designer", "Graphic Designer"],
  ["program", "Programs & Training Coordinator"],
  ["training", "Programs & Training Coordinator"],
  ["patron", "Chapter Patron"],
]

export function normRole(s: string) {
  const l = String(s).toLowerCase()
  for (const [key, role] of ROLE_KEYS) {
    if (l.includes(key)) return role
  }
  return String(s).trim()
}

export function parseImport(
  text: string,
  defaultChapter: string,
  chapters: Chapter[],
): ImportResult {
  const records: ImportRecord[] = []
  const workChapters = [...chapters]
  const newSeats: Executive[] = []
  let current = defaultChapter || "knust"
  const trimmed = text.trim()
  let notice: string | undefined

  const finish = (): ImportResult => ({
    records,
    newChapters: workChapters.slice(chapters.length),
    newSeats,
    notice,
  })

  // A line such as "KNUST Chapter" names the chapter for the lines below it.
  const matchChapter = (line: string): string | null => {
    const l = line
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .trim()
    for (const ch of workChapters) {
      const nm = ch.name.toLowerCase().replace(/ chapter$/, "")
      const ins = ch.inst.toLowerCase()
      if (
        l === nm ||
        l === `${nm} chapter` ||
        (l.indexOf(nm) === 0 && l.length < nm.length + 14)
      ) {
        return ch.id
      }
      if (ins.length > 8 && l.includes(ins)) return ch.id
    }
    if (/chapter\s*$/i.test(line.trim()) && line.trim().length < 70) {
      const name = line.trim()
      const existing = workChapters.find(
        (ch) => ch.name.toLowerCase() === name.toLowerCase(),
      )
      if (existing) return existing.id
      const id = slug(name)
      workChapters.push({
        id,
        name,
        inst: name.replace(/ chapter$/i, ""),
        city: "",
        region: "",
        type: "Other Institution",
      })
      newSeats.push(...newSeatsFor(id, "i"))
      return id
    }
    return null
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(trimmed)
      const list: unknown[] = Array.isArray(json)
        ? json
        : Array.isArray((json as { executives?: unknown }).executives)
          ? ((json as { executives: unknown[] }).executives)
          : []
      list.forEach((item) => {
        const o = (item ?? {}) as Record<string, unknown>
        records.push({
          chapter: typeof o.chapter === "string" && o.chapter ? o.chapter : current,
          name: typeof o.name === "string" ? o.name : "",
          role: normRole(typeof o.role === "string" && o.role ? o.role : "Executive"),
          email: typeof o.email === "string" ? o.email : "",
          phone: typeof o.phone === "string" ? o.phone : "",
          bio: typeof o.bio === "string" ? o.bio : "",
        })
      })
      return finish()
    } catch {
      notice = "Input is not valid JSON; trying directory text parsing."
    }
  }

  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim()
    if (!line || /^[-=_*•]{3,}$/.test(line)) return

    const chapterId = matchChapter(line)
    if (chapterId && !/[:|]/.test(line) && line.split(/\s+/).length <= 9) {
      current = chapterId
      return
    }

    const email = (line.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [""])[0]
    const phone = (line.match(/(\+?233|0)\d[\d\s-]{7,12}\d/) || [""])[0]
    const parts = line
      .replace(email, "")
      .replace(phone, "")
      .split(/\s*[|,;\t]\s*|\s+[—–-]\s+|:\s*/)
      .map((s) => s.replace(/^[\s•\-*\d.]+/, "").trim())
      .filter(Boolean)

    if (parts.length < 2) {
      const only = parts[0]
      if (parts.length === 1 && only && only.split(/\s+/).length >= 2 && only.length < 48) {
        records.push({ chapter: current, name: only, role: "Executive Member", email, phone, bio: "" })
      }
      return
    }

    let roleIndex = -1
    for (let i = 0; i < parts.length && roleIndex === -1; i += 1) {
      const l = (parts[i] ?? "").toLowerCase()
      if (ROLE_KEYS.some(([key]) => l.includes(key))) roleIndex = i
    }

    let role: string
    let name: string
    if (roleIndex > -1) {
      role = normRole(parts[roleIndex] ?? "")
      name = parts.filter((_, i) => i !== roleIndex).join(" ").trim()
    } else {
      role = normRole(parts[1] ?? "")
      name = parts[0] ?? ""
    }
    if (!name || name.length > 60) return
    if (/^(name|role|chapter)$/i.test(name)) return
    records.push({ chapter: current, name, role, email, phone, bio: "" })
  })

  return finish()
}
