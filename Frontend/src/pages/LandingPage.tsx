import { useState } from "react";
import logo from "../assets/attach1.png";
import Icon from "../components/ui/Icon";
import SectionHeading from "../components/ui/SectionHeading";



interface LandingPageProps {
  onStudentPortal: (mode?: "login" | "register") => void;
}

const heroImage =
  "https://images.unsplash.com/photo-1620829813573-7c9e1877706f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200";
const studentImage =
  "https://images.unsplash.com/photo-1620829813947-ef4246827355?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900";

const navLinks = [
  ["Home", "home"],
  ["Internships", "internships"],
  ["How It Works", "how-it-works"],
  ["About Us", "about"],
];

const categories = [
  "Technology",
  "Business",
  "Finance",
  "Marketing",
  "Engineering",
  "Healthcare",
  "Design",
  "Data",
];

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
];

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
];

const opportunities = [
  {
    initials: "TC",
    title: "Frontend Developer Intern",
    company: "Technology Company",
    location: "Accra, Ghana",
    type: "Hybrid",
    posted: "Posted 2 days ago",
    deadline: "Deadline: 28 Oct",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    initials: "DM",
    title: "Marketing Intern",
    company: "Digital Marketing Agency",
    location: "Kumasi, Ghana",
    type: "On-site",
    posted: "Posted 1 day ago",
    deadline: "Deadline: 02 Nov",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    initials: "FS",
    title: "Data Analyst Intern",
    company: "Financial Services Company",
    location: "Accra, Ghana",
    type: "Hybrid",
    posted: "Posted 4 hours ago",
    deadline: "Deadline: 05 Nov",
    color: "bg-sky-100 text-sky-700",
  },
];

const testimonials = [
  {
    quote:
      "Fortune Intern Network made it easier for me to discover internship opportunities related to my field.",
    name: "Ama Mensah",
    school: "University of Ghana",
    field: "Business Administration",
    initials: "AM",
  },
  {
    quote:
      "The organized application process helped me feel more confident when reaching out to companies.",
    name: "Kwame Owusu",
    school: "KNUST",
    field: "Computer Engineering",
    initials: "KO",
  },
  {
    quote:
      "I finally had one place to find relevant roles and understand the progress of every application.",
    name: "Naa Adjeley",
    school: "Ashesi University",
    field: "Management Information Systems",
    initials: "NA",
  },
];

