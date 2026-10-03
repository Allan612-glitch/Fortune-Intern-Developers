import { useEffect, useState } from "react";
import type { AppUser, AppPage } from "../App";
import { getDashboard, listPrograms, type DashboardSummary, type Program } from "../services/platform";

const stats = [
  { value: "20+", label: "Current openings" },
  { value: "4 stages", label: "Live tracking" },
  { value: "< 72h", label: "Application review" },
];

const process = [
  {
    step: "01",
    title: "Discover",
    desc: "Find roles matched to your course, skills, and preferred location.",
  },
  {
    step: "02",
    title: "Complete your application",
    desc: "Upload one Resume or CV and review your details.",
  },
  {
    step: "03",
    title: "We send it",
    desc: "FIN edits your letter and emails the company on your behalf.",
  },
  {
    step: "04",
    title: "Track live",
    desc: "Follow every update from application review through offer.",
  },
];

const featureIcons = [
  <path
    key="spark"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.7}
    d="M9.8 4.2L11 2l1.2 2.2L14.5 5.5l-2.3 1.3L11 9l-1.2-2.2-2.3-1.3 2.3-1.3zM5 12l1.7 3.3L10 17l-3.3 1.7L5 22l-1.7-3.3L0 17l3.3-1.7L5 12zm12-1l2.1 4 3.9 2-3.9 2L17 23l-2.1-4-3.9-2 3.9-2 2.1-4z"
  />,
  <path
    key="track"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.7}
    d="M5 19V9m7 10V5m7 14v-7M3 21h18"
  />,
  <path
    key="mail"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.7}
    d="M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
  />,
];

const features = [
  {
    eyebrow: "Super AI",
    title: "A stronger application, without the guesswork",
    desc: "Your assistant turns your details into a polished, role-specific internship letter.",
  },
  {
    eyebrow: "Live tracking",
    title: "Know exactly where every application stands",
    desc: "See Applied, Review, Interview, and Offer updates from one transparent dashboard.",
  },
  {
    eyebrow: "Automation",
    title: "Professional outreach handled for you",
    desc: "FIN sends your edited letter, CV, and email directly to the company on your behalf.",
  },
];

interface HomePageProps {
  user: AppUser;
  setPage: (p: AppPage) => void;
}

