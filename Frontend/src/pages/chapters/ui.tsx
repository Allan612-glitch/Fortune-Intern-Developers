import { useEffect, type ReactNode } from "react"
import { initials } from "./data"
import { inputClass } from "./styles"

/** A centred dialog. Press Escape to close. Mount it only while it is open. */
export function Modal(props: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}) {
  const { title, description, onClose, children } = props

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[320] flex items-center justify-center bg-primary/60 p-5 backdrop-blur-sm print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[88vh] w-full max-w-[620px] overflow-auto rounded-2xl border border-border bg-white p-6">
        <h3 className="font-display text-2xl text-primary">{title}</h3>
        {description ? (
          <p className="mb-4 mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-xs font-bold text-primary">{props.label}</span>
      {props.children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-20 resize-y ${props.className ?? ""}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />
}

/** A photo, or the person's initials when there is no photo. */
export function PhotoBox(props: {
  photo: string | null
  name: string
  className: string
  textClass?: string
}) {
  const { photo, name, className, textClass = "text-xl" } = props
  return (
    <span className={`relative block overflow-hidden bg-secondary ${className}`}>
      {photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className={`absolute inset-0 flex items-center justify-center font-extrabold text-primary/30 ${textClass}`}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}

export function Toast(props: { text: string; onUndo?: () => void }) {
  return (
    <div
      role="status"
      className="fixed left-1/2 top-[5.5rem] z-[400] flex max-w-[92%] -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white print:hidden"
    >
      <span>{props.text}</span>
      {props.onUndo ? (
        <button
          type="button"
          onClick={props.onUndo}
          className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground hover:bg-amber-300"
        >
          Undo
        </button>
      ) : null}
    </div>
  )
}
