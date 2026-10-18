import { useEffect, useMemo, useRef, useState } from "react"
import logo from "../assets/attach1.png"

import Footer from "../components/layout/Footer"

import { listPrograms, type Program } from "../services/platform"

interface LandingPageProps {
  onStudentPortal: (mode?: "login" | "register") => void

  onApplyToProgram: (programId: string) => void
}

const heroImage =
  "https://images.unsplash.com/photo-1620829813573-7c9e1877706f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200"

const studentImage =
  "https://images.unsplash.com/photo-1620829813947-ef4246827355?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900"

const navLinks = [
  ["Opportunities", "internships"],

  ["How It Works", "how-it-works"],

  ["About", "about-us"],

  ["Contact", "contact"],
]

const benefits = [
  {
    title: "Discover",

    text: "Explore quality internship opportunities from trusted companies and organizations.",

    icon: "search",
  },

  {
    title: "Apply",

    text: "Submit stronger applications through one simple, organized process.",

    icon: "send",
  },

  {
    title: "Track",

    text: "Follow each application and stay updated as your opportunity progresses.",

    icon: "chart",
  },

  {
    title: "Grow",

    text: "Build experience, develop practical skills, and expand your professional network.",

    icon: "growth",
  },
]

const steps = [
  {
    number: "01",

    title: "Create Your Profile",

    text: "Showcase your skills, education, interests, and the type of career you want to build.",
  },

  {
    number: "02",

    title: "Discover & Apply",

    text: "Find opportunities aligned with your goals and submit a professional application.",
  },

  {
    number: "03",

    title: "Start Your Journey",

    text: "Connect with organizations, gain experience, and take your next confident step.",
  },
]

