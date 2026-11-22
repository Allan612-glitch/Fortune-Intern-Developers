import { Camera } from "lucide-react"
import type { Founder } from "../../services/chapters"
import { downloadBlob } from "./exports"
import { processImage } from "./data"
import { btnSmallPrimary, btnSoft, cardClass, goldText } from "./styles"
import { PhotoBox } from "./ui"
import type { ToastFn } from "./useChaptersData"

export default function FoundersTab(props: {
  founders: Founder[]
  canEdit: boolean
  onAdd: () => void
  onEdit: (id: string) => void
  onSavePhoto: (founder: Founder) => Promise<unknown>
  toast: ToastFn
}) {
  const { founders, canEdit, onAdd, onEdit, onSavePhoto, toast } = props

  const changePhoto = (founder: Founder, input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = ""
    if (!file) return
    processImage(file)
      .then((photo) => onSavePhoto({ ...founder, photo }))
      .then(() => toast("Photo added"))
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Could not save the photo"))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <p className="text-xs font-semibold text-muted-foreground">
        Docs <b className={goldText}>/</b> Platform <b className={goldText}>/</b> Founding Team
      </p>
      <h2 className="mt-3 font-display text-xl font-extrabold text-primary sm:text-2xl">The Founding Team</h2>
      <p className="mt-2.5 max-w-2xl text-base text-muted-foreground">
        The officers who incorporated Fortune Intern Network and ratified the Campus Chapter Constitution. This
        registry is independent of chapter boards.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {canEdit ? (
          <button type="button" className={btnSmallPrimary} onClick={onAdd}>
            + Add Founding Member
          </button>
        ) : null}
        <button
          type="button"
          className={btnSoft}
          onClick={() => {
            downloadBlob(
              new Blob([JSON.stringify(founders, null, 2)], { type: "application/json" }),
              "FIN_Founding_Team.json",
            )
            toast("Founding team exported")
          }}
        >
          Export founding JSON
        </button>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {founders.map((f) => (
          <article key={f.id} className={`${cardClass} p-3 text-center sm:p-4`}>
            <div className="relative mx-auto mb-3.5 h-28 w-28">
              <PhotoBox
                photo={f.photo}
                name={f.name || f.title}
                className="h-28 w-28 rounded-full border-[3px] border-accent"
                textClass="text-3xl"
              />
              {canEdit ? (
                <label
                  className="absolute inset-0 cursor-pointer rounded-full focus-within:ring-2 focus-within:ring-primary"
                  title="Change photo"
                >
                  <span className="sr-only">Change photo for {f.name || f.title}</span>
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-sm text-white"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => changePhoto(f, event.currentTarget)}
                  />
                </label>
              ) : null}
            </div>
            <h3 className="font-display text-lg font-bold text-primary">{f.name || "Seat open"}</h3>
            <span
              className={`mt-1.5 inline-block rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide ${
                f.name
                  ? `border-accent/50 bg-accent/15 ${goldText}`
                  : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {f.title}
            </span>
            {f.bio ? <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.bio}</p> : null}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {f.email ? (
                <a
                  href={`mailto:${f.email}`}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted"
                >
                  Email
                </a>
              ) : null}
              {f.phone ? (
                <a
                  href={`tel:${f.phone.replace(/\s/g, "")}`}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted"
                >
                  Call
                </a>
              ) : null}
            </div>
            {canEdit ? (
              <div className="mt-3.5">
                <button type="button" className={btnSoft} onClick={() => onEdit(f.id)}>
                  Edit profile
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