export default function HomePage({ user, setPage }: HomePageProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  useEffect(() => {
    Promise.all([listPrograms(), getDashboard()])
      .then(([openPrograms, summary]) => {
        setPrograms(openPrograms);
        setDashboard(summary);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="overflow-hidden">
      <section className="relative gradient-hero text-white">
        <div className="absolute inset-0 hero-grid opacity-20" />
        <div className="absolute -top-24 right-0 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-20 grid lg:grid-cols-[1.08fr_.92fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-white/70 text-xs font-semibold uppercase tracking-[0.18em] mb-5">
              <span className="w-2 h-2 rounded-full bg-accent pulse-dot" />
              Welcome back, {user.name.split(" ")[0]}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.04] max-w-2xl">
              Your career starts with the{" "}
              <span className="text-gradient-gold">right opportunity.</span>
            </h1>
            <p className="mt-5 text-white/65 text-base sm:text-lg max-w-xl leading-relaxed">
              Discover internships across Ghana, submit a standout application,
              and let FIN handle the outreach while you track every move.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => setPage("programs")}
                className="px-6 py-3.5 rounded-xl bg-accent text-accent-foreground text-sm font-bold hover:bg-amber-300 transition-colors shadow-lg shadow-black/10"
              >
                Explore internships
              </button>
              <button
                onClick={() => setPage("apply")}
                className="px-6 py-3.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                Start an application
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-7 text-xs text-white/55">
              <span className="flex items-center gap-2">
                <CheckIcon /> Secure Paystack checkout
              </span>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -inset-5 rounded-[2rem] bg-accent/10 rotate-3" />
            <div className="relative rounded-3xl bg-white text-foreground shadow-2xl overflow-hidden border border-white/20">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Application tracker
                  </p>
                  <p className="font-semibold text-sm mt-1">
                    Your progress this month
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700">
                  {dashboard?.active_applications ?? 0} active
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    ["Applications", String(dashboard?.total_applications ?? 0)],
                    ["Active", String(dashboard?.active_applications ?? 0)],
                    ["Interviews", String(dashboard?.interviews ?? 0)],
                    ["Offers", String(dashboard?.accepted_applications ?? 0)],
                  ].map(([label, value], index) => (
                    <div
                      key={label}
                      className={`rounded-xl p-3 ${index === 3 ? "bg-accent" : "bg-secondary"}`}
                    >
                      <p className="text-xl font-display">{value}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {(dashboard?.recent_applications || []).slice(0, 2).map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center gap-3 border border-border rounded-xl p-3"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold bg-secondary text-primary"
                      >
                        {application.program_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">
                          {application.program_name}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-secondary text-primary">{application.status}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 bg-primary rounded-2xl p-4 text-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {featureIcons[0]}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">
                      Super improved your letter
                    </p>
                    <p className="text-[10px] text-white/55 mt-0.5">
                      Ready to send to Flutterwave
                    </p>
                  </div>
                  <CheckIcon />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`py-5 lg:py-6 ${index % 2 ? "pl-5" : ""} lg:pl-5 border-white/10 ${index > 0 ? "lg:border-l" : ""}`}
              >
                <p className="font-display text-2xl text-accent">
                  {stat.value}
                </p>
                <p className="text-xs text-white/45 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary mb-2">
              Built for Ghanaian students
            </p>
            <h2 className="font-display text-3xl sm:text-4xl max-w-xl">
              From “I found a role” to “I got the offer.”
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            One connected workflow brings discovery, payment, application
            support, outreach, and tracking together.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="bg-white border border-border rounded-2xl p-6 hover-lift"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-primary mb-8">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {featureIcons[index]}
                </svg>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {feature.eyebrow}
              </p>
              <h3 className="font-display text-xl mt-2 mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-20 grid lg:grid-cols-[.8fr_1.2fr] gap-10 lg:gap-16 items-start">
          <div className="lg:sticky lg:top-20">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary mb-2">
              How FIN works
            </p>
            <h2 className="font-display text-3xl sm:text-4xl">
              Four clear steps. One stronger application.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              You stay in control. Payment is only requested after your form is
              complete, and submission happens only after Paystack confirms it.
            </p>
            <button
              onClick={() => setPage("programs")}
              className="mt-6 text-sm font-bold text-primary flex items-center gap-2 hover:gap-3 transition-all"
            >
              Find your next role <span>→</span>
            </button>
          </div>
          <div className="space-y-3">
            {process.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-border p-5 flex gap-5 bg-background"
              >
                <span className="font-mono text-xs font-bold text-primary bg-secondary rounded-lg w-9 h-9 flex items-center justify-center flex-shrink-0">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary mb-2">
              Fresh opportunities
            </p>
            <h2 className="font-display text-3xl">Hiring now</h2>
          </div>
          <button
            onClick={() => setPage("programs")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            View all roles
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {programs.slice(0, 3).map((program, index) => (
            <article
              key={program.id}
              className="bg-white border border-border rounded-2xl p-5 hover-lift"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold ${["bg-accent text-accent-foreground", "bg-amber-300 text-accent-foreground", "bg-emerald-600 text-white"][index % 3]}`}
                >
                  {program.company.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                  New
                </span>
              </div>
              <h3 className="font-semibold text-sm mt-5">{program.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {program.company}
              </p>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  {program.location}
                </span>
              </div>
              <button
                onClick={() => setPage("programs")}
                className="w-full mt-4 py-2.5 rounded-xl bg-secondary text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
              >
                View and apply
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 lg:pb-20">
        <div className="gradient-hero rounded-3xl p-7 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-accent/20 blur-3xl rounded-full" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-accent mb-2">
                Ready when you are
              </p>
              <h2 className="font-display text-3xl sm:text-4xl">
                Your next opportunity is already here.
              </h2>
              <p className="text-sm text-white/60 mt-3">
                Browse hundreds of roles from trusted companies across Ghana.
              </p>
            </div>
            <button
              onClick={() => setPage("programs")}
              className="px-6 py-3.5 rounded-xl bg-accent text-accent-foreground text-sm font-bold flex-shrink-0 hover:bg-amber-300 transition-colors"
            >
              Browse all internships
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-accent flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
