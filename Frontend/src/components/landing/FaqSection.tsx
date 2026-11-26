import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, Mail, MessageCircle, Phone, Search } from "lucide-react"

import { faqCategories, faqPlainText, faqs, type FaqPiece } from "./faqData"

const linkClass =
  "font-semibold text-[var(--gold-text)] underline underline-offset-4 hover:text-primary"

function Answer({ pieces }: { pieces: FaqPiece[] }) {
  return (
    <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
      {pieces.map((piece, index) => {
        if (typeof piece === "string") return piece
        if (piece.to) {
          return (
            <Link key={index} to={piece.to} className={linkClass}>
              {piece.text}
            </Link>
          )
        }
        if (piece.href) {
          return (
            <a
              key={index}
              href={piece.href}
              {...(piece.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={linkClass}
            >
              {piece.text}
            </a>
          )
        }
        return (
          <em key={index} className="text-foreground">
            {piece.text}
          </em>
        )
      })}
    </p>
  )
}

export default function FaqSection() {
  const [category, setCategory] = useState<string>("all")
  const [query, setQuery] = useState("")
  const [openItems, setOpenItems] = useState<number[]>([])

  const search = query.trim().toLowerCase()
  const visible = faqs
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        (category === "all" || item.cat === category) &&
        (!search || faqPlainText(item).toLowerCase().includes(search)),
    )

  const toggle = (index: number) =>
    setOpenItems((current) =>
      current.includes(index) ? current.filter((id) => id !== index) : [...current, index],
    )

  return (
    <section
      id="faqs"
      aria-labelledby="faqs-title"
      className="section-space scroll-mt-[4.5rem] bg-surface"
    >
      <div className="landing-container">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="section-eyebrow">FAQs</p>
            <h2 id="faqs-title" className="section-title">
              Frequently Asked Questions
            </h2>
            <p className="section-copy mx-auto max-w-xl">
              Straight answers about applications, payments, letters and certificates, programs,
              chapters, FIN CONNECT and your privacy. Search, pick a topic, or just talk to the desk
              below.
            </p>
          </div>

          <label className="relative mx-auto mt-8 block max-w-xl">
            <span className="sr-only">Search questions</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a question, e.g. refund, certificate, fee…"
              className="w-full rounded-xl border border-border bg-white py-3 pl-11 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {faqCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
                className={`min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  category === item.id
                    ? "bg-primary text-white"
                    : "bg-secondary text-primary hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p
            className="mt-5 text-center text-xs font-semibold text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            Showing {visible.length} of {faqs.length} answers
          </p>

          <div className="mt-5 space-y-3">
            {visible.map(({ item, index }) => {
              const isOpen = openItems.includes(index)
              return (
                <div
                  key={item.q}
                  className={`rounded-2xl border bg-white transition-colors ${
                    isOpen ? "border-accent" : "border-border"
                  }`}
                >
                  <h3>
                    <button
                      type="button"
                      id={`faq-q-${index}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${index}`}
                      onClick={() => toggle(index)}
                      className="flex min-h-14 w-full items-center gap-4 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="flex-1 text-base font-bold leading-snug text-primary">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`size-5 shrink-0 text-[var(--gold-text)] transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-a-${index}`}
                    role="region"
                    aria-labelledby={`faq-q-${index}`}
                    hidden={!isOpen}
                  >
                    <Answer pieces={item.a} />
                  </div>
                </div>
              )
            })}
          </div>

          {visible.length === 0 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              No answer matches that search. Try another word, or ask the desk directly below.
            </p>
          )}

          <div
            id="contact"
            className="mt-12 scroll-mt-[6rem] rounded-3xl bg-[var(--story-ink)] px-6 py-10 text-center text-[var(--story-paper)] sm:px-10"
          >
            <h3 className="text-2xl font-extrabold text-white">Still have a question?</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80">
              A real person answers on WhatsApp and phone from Monday to Friday, 9:00 to 17:00 GMT.
              Email replies land within 72 hours, even when the answer is no.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="https://wa.me/233257038948"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--story-ink)]"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp the desk
              </a>
              <a
                href="tel:+233200313672"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Phone className="size-4" aria-hidden="true" />
                Call 020 031 3672
              </a>
              <a
                href="mailto:fortuneintern.gh@gmail.com"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Mail className="size-4" aria-hidden="true" />
                Email us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
