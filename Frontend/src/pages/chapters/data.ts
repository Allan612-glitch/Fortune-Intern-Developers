import type { Chapter, Executive, Founder } from "../../services/chapters"

export const CHAPTER_TYPES = [
  "Public University",
  "Technical University",
  "Private / Specialised",
  "Other Institution",
] as const

export const FOUNDERS_STORAGE_KEY = "fin_found_v6"
export const BLUEPRINT_STORAGE_KEY = "fin_bp_v6"

const c = (
  id: string,
  name: string,
  inst: string,
  city: string,
  region: string,
  type: (typeof CHAPTER_TYPES)[number],
): Chapter => ({ id, name, inst, city, region, type })

// Starting list. It is only used to seed the shared directory the very first
// time an administrator opens the page and the server has nothing saved yet.
export const CHAPTERS: Chapter[] = [
  c("ug", "University of Ghana Chapter", "University of Ghana (UG), Legon", "Legon", "Greater Accra", "Public University"),
  c("knust", "KNUST Chapter", "Kwame Nkrumah University of Science and Technology", "Kumasi", "Ashanti", "Public University"),
  c("ucc", "UCC Chapter", "University of Cape Coast", "Cape Coast", "Central", "Public University"),
  c("uew", "UEW Chapter", "University of Education, Winneba", "Winneba", "Central", "Public University"),
  c("uds", "UDS Chapter", "University for Development Studies", "Tamale", "Northern", "Public University"),
  c("umat", "UMaT Chapter", "University of Mines and Technology", "Tarkwa", "Western", "Public University"),
  c("uhas", "UHAS Chapter", "University of Health and Allied Sciences", "Ho", "Volta", "Public University"),
  c("uenr", "UENR Chapter", "University of Energy and Natural Resources", "Sunyani", "Bono", "Public University"),
  c("uesd", "UESD Chapter", "University of Environment and Sustainable Development", "Somanya", "Eastern", "Public University"),
  c("gctu", "GCTU Chapter", "Ghana Communication Technology University", "Accra", "Greater Accra", "Public University"),
  c("upsa", "UPSA Chapter", "University of Professional Studies, Accra", "Accra", "Greater Accra", "Public University"),
  c("cktutas", "CKT-UTAS Chapter", "C.K. Tedam University of Technology and Applied Sciences", "Navrongo", "Upper East", "Public University"),
  c("sddubids", "SDD-UBIDS Chapter", "Simon Diedong Dombo University of Business and Integrated Development Studies", "Wa", "Upper West", "Public University"),
  c("aamusted", "AAMUSTED Chapter", "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development", "Kumasi", "Ashanti", "Public University"),
  c("atu", "Accra Technical University Chapter", "Accra Technical University", "Accra", "Greater Accra", "Technical University"),
  c("kstu", "Kumasi Technical University Chapter", "Kumasi Technical University", "Kumasi", "Ashanti", "Technical University"),
  c("ttu", "Takoradi Technical University Chapter", "Takoradi Technical University", "Takoradi", "Western", "Technical University"),
  c("htu", "Ho Technical University Chapter", "Ho Technical University", "Ho", "Volta", "Technical University"),
  c("tatu", "Tamale Technical University Chapter", "Tamale Technical University", "Tamale", "Northern", "Technical University"),
  c("ktu", "Koforidua Technical University Chapter", "Koforidua Technical University", "Koforidua", "Eastern", "Technical University"),
  c("cctu", "Cape Coast Technical University Chapter", "Cape Coast Technical University", "Cape Coast", "Central", "Technical University"),
  c("stu", "Sunyani Technical University Chapter", "Sunyani Technical University", "Sunyani", "Bono", "Technical University"),
  c("btu", "Bolgatanga Technical University Chapter", "Bolgatanga Technical University", "Bolgatanga", "Upper East", "Technical University"),
  c("wtu", "Wa Technical University Chapter", "Wa Technical University", "Wa", "Upper West", "Technical University"),
  c("dhltu", "Dr. Hilla Limann Technical University Chapter", "Dr. Hilla Limann Technical University", "Tumu", "Upper West", "Technical University"),
  c("ashesi", "Ashesi University Chapter", "Ashesi University", "Berekuso", "Eastern", "Private / Specialised"),
  c("gimpa", "GIMPA Chapter", "Ghana Institute of Management and Public Administration", "Accra", "Greater Accra", "Private / Specialised"),
  c("central", "Central University Chapter", "Central University", "Miotso", "Greater Accra", "Private / Specialised"),
  c("vvu", "Valley View University Chapter", "Valley View University", "Oyibi", "Greater Accra", "Private / Specialised"),
  c("presby", "Presbyterian University Chapter", "Presbyterian University Ghana", "Abetifi", "Eastern", "Private / Specialised"),
  c("methodist", "Methodist University Chapter", "Methodist University Ghana", "Accra", "Greater Accra", "Private / Specialised"),
  c("pentecost", "Pentecost University Chapter", "Pentecost University", "Sowutuom", "Greater Accra", "Private / Specialised"),
  c("academiccity", "Academic City Chapter", "Academic City University College", "Accra", "Greater Accra", "Private / Specialised"),
  c("lancaster", "Lancaster University Ghana Chapter", "Lancaster University Ghana", "Accra", "Greater Accra", "Private / Specialised"),
  c("wisconsin", "Wisconsin International Chapter", "Wisconsin International University College", "Accra", "Greater Accra", "Private / Specialised"),
  c("allnations", "All Nations University Chapter", "All Nations University", "Koforidua", "Eastern", "Private / Specialised"),
  c("regent", "Regent University Chapter", "Regent University College of Science and Technology", "Accra", "Greater Accra", "Private / Specialised"),
  c("knutsford", "Knutsford University Chapter", "Knutsford University College", "Accra", "Greater Accra", "Private / Specialised"),
  c("zenith", "Zenith University Chapter", "Zenith University College", "Accra", "Greater Accra", "Private / Specialised"),
  c("datalink", "Data Link Institute Chapter", "Data Link Institute", "Tema", "Greater Accra", "Private / Specialised"),
  c("other", "Other Institution Chapter", "Colleges of Education, Nursing and other accredited institutions", "Nationwide", "Ghana", "Other Institution"),
]

