import { useCallback, useEffect, useRef, useState } from "react"
import {
  deleteFounderRecord,
  getChapterDirectory,
  listFounders,
  saveChapterDirectory,
  saveFounderRecord,
  type Chapter,
  type Executive,
  type Founder,
} from "../../services/chapters"
import {
  CHAPTERS,
  FOUNDERS_STORAGE_KEY,
  FOUND_SEED,
  buildSeats,
  loadLocal,
  saveLocal,
} from "./data"

export type LoadState = "loading" | "ready" | "empty" | "error"
export type ToastFn = (text: string, undo?: () => void) => void
export type Directory = { chapters: Chapter[]; executives: Executive[] }

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "unknown error"

function initialFounders(): Founder[] {
  const stored = loadLocal<Founder[] | null>(FOUNDERS_STORAGE_KEY, null)
  if (Array.isArray(stored) && stored.length) return stored
  saveLocal(FOUNDERS_STORAGE_KEY, FOUND_SEED)
  return FOUND_SEED.slice()
}

/**
 * Loads and saves the shared chapter directory and the founding team.
 * Same rules as the old chapters.js: everyone can read; only administrators can
 * change things. Directory edits are saved to the server after a short pause
 * (350 ms) so quick typing does not send a request for every keystroke.
 */
export function useChaptersData(isAdmin: boolean, toast: ToastFn) {
  const [directory, setDirectory] = useState<Directory>({ chapters: [], executives: [] })
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [founders, setFounders] = useState<Founder[]>(initialFounders)
  const [founderApi, setFounderApi] = useState(false)

  const latest = useRef<Directory>(directory)
  const saveTimer = useRef<number | undefined>(undefined)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const savePending = useRef(false)

  const syncDirectory = useCallback(() => {
    savePending.current = false
    queue.current = queue.current
      .catch(() => undefined)
      .then(() => saveChapterDirectory(latest.current))
      .then((saved) => {
        if (!saved || !Array.isArray(saved.chapters) || !Array.isArray(saved.executives)) {
          throw new Error("The server did not return the saved chapter directory.")
        }
        setLoadState("ready")
      })
      .catch((error: unknown) => {
        toast(`Chapter directory sync failed: ${errorText(error)}`)
      })
  }, [toast])

  /** Change the directory. Administrators' changes are saved to the server. */
  const updateDirectory = useCallback(
    (change: (current: Directory) => Directory) => {
      const next = change(latest.current)
      latest.current = next
      setDirectory(next)
      if (!isAdmin) return
      savePending.current = true
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(syncDirectory, 350)
    },
    [isAdmin, syncDirectory],
  )

  // If the person leaves the page with a save still waiting, send it now.
  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current)
      if (savePending.current) syncDirectory()
    },
    [syncDirectory],
  )

  useEffect(() => {
    let active = true
    const apply = (next: Directory) => {
      latest.current = next
      setDirectory(next)
    }

    getChapterDirectory()
      .then(async (saved) => {
        if (!active) return
        if (saved !== null) {
          if (!Array.isArray(saved.chapters) || !Array.isArray(saved.executives)) {
            throw new Error("The server returned an invalid chapter directory.")
          }
          apply({ chapters: saved.chapters, executives: saved.executives })
          setLoadState("ready")
          return
        }
        if (isAdmin) {
          // First time an administrator opens the page: publish the starting set.
          const seed = { chapters: CHAPTERS.slice(), executives: buildSeats() }
          apply(seed)
          setLoadState("ready")
          await saveChapterDirectory(seed)
          return
        }
        setLoadState("empty")
      })
      .catch((error: unknown) => {
        if (!active) return
        apply({ chapters: [], executives: [] })
        setLoadState("error")
        toast(`Chapter directory is unavailable: ${errorText(error)}`)
      })

    return () => {
      active = false
    }
  }, [isAdmin, toast])

  useEffect(() => {
    let active = true
    listFounders()
      .then((list) => {
        if (!active) return
        if (!Array.isArray(list)) throw new Error("Founding team API returned invalid data")
        setFounders(list)
        setFounderApi(true)
      })
      .catch(() => {
        if (!active) return
        setFounderApi(false)
        if (isAdmin) toast("Founding team service is unavailable. Editing is disabled.")
      })
    return () => {
      active = false
    }
  }, [isAdmin, toast])

  // Keep a copy of the founding team in this browser, like the old page did.
  useEffect(() => {
    const problem = saveLocal(FOUNDERS_STORAGE_KEY, founders)
    if (problem) toast(`Could not save local data: ${problem}`)
  }, [founders, toast])

  const saveFounder = useCallback(async (founder: Founder) => {
    const saved = await saveFounderRecord(founder)
    setFounders((current) =>
      current.some((f) => f.id === saved.id)
        ? current.map((f) => (f.id === saved.id ? saved : f))
        : [...current, saved],
    )
    return saved
  }, [])

  const deleteFounder = useCallback(async (id: string) => {
    await deleteFounderRecord(id)
    setFounders((current) => current.filter((f) => f.id !== id))
  }, [])

  return {
    chapters: directory.chapters,
    executives: directory.executives,
    loadState,
    founders,
    canEditFounders: isAdmin && founderApi,
    updateDirectory,
    saveFounder,
    deleteFounder,
  }
}