export default function LandingPage({
  onStudentPortal,

  onApplyToProgram,
}: LandingPageProps) {
  const [mobileMenu, setMobileMenu] = useState(false)

  const [search, setSearch] = useState("")

  const [category, setCategory] = useState("")

  const [location, setLocation] = useState("")

  const [programs, setPrograms] = useState<Program[]>([])

  const [programsLoading, setProgramsLoading] = useState(true)

  const [programsError, setProgramsError] = useState("")

  const [retryCount, setRetryCount] = useState(0)

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  const detailsTriggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let active = true

    setProgramsLoading(true)

    setProgramsError("")

    listPrograms()

      .then((items) => {
        if (active) setPrograms(items)
      })

      .catch((requestError) => {
        if (active) {
          setProgramsError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load internship opportunities.",
          )
        }
      })

      .finally(() => {
        if (active) setProgramsLoading(false)
      })

    return () => {
      active = false
    }
  }, [retryCount])

  const availableCategories = useMemo(
    () =>
      [...new Set(programs.map((program) => program.category).filter(Boolean))]

        .sort((a, b) => a.localeCompare(b)),

    [programs],
  )

  const availableLocations = useMemo(
    () =>
      [...new Set(programs.map((program) => program.location).filter(Boolean))]

        .sort((a, b) => a.localeCompare(b)),

    [programs],
  )

  const visiblePrograms = useMemo(() => {
    const query = search.trim().toLowerCase()

    return programs.filter((program) => {
      const matchesSearch =
        !query ||
        [
          program.name,

          program.company,

          program.description,

          program.category,

          program.location,

          program.duration,

          ...program.skills,
        ].some((value) => value.toLowerCase().includes(query))

      return (
        matchesSearch &&
        (!category || program.category === category) &&
        (!location || program.location === location)
      )
    })
  }, [programs, search, category, location])

  const startSearch = (event: React.FormEvent) => {
    event.preventDefault()

    goTo("opportunities")
  }

  const goTo = (id: string) => {
    setMobileMenu(false)

    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div id="home" className="landing-fonts min-h-screen bg-white text-foreground">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center">
          <button
            onClick={() => goTo("home")}
            className="flex items-center gap-2.5"
            aria-label="Fortune Intern Network home"
          >
            <img
              src={logo}
              alt=""
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div className="text-left leading-tight">
              <p className="font-display text-lg text-primary">Fortune</p>
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold">
                <span className="text-accent">Intern</span>{" "}
                <span className="text-foreground">Network</span>
              </p>
            </div>
          </button>

          <nav
            className="hidden md:flex items-center gap-7 ml-auto"
            aria-label="Primary navigation"
          >
            {navLinks.map(([label, id]) => (
              <button
                key={id}
                onClick={() => goTo(id)}
             className="inline-block text-sm font-medium text-muted-foreground cursor-pointer transition-colors underline decoration-transparent decoration-2 underline-offset-[10px] hover:text-primary hover:decoration-accent"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center ml-7">
            <button
              onClick={() => onStudentPortal("login")}
              className="px-5 py-2.5 hover:cursor-pointer text-sm font-semibold rounded-xl bg-accent text-accent-foreground hover:bg-amber-300 transition-colors"
            >
              Sign In
            </button>
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden ml-auto w-10 h-10 rounded-xl border border-border flex items-center justify-center"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenu}
          >
            <Icon name={mobileMenu ? "close" : "menu"} className="w-5 h-5" />
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t border-border bg-white px-4 py-4">
            <nav className="space-y-1">
              {navLinks.map(([label, id]) => (
                <button
                  key={id}
                  onClick={() => goTo(id)}
                  className="w-full text-left px-3 py-3 rounded-xl text-sm font-medium hover:bg-secondary"
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => onStudentPortal("login")}
                className="w-full py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-amber-300 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
            <div className="fade-in">
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-[4.2rem] leading-[1.04] text-primary">
                Build Your Future Through the{" "}
                <span className="text-[#c89a3c]">Right Internship.</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mt-6 max-w-xl">
                Fortune Intern Network connects students and internship seekers
                with opportunities that build real-world experience, valuable
                skills, and confident careers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={() => goTo("internships")}
                  className="px-6 py-3.5 rounded-xl bg-primary text-white text-sm hover:cursor-pointer font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                >
                  Find an Internship <Icon name="arrow" className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onStudentPortal("register")}
                  className="px-6 py-3.5 rounded-xl border-2 border-primary text-primary text-sm hover:cursor-pointer font-bold hover:bg-primary hover:text-white transition-colors flex items-center justify-center"
                >
                  Create an Account
                </button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground flex items-center gap-2">
                <Icon name="check" className="w-4 h-4 text-primary" />{" "}
                Connecting students with opportunities that matter.
              </p>
            </div>

            <div className="relative pb-8 sm:px-8 lg:px-0">
              <div className="rounded-[2rem] overflow-hidden aspect-[4/4.3] bg-muted">
                <img
                  src={heroImage}
                  alt="Young Ghanaian professional working on a laptop"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="internships" className="relative -mt-3 z-10 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-border p-5 sm:p-8">
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary">
                Opportunity search
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-primary mt-2">
                Find Opportunities That Match Your Ambition
              </h2>
            </div>
            <form
              onSubmit={startSearch}
              className="grid md:grid-cols-[1.6fr_1fr_1fr_auto] gap-2 p-2 bg-surface rounded-2xl border border-border"
            >
              <SearchField
                icon="search"
                value={search}
                onChange={setSearch}
                placeholder="Search internships, companies or skills..."
              />
              <SearchSelect
                icon="pin"
                label="Location"
                value={location}
                onChange={setLocation}
                options={availableLocations}
              />
              <SearchSelect
                icon="briefcase"
                label="Field"
                value={category}
                onChange={setCategory}
                options={availableCategories}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
              >
                Search
              </button>
            </form>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {["", ...availableCategories].map((item) => (
                <button
                  key={item || "all"}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={`min-h-10 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    category === item
                      ? "bg-primary text-white"
                      : "bg-secondary text-primary hover:bg-muted"
                  }`}
                >
                  {item || "All fields"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="opportunities" className="section-space bg-white">
          <div className="landing-container">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <SectionHeading
                align="left"
                eyebrow="Browse as a guest"
                title="Explore Internship Opportunities"
                text="Review current opportunities and their available details before deciding to apply."
              />
              <button
                onClick={() => goTo("internships")}
                className="text-sm hover:cursor-pointer transition-colors font-bold text-primary hover:underline underline-offset-4 flex items-center gap-2 whitespace-nowrap"
              >
                Search opportunities <Icon name="arrow" className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <p
                className="text-sm text-muted-foreground"
                aria-live="polite"
                aria-atomic="true"
              >
                {programsLoading
                  ? "Loading current opportunities..."
                  : `${visiblePrograms.length} ${
                      visiblePrograms.length === 1
                        ? "opportunity"
                        : "opportunities"
                    } found`}
              </p>
              {(search || category || location) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")

                    setCategory("")

                    setLocation("")
                  }}
                  className="text-sm font-semibold text-primary underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
            {programsError && (
              <div
                className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"
                role="alert"
              >
                <p className="text-sm text-red-800">{programsError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                >
                  Retry loading opportunities
                </button>
              </div>
            )}
            {programsLoading && (
              <div
                className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-5"
                aria-label="Loading opportunities"
                aria-live="polite"
              >
                <OpportunitySkeleton />
                <OpportunitySkeleton />
                <OpportunitySkeleton />
              </div>
            )}
            {!programsLoading &&
              !programsError &&
              visiblePrograms.length === 0 && (
                <div className="mt-6 rounded-2xl border border-border bg-surface p-8 text-center">
                  <h3 className="font-semibold text-primary">
                    No matching opportunities
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try another search term or clear your filters to see all
                    current programs.
                  </p>
                  {(search || category || location) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("")

                        setCategory("")

                        setLocation("")
                      }}
                      className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      Show all opportunities
                    </button>
                  )}
                </div>
              )}
            {!programsLoading &&
              !programsError &&
              visiblePrograms.length > 0 && (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
                  {visiblePrograms.map((program) => (
                    <article
                      key={program.id}
                      className="rounded-2xl border border-border p-5 bg-white hover-lift hover:border-primary/30"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-11 h-11 rounded-xl bg-secondary text-primary flex items-center justify-center text-xs font-bold"
                          aria-hidden="true"
                        >
                          {program.company

                            .split(/\s+/)

                            .map((part) => part[0])

                            .join("")

                            .slice(0, 2)

                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            {program.category}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {program.company}
                          </p>
                        </div>
                      </div>
                      <h3 className="font-semibold text-base text-primary mt-5">
                        {program.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {program.location || "Location not specified"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {program.duration && (
                          <span className="job-chip">
                            <Icon name="briefcase" className="w-3.5 h-3.5" />
                            {program.duration}
                          </span>
                        )}
                      </div>
                      {program.deadline && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          Apply by{" "}
                          {new Date(program.deadline).toLocaleDateString()}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          detailsTriggerRef.current = event.currentTarget

                          setSelectedProgram(program)
                        }}
                        className="w-full mt-4 min-h-11 py-2.5 rounded-xl bg-secondary text-primary text-sm font-bold hover:bg-primary hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        View details
                      </button>
                    </article>
                  ))}
                </div>
              )}
          </div>
        </section>

        <section id="about" className="section-space bg-white">
          <div className="landing-container">
            <SectionHeading
              eyebrow="Why Fortune Intern Network?"
              title="Everything You Need to Start Your Career Journey"
              text="A focused platform built to help emerging professionals move from discovery to meaningful experience."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              {benefits.map((item) => (
                <article
                  key={item.title}
                  className="group rounded-2xl border border-border p-6 bg-white hover-lift hover:border-primary/30"
                >
                  <div className="w-11 h-11 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon name={item.icon} className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-xl text-primary mt-6">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-space bg-surface">
          <div className="landing-container">
            <SectionHeading
              eyebrow="Simple to apply"
              title="Your Internship Journey Starts Here"
              text="Three clear steps take you from creating your profile to beginning your professional journey."
            />
            <div className="grid md:grid-cols-3 gap-5 mt-12 relative">
              <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-border" />
              {steps.map((step) => (
                <article key={step.number} className="relative text-center">
                  <div className="relative z-10 w-16 h-16 rounded-full bg-white border-2 border-accent text-primary mx-auto flex items-center justify-center font-mono font-bold shadow-sm">
                    {step.number}
                  </div>
                  <h3 className="font-display text-xl text-primary mt-5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3 max-w-xs mx-auto">
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-space bg-surface">
          <div className="landing-container grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative">
              <div className="rounded-3xl overflow-hidden aspect-[4/3]">
                <img
                  src={studentImage}
                  alt="Ghanaian student preparing for her career"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-5 right-5 bg-white rounded-2xl border border-border p-4 max-w-52">
                <p className="font-display text-2xl text-primary">
                  Connect. Apply. Grow.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Your career journey, supported.
                </p>
              </div>
            </div>
            <div>
              <p className="section-eyebrow">For students</p>
              <h2 className="section-title">
                Your First Opportunity Can Change Your Future.
              </h2>
              <p className="section-copy">
                Whether you&apos;re looking for your first internship, building your
                CV, or gaining experience in your field, FIN helps you discover
                opportunities designed to move your career forward.
              </p>
              <ul className="grid sm:grid-cols-2 gap-3 mt-6">
                {[
                  "Discover relevant internships",

                  "Build your professional profile",

                  "Track your applications",

                  "Gain real-world experience",

                  "Connect with organizations",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <span className="check-dot">
                      <Icon name="check" className="w-3.5 h-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onStudentPortal("register")}
                className="mt-8 px-6 py-3.5 hover:cursor-pointer rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
              >
                Start Your Career Journey
              </button>
            </div>
          </div>
        </section>

        <section id="about-us" className="section-space bg-white">
          <div className="landing-container">
            <div className="max-w-3xl">
              <p className="section-eyebrow">About us</p>
              <h2 className="section-title">Bridging Dreams and Careers</h2>
              <p className="section-copy">
                Fortune Intern Network is a Ghanaian student development
                organisation headquartered in Accra, with an active campus
                chapter at Kwame Nkrumah University of Science and Technology.
                We partner with leading banks, telecoms, insurers, hospitals
                and manufacturers to place tertiary students into internships
                aligned with their course of study.
              </p>
              <p className="section-copy">
                Beyond placement, we issue verified internship letters,
                supervisor assessment forms and certificates of completion, and
                we run FIN Academy skills tracks and leadership programmes. Our
                Super AI assistant supports students with applications, CVs and
                cover letters every day of the year.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-16 bg-white">
          <div className="max-w-7xl mx-auto rounded-3xl bg-surface border border-border px-6 py-12 sm:p-14 text-center">
            <p className="section-eyebrow">Connect. Apply. Grow.</p>
            <h2 className="font-display text-3xl sm:text-5xl text-primary mt-3">
              Your Next Opportunity Is Waiting.
            </h2>
            <p className="text-muted-foreground mt-4">
              Take the next step toward building the career you want.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
              <button
                onClick={() => goTo("internships")}
                className="px-6 py-3.5 hover:cursor-pointer rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
              >
                Find an Internship
              </button>
              <button
                onClick={() => onStudentPortal("register")}
                className="px-6 py-3.5 hover:cursor-pointer hover:bg-secondary rounded-xl bg-white border border-border text-primary text-sm font-bold hover:border-primary/30 transition-colors"
              >
                Join Fortune Intern Network
              </button>
            </div>
          </div>
        </section>

        <section id="contact" className="section-space bg-surface">
          <div className="landing-container">
            <SectionHeading
              eyebrow="Customer service"
              title="Talk to Us Today"
              text="Our team in Accra responds within one to two working days."
            />
            <div className="grid md:grid-cols-3 gap-4 mt-10 max-w-4xl mx-auto">
              {[
                {
                  label: "Call us",
                  value: "020 031 3672",
                  href: "tel:+233200313672",
                  icon: "phone",
                  external: false,
                },
                {
                  label: "WhatsApp",
                  value: "025 703 8948",
                  href: "https://wa.me/233257038948",
                  icon: "whatsapp",
                  external: true,
                },
                {
                  label: "Email",
                  value: "fortuneintern.gh@gmail.com",
                  href: "mailto:fortuneintern.gh@gmail.com",
                  icon: "mail",
                  external: false,
                },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  {...(item.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group flex items-center gap-4 rounded-2xl border border-border p-5 bg-white transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon name={item.icon} className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-primary">
                      {item.label}
                    </span>
                    <span className="block text-sm text-muted-foreground break-words">
                      {item.value}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      {selectedProgram && (
        <OpportunityDetailsDialog
          program={selectedProgram}
          onClose={() => {
            setSelectedProgram(null)

            window.requestAnimationFrame(() =>
              detailsTriggerRef.current?.focus(),
            )
          }}
          onApply={(programId) => {
            setSelectedProgram(null)

            onApplyToProgram(programId)
          }}
        />
      )}
    </div>
  )
}

function SectionHeading({
  eyebrow,

  title,

  text,

  align = "center",
}: {
  eyebrow: string

  title: string

  text: string

  align?: "left" | "center"
}) {
  return (
    <div
      className={
        align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"
      }
    >
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      <p className="section-copy">{text}</p>
    </div>
  )
}

function SearchField({
  icon,

  value,

  onChange,

  placeholder,
}: {
  icon: string

  value: string

  onChange: (value: string) => void

  placeholder: string
}) {
  return (
    <label className="flex items-center gap-3 bg-white rounded-xl px-4 py-3">
      <Icon name={icon} className="w-4 h-4 text-muted-foreground" />
      <input
        aria-label="Search internship opportunities"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full text-sm outline-none bg-transparent focus-visible:ring-2 focus-visible:ring-primary"
      />
    </label>
  )
}

function SearchSelect({
  icon,

  label,

  value,

  onChange,

  options,
}: {
  icon: string

  label: string

  value: string

  onChange: (value: string) => void

  options: string[]
}) {
  return (
    <label className="flex items-center gap-2 bg-white rounded-xl px-3">
      <Icon
        name={icon}
        className="w-4 h-4 text-muted-foreground flex-shrink-0"
      />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full py-3 text-sm bg-transparent outline-none text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value="">
          {label === "Location" ? "All locations" : "All fields"}
        </option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function OpportunitySkeleton() {
  return (
    <div className="rounded-2xl border border-border p-5" aria-hidden="true">
      <div className="motion-safe:animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
        <div className="mt-5 h-4 w-4/5 rounded bg-muted" />
        <div className="mt-3 h-3 w-2/3 rounded bg-muted" />
        <div className="mt-5 h-11 w-full rounded-xl bg-muted" />
      </div>
    </div>
  )
}

function OpportunityDetailsDialog({
  program,

  onClose,

  onApply,
}: {
  program: Program

  onClose: () => void

  onApply: (programId: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const suppressedCloseEventsRef = useRef(0)

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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="opportunity-dialog-title"
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
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-foreground shadow-lg backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-white p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {program.category}
          </p>
          <h2
            id="opportunity-dialog-title"
            className="mt-2 text-xl font-bold text-primary sm:text-2xl"
          >
            {program.name}
          </h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close opportunity details"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl text-muted-foreground hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          ×
        </button>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
            {program.company}
          </span>
          {program.location && (
            <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
              {program.location}
            </span>
          )}
          {program.duration && (
            <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
              {program.duration}
            </span>
          )}
        </div>
        {program.skills.length > 0 && (
          <section aria-labelledby="opportunity-skills-title">
            <h3 id="opportunity-skills-title" className="font-semibold">
              Skills
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {program.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-primary"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="opportunity-description-title">
          <h3 id="opportunity-description-title" className="font-semibold">
            About this opportunity
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {program.description ||
              "No description has been provided for this opportunity."}
          </p>
        </section>
        <section aria-labelledby="opportunity-requirements-title">
          <h3 id="opportunity-requirements-title" className="font-semibold">
            What you need
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>An active FIN student account and profile.</li>
            <li>
              Current CV and, where required, an introduction letter.
            </li>
            <li>Payment of the single processing fee at submission.</li>
          </ul>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onApply(program.id)}
            className="min-h-11 flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Apply through the portal
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 flex-1 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}

interface IconProps {
  name: string
  className: string
}

function Icon({ name, className }: IconProps) {
  const paths: Record<string, React.ReactNode> = {
    menu: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7h16M4 12h16M4 17h16"
      />
    ),

    close: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 6l12 12M18 6L6 18"
      />
    ),

    arrow: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14m-5-5l5 5-5 5"
      />
    ),

    check: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    ),

    search: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z"
      />
    ),

    send: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      />
    ),

    chart: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 19V9m6 10V5m6 14v-7m4 7H2"
      />
    ),

    growth: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 17l6-6 4 4 8-9m-5 0h5v5"
      />
    ),

    pin: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
      />
    ),

    briefcase: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 6V4h6v2m-12 5h18m-16-5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
      />
    ),

    code: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 9l-3 3 3 3m8-6l3 3-3 3m-2-9l-4 12"
      />
    ),

    bookmark: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-6-4-6 4V4z"
      />
    ),

    phone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"
      />
    ),

    mail: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm18 2l-10 7L2 6"
      />
    ),

    linkedin: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M6 9v9m0-13v.01M10 18v-5a3 3 0 016 0v5m-6-5a3 3 0 016 0m0 0v5M3 3h18v18H3V3z"
      />
    ),

    whatsapp: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M20 11.5a8 8 0 01-11.8 7L4 20l1.5-4.1A8 8 0 1120 11.5zm-5.2 2.2c-.2.5-.8.8-1.3.6-2.2-.8-3.7-2.1-4.6-4.2-.2-.5 0-1.1.5-1.4l.6-.3.8 1.4-.5.5c.5.9 1.1 1.5 2 2l.5-.5 1.5.7.5.6z"
      />
    ),

    instagram: (
      <>
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        />
        <circle
          cx="12"
          cy="12"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),

    x: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M5 4l14 16M19 4L5 20"
      />
    ),
  }

  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