export default function LandingPage({ onStudentPortal }: LandingPageProps) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");

  const startSearch = (event: React.FormEvent) => {
    event.preventDefault();
    onStudentPortal("login");
  };

  const goTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

      return (
        <>
    <div id="home" className="min-h-screen bg-white text-foreground">
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
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-emerald-700">
                Intern Network
              </p>
            </div>
          </button>

          <nav
            className="hidden lg:flex items-center gap-7 mx-auto"
            aria-label="Primary navigation"
          >
            {navLinks.map(([label, id]) => (
              <button
                key={id}
                onClick={() => goTo(id)}
             className="inline-block text-sm font-medium text-muted-foreground cursor-pointer transition-all ease-in-out duration-300 hover:text-primary hover:scale-105"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => onStudentPortal("login")}
              className="px-4 py-2.5 hover:cursor-pointer text-sm font-semibold text-primary hover:bg-secondary rounded-xl transition-colors"
            >
              Student Portal
            </button>
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="lg:hidden ml-auto w-10 h-10 rounded-xl border border-border flex items-center justify-center"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenu}
          >
            <Icon name={mobileMenu ? "close" : "menu"} className="w-5 h-5" />
          </button>
        </div>

        {mobileMenu && (
          <div className="lg:hidden border-t border-border bg-white px-4 py-4 shadow-xl">
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
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
              <button
                onClick={() => onStudentPortal("login")}
                className="py-3 rounded-xl border border-border text-sm font-semibold"
              >
                Student Portal
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden bg-surface">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-emerald-50/70 hidden lg:block" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
            <div className="fade-in">
              <span className="inline-flex items-center gap-2 py-2 px-3 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Find
                your next opportunity
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[4.2rem] leading-[1.04] mt-6 text-primary">
                Build Your Future Through the{" "}
                <span className="text-emerald-700">Right Internship.</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mt-6 max-w-xl">
                Fortune Intern Network connects students and internship seekers
                with opportunities that build real-world experience, valuable
                skills, and confident careers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={() => onStudentPortal("login")}
                  className="px-6 py-3.5 rounded-xl bg-primary text-white text-sm hover:cursor-pointer font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/15 flex items-center justify-center gap-2"
                >
                  Find an Internship <Icon name="arrow" className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground flex items-center gap-2">
                <Icon name="check" className="w-4 h-4 text-emerald-600" />{" "}
                Connecting students with opportunities that matter.
              </p>
            </div>

            <div className="relative pb-8 sm:px-8 lg:px-0">
              <div className="rounded-[2rem] overflow-hidden aspect-[4/4.3] bg-muted shadow-2xl">
                <img
                  src={heroImage}
                  alt="Young Ghanaian professional working on a laptop"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
              </div>
              <FloatingRole
                className="top-8 -left-2 sm:-left-8"
                title="Software Engineering Intern"
                company="Accra · Hybrid"
                icon="code"
              />
              <FloatingRole
                className="top-1/2 -right-2 sm:-right-8"
                title="Data Analyst Intern"
                company="Finance · Accra"
                icon="chart"
              />
              <div className="absolute bottom-0 left-5 sm:-left-2 bg-white rounded-2xl shadow-xl border border-border p-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Icon name="check" className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-primary">
                    Application Submitted
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    You are one step closer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="internships" className="relative -mt-3 z-10 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-border shadow-xl shadow-primary/5 p-5 sm:p-8">
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-emerald-700">
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
                options={[
                  "Accra, Ghana",
                  "Kumasi, Ghana",
                  "Remote",
                  "All locations",
                ]}
              />
              <SearchSelect
                icon="briefcase"
                label="Internship type"
                options={["Hybrid", "On-site", "Remote", "All types"]}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
              >
                Search
              </button>
            </form>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onStudentPortal("login")}
                  className="px-3.5 py-2 rounded-full bg-secondary text-primary text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                >
                  {category}
                </button>
              ))}
            </div>
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
                  className="group rounded-2xl border border-border p-6 bg-white hover-lift hover:border-emerald-200"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
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
              eyebrow="Simple by design"
              title="Your Internship Journey Starts Here"
              text="Three clear steps take you from creating your profile to beginning your professional journey."
            />
            <div className="grid md:grid-cols-3 gap-5 mt-12 relative">
              <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-emerald-200" />
              {steps.map((step) => (
                <article key={step.number} className="relative text-center">
                  <div className="relative z-10 w-16 h-16 rounded-full bg-white border-2 border-emerald-500 text-emerald-700 mx-auto flex items-center justify-center font-mono font-bold shadow-sm">
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

        <section className="section-space bg-white">
          <div className="landing-container">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <SectionHeading
                align="left"
                eyebrow="Curated for you"
                title="Explore Internship Opportunities"
                text="Build practical experience with organizations looking for emerging talent."
              />
              <button
                onClick={() => onStudentPortal("login")}
                className="text-sm hover:cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 font-bold text-primary hover:text-emerald-700 flex items-center gap-2 whitespace-nowrap"
              >
                View All Internships <Icon name="arrow" className="w-4 h-4" />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-5 mt-10">
              {opportunities.map((job) => (
                <article
                  key={job.title}
                  className="rounded-2xl border border-border p-5 bg-white hover-lift"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold ${job.color}`}
                    >
                      {job.initials}
                    </span>
                    <button
                      aria-label="Save opportunity"
                      className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary"
                    >
                      <Icon name="bookmark" className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-base text-primary mt-5">
                    {job.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.company}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="job-chip">
                      <Icon name="pin" className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                    <span className="job-chip">
                      <Icon name="briefcase" className="w-3.5 h-3.5" />
                      {job.type}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-5 pt-4 border-t border-border">
                    <span>{job.posted}</span>
                    <span>{job.deadline}</span>
                  </div>
                  <button
                    onClick={() => onStudentPortal("login")}
                    className="w-full mt-4 py-2.5 hover:cursor-pointer rounded-xl bg-secondary text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                  >
                    View Opportunity
                  </button> 
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-space bg-surface">
          <div className="landing-container grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative">
              <div className="rounded-3xl overflow-hidden aspect-[4/3] shadow-lg">
                <img
                  src={studentImage}
                  alt="Ghanaian student preparing for her career"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-5 right-5 bg-white rounded-2xl border border-border shadow-lg p-4 max-w-52">
                <p className="font-display text-2xl text-emerald-700">
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
                Whether you're looking for your first internship, building your
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

        <section className="border-b border-border bg-white">
          <div className="landing-container py-9 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              ["500+", "Internship Opportunities"],
              ["1,000+", "Students Connected"],
              ["100+", "Companies"],
              ["20+", "Career Fields"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="text-center lg:border-r lg:last:border-r-0 border-border"
              >
                <p className="font-display text-3xl text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
                <p className="text-[9px] uppercase tracking-wider text-emerald-700 mt-2">
                  Placeholder data
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-space bg-white">
          <div className="landing-container">
            <SectionHeading
              eyebrow="Community stories"
              title="What Our Community Says"
              text="Illustrative feedback showing the experience we are building toward. Replace with verified member feedback before launch."
            />
            <div className="grid md:grid-cols-3 gap-5 mt-10">
              {testimonials.map((item) => (
                <article
                  key={item.name}
                  className="rounded-2xl border border-border p-6 bg-surface-soft"
                >
                  <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700">
                    Placeholder testimonial
                  </p>
                  <blockquote className="font-display text-lg leading-relaxed text-primary mt-4">
                    “{item.quote}”
                  </blockquote>
                  <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
                    <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      {item.initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.school} · {item.field}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-16 bg-white">
          <div className="max-w-7xl mx-auto rounded-3xl bg-emerald-50 border border-emerald-100 px-6 py-12 sm:p-14 text-center">
            <p className="section-eyebrow">Connect. Apply. Grow.</p>
            <h2 className="font-display text-3xl sm:text-5xl text-primary mt-3">
              Your Next Opportunity Is Waiting.
            </h2>
            <p className="text-muted-foreground mt-4">
              Take the next step toward building the career you want.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
              <button
                onClick={() => onStudentPortal("login")}
                className="px-6 py-3.5 hover:cursor-pointer rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
              >
                Find an Internship
              </button>
              <button
                onClick={() => onStudentPortal("register")}
                className="px-6 py-3.5 hover:cursor-pointer hover:bg-emerald-700 hover:text-white rounded-xl bg-white border border-border text-primary text-sm font-bold hover:border-primary/30 transition-colors"
              >
                Join Fortune Intern Network
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-footer text-white">
        <div className="landing-container py-12 grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt=""
                className="w-11 h-11 rounded-xl object-contain bg-white"
              />
              <div>
                <p className="font-display text-xl">Fortune Intern Network</p>
                <p className="text-[10px] tracking-widest uppercase text-emerald-300">
                  Bridging Dreams and Careers.
                </p>
              </div>
            </div>
            <p className="text-sm text-white/55 mt-5 max-w-xs leading-relaxed">
              Connecting students with opportunities that matter.
            </p>
          </div>
          <FooterColumn
            title="Platform"
            links={[
              {name: "Find Internships", href:"../companypages/"},
              {name: "How It Works", href:""},
              {name: "Application Tracking", href:""},
              {name: "Student Dashboard", href:""},
            ]}
          />
          <div>
            <FooterColumn
              title="Company"
              links={[
                {name: "About FIN", href: "/about"},
                {name: "Contact", href: "/contact"},
                {name: "Privacy Policy", href: "/privacy-policy"},
                {name: "Terms & Conditions", href: "/terms"},
                {name: "Cookie Policy", href: "/cookie-policy"},
                {name: "Refund Policy", href: "/refund-policy"}
              ]}
              
            />
          </div>
          <div>
            <p className="text-sm font-bold">Follow Us</p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.linkedin.com/company/fortune-intern-network/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fortune Intern on LinkedIn"
                className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
              >
                <Icon name="linkedin" className="w-5 h-5" />
              </a>
              <a
                href="https://whatsapp.com/channel/0029Val97zy1yT2BGkOZi511"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fortune Intern WhatsApp Channel"
                className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
              >
                <Icon name="whatsapp" className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/fortune_intern1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fortune Intern on X"
                className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
              >
                <Icon name="x" className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className=""> 
            <p className="text-sm font-bold">Customer Service</p>
            <a
              href="tel:0200313672"
              aria-label="Call Fortune Intern Customer Service"
              className="inline-flex mt-4 text-sm text-white/70 hover:text-white transition-colors"
            >
              0200313672
            </a><br/>
            <a
              href="tel:0257038948"
              aria-label="Call Fortune Intern Customer Service"
              className="inline-flex text-sm text-white/70 hover:text-white transition-colors"
            >
              0257038948
            </a>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="landing-container py-5 text-xs text-white/40">
            © 2026 Fortune Intern Network. All rights reserved.
          </div>
        </div>
      </footer>
    </div>

    </>
  );
}


function FloatingRole({
  className,
  title,
  company,
  icon,
}: {
  className: string;
  title: string;
  company: string;
  icon: string;
}) {
  return (
    <div
      className={`absolute hidden sm:flex bg-white rounded-2xl shadow-xl border border-border p-3 items-center gap-3 ${className}`}
    >
      <span className="w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center">
        <Icon name={icon} className="w-4 h-4" />
      </span>
      <div>
        <p className="text-xs font-bold text-primary">{title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{company}</p>
      </div>
    </div>
  );
}

function SearchField({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-3 bg-white rounded-xl px-4 py-3">
      <Icon name={icon} className="w-4 h-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full text-sm outline-none bg-transparent"
      />
    </label>
  );
}

function SearchSelect({
  icon,
  label,
  options,
}: {
  icon: string;
  label: string;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 bg-white rounded-xl px-3">
      <Icon
        name={icon}
        className="w-4 h-4 text-muted-foreground flex-shrink-0"
      />
      <select
        aria-label={label}
        defaultValue=""
        className="w-full py-3 text-sm bg-transparent outline-none text-muted-foreground"
      >
        <option value="" disabled>
          {label}
        </option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function FooterColumn({ title, links }: { title: string; links:{name: string; href: string;}[] }) {
  return (
    <div>
      <p className="text-sm font-bold">{title}</p>
      <div className="flex flex-col items-start gap-3 mt-4">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-xs text-white/55 hover:text-white transition-colors"
          >
            {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}