export const ROLES: { role: string; resp: string[] }[] = [
  { role: "Campus Ambassador", resp: ["Represent FIN at the institution", "Drive campus strategy and administrative relations", "Lead chapter growth and partnerships"] },
  { role: "Chapter President", resp: ["Lead executive meetings and chapter strategy", "Align chapter goals with FIN Corporate", "Approve chapter creatives and reports"] },
  { role: "Vice President / Operations Lead", resp: ["Coordinate committees and internal workflows", "Verify figures before monthly submission", "Report placement numbers to Corporate"] },
  { role: "General Secretary", resp: ["Manage documentation, minutes and records", "Handle official correspondence", "File monthly reports with FIN Corporate"] },
  { role: "Deputy General Secretary", resp: ["Assist record keeping and administration", "Track member attendance and engagement", "Deputise in the Secretary absence"] },
  { role: "Financial Secretary & Treasurer", resp: ["Manage budget allocations and the ledger", "Track dues and issue receipts", "Prepare financial audit disclosures"] },
  { role: "PR & Communications Director", resp: ["Run communication campaigns", "Manage media partnerships and outreach", "Coordinate the chapter public voice"] },
  { role: "Media Head", resp: ["Capture live event media", "Schedule and publish content", "Publish highlights within 48 hours"] },
  { role: "Graphic Designer", resp: ["Produce flyers, decks and creatives", "Maintain the approved logo and colours", "Prepare communication templates"] },
  { role: "Programs & Training Coordinator", resp: ["Schedule every-3-weeks speaking cycles", "Run the one month skills bootcamp", "Coordinate placement drives"] },
  { role: "Chapter Patron", resp: ["Provide institutional and academic oversight", "Review escalated disciplinary matters", "Guide constitutional compliance"] },
]

export const FOUND_SEED: Founder[] = [
  { id: "f1", name: "Emmanuel Amoasi", title: "Founder & Managing Director", bio: "Founded Fortune Intern Network and leads national strategy, corporate partnerships and the campus chapter ecosystem.", email: "amoasie173@gmail.com", phone: "+233 25 703 8948", photo: null },
  { id: "f2", name: "Prof. Prince Boakye Frimpong", title: "Founding Patron", bio: "Senior academic faculty member providing institutional guidance, academic backing and administrative oversight since ratification.", email: "", phone: "+233 26 235 8269", photo: null },
  { id: "f3", name: "Mawuli Diekpor", title: "Founding General Secretary · KNUST", bio: "Kept the founding records, minutes and official correspondence of the first chapter at KNUST.", email: "", phone: "", photo: null },
  { id: "f4", name: "", title: "Founding Campus Ambassador · KNUST", bio: "Open founding seat — first institutional envoy of the network.", email: "", phone: "", photo: null },
  { id: "f5", name: "", title: "Founding Chapter President · KNUST", bio: "Open founding seat — first president of the pioneer chapter.", email: "", phone: "", photo: null },
  { id: "f6", name: "", title: "Founding Operations Lead", bio: "Open founding seat — first national operations coordinator.", email: "", phone: "", photo: null },
]

/** Eleven empty seats for one chapter. */
export function newSeatsFor(chapterId: string, idPrefix: string): Executive[] {
  const stamp = Date.now()
  return ROLES.map((r, i) => ({
    id: `${idPrefix}${stamp}${i}${idPrefix === "r" ? chapterId : ""}`,
    name: "",
    role: r.role,
    chapter: chapterId,
    status: "seat",
    email: "",
    phone: "",
    bio: "",
    resp: r.resp.slice(),
    photo: null,
  }))
}

/** The full starting set of seats for every starting chapter. */
export function buildSeats(): Executive[] {
  const out: Executive[] = []
  let n = 0
  CHAPTERS.forEach((chapter) => {
    ROLES.forEach((r) => {
      n += 1
      out.push({
        id: `s${n}`,
        name: "",
        role: r.role,
        chapter: chapter.id,
        status: "seat",
        email: "",
        phone: "",
        bio: "",
        resp: r.resp.slice(),
        photo: null,
      })
    })
  })
  const knustSecretary = out.find(
    (e) => e.chapter === "knust" && e.role === "General Secretary",
  )
  if (knustSecretary) {
    Object.assign(knustSecretary, {
      name: "Mawuli Diekpor",
      status: "active",
      bio: "General Secretary of the KNUST Chapter. Keeps chapter records, minutes and official correspondence in order.",
    })
  }
  return out
}

export function slug(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
}

export function initials(name: string) {
  if (!name) return "FIN"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

export function displayName(e: Executive) {
  return e.name || e.role
}

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

/** Returns an error message if the browser refused to save, otherwise null. */
export function saveLocal(key: string, value: unknown): string | null {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "storage unavailable"
  }
}

/** Shrinks a photo to at most 900px and returns it as a JPEG data URL. */
export function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Image too large — keep under 10 MB"))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read that image"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Could not read that image"))
      img.onload = () => {
        const max = 900
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Could not read that image"))
          return
        }
        context.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
