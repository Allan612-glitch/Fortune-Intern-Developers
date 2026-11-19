// Shared class names so every button, field and card on the chapters page
// looks like the landing page (rounded-xl buttons, flat bordered cards, navy
// and gold only, no heavy shadows).

const btnBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"

export const btnPrimary = `${btnBase} bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover`
export const btnGold = `${btnBase} bg-accent px-5 py-3 text-sm text-accent-foreground hover:bg-amber-300`
export const btnOutline = `${btnBase} border-2 border-primary px-5 py-3 text-sm font-bold text-primary hover:bg-primary hover:text-white`
export const btnSoft = `${btnBase} border border-border bg-white px-3.5 py-2.5 text-xs text-primary hover:bg-secondary`
export const btnSmallPrimary = `${btnBase} bg-primary px-3.5 py-2.5 text-xs font-bold text-white hover:bg-primary-hover`
export const btnSmallGold = `${btnBase} bg-accent px-3.5 py-2.5 text-xs text-accent-foreground hover:bg-amber-300`
export const btnDanger = `${btnBase} bg-red-600 px-3.5 py-2.5 text-xs text-white hover:bg-red-700`

export const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"

export const cardClass = "rounded-2xl border border-border bg-white"

export const goldText = "text-[var(--gold-text,#976a07)]"

export const darkBar = "bg-[var(--footer,#11182d)]"
