import { useState } from "react";
import ApplyFormModal from "../components/ApplyFormModal";
import type { AppPage, AppUser } from "../App";

const jobs = [
  {
    id: 1,
    company: "Flutterwave",
    role: "Software Engineering Intern",
    location: "Accra, Remote",
    type: "Technology",
    tags: ["React", "Python", "API"],
    logo: "FL",
    color: "#F5B731",
    deadline: "Oct 15, 2026",
    applicants: 234,
    posted: "2d ago",
    remote: true,
    desc: "Join Africa's leading payments company as a software engineering intern and work on products used by millions.",
  },
  {
    id: 2,
    company: "Access Bank Ghana",
    role: "Finance & Investment Intern",
    location: "Accra",
    type: "Finance",
    tags: ["Excel", "Financial Modeling"],
    logo: "AB",
    color: "#2D3561",
    deadline: "Oct 20, 2026",
    applicants: 189,
    posted: "1d ago",
    remote: false,
    desc: "Support our finance team with investment analysis, reporting, and client relationship management.",
  },
  {
    id: 3,
    company: "Andela",
    role: "Product Management Intern",
    location: "Remote",
    type: "Technology",
    tags: ["Figma", "Agile", "Jira"],
    logo: "AN",
    color: "#10B981",
    deadline: "Oct 12, 2026",
    applicants: 412,
    posted: "3d ago",
    remote: true,
    desc: "Work with our product team to define features, gather requirements, and ship impactful products.",
  },
  {
    id: 4,
    company: "MTN Ghana",
    role: "Marketing Intern",
    location: "Accra",
    type: "Marketing",
    tags: ["Digital Marketing", "Analytics"],
    logo: "MT",
    color: "#FBBF24",
    deadline: "Oct 28, 2026",
    applicants: 156,
    posted: "5d ago",
    remote: false,
    desc: "Support MTN's marketing campaigns and help drive customer acquisition and brand awareness.",
  },
  {
    id: 5,
    company: "Vodafone Ghana",
    role: "Data Analytics Intern",
    location: "Accra, Hybrid",
    type: "Technology",
    tags: ["SQL", "Python", "Tableau"],
    logo: "VF",
    color: "#EF4444",
    deadline: "Nov 1, 2026",
    applicants: 98,
    posted: "1d ago",
    remote: true,
    desc: "Work with our data team to analyze user behavior, build dashboards, and derive actionable insights.",
  },
  {
    id: 6,
    company: "GCB Bank",
    role: "Operations & Risk Intern",
    location: "Accra",
    type: "Finance",
    tags: ["Risk Analysis", "Excel"],
    logo: "GC",
    color: "#8B5CF6",
    deadline: "Oct 18, 2026",
    applicants: 73,
    posted: "4d ago",
    remote: false,
    desc: "Support the operations and risk management division with process documentation and risk assessment.",
  },
  {
    id: 7,
    company: "Hubtel",
    role: "Software Dev Intern",
    location: "Accra",
    type: "Technology",
    tags: ["Node.js", "React", "PostgreSQL"],
    logo: "HB",
    color: "#0EA5E9",
    deadline: "Oct 25, 2026",
    applicants: 67,
    posted: "6h ago",
    remote: false,
    desc: "Build and maintain features for Hubtel's payments and messaging infrastructure used across Ghana.",
  },
  {
    id: 8,
    company: "Farmerline",
    role: "Content & Media Intern",
    location: "Remote",
    type: "Media",
    tags: ["Writing", "Social Media"],
    logo: "FL",
    color: "#059669",
    deadline: "Nov 5, 2026",
    applicants: 201,
    posted: "2d ago",
    remote: true,
    desc: "Create compelling content about agritech and agricultural development across West Africa.",
  },
  {
    id: 9,
    company: "Ecobank Ghana",
    role: "Digital Banking Intern",
    location: "Accra",
    type: "Finance",
    tags: ["Banking", "Research", "Excel"],
    logo: "EC",
    color: "#2563EB",
    deadline: "Nov 7, 2026",
    applicants: 118,
    posted: "3h ago",
    remote: false,
    desc: "Support digital banking initiatives and research customer trends across key financial products.",
  },
  {
    id: 10,
    company: "mPharma",
    role: "Business Operations Intern",
    location: "Accra, Hybrid",
    type: "Finance",
    tags: ["Operations", "Analytics"],
    logo: "MP",
    color: "#0F766E",
    deadline: "Nov 10, 2026",
    applicants: 91,
    posted: "1d ago",
    remote: true,
    desc: "Help improve healthcare access by supporting operations and cross-functional business projects.",
  },
  {
    id: 11,
    company: "Deloitte Ghana",
    role: "Audit & Assurance Intern",
    location: "Accra",
    type: "Finance",
    tags: ["Audit", "Accounting"],
    logo: "DT",
    color: "#65A30D",
    deadline: "Oct 30, 2026",
    applicants: 284,
    posted: "4d ago",
    remote: false,
    desc: "Gain hands-on experience supporting audit engagements for leading organizations in Ghana.",
  },
  {
    id: 12,
    company: "KPMG Ghana",
    role: "Advisory Intern",
    location: "Accra",
    type: "Finance",
    tags: ["Strategy", "Research"],
    logo: "KP",
    color: "#1D4ED8",
    deadline: "Nov 3, 2026",
    applicants: 244,
    posted: "2d ago",
    remote: false,
    desc: "Work with advisory teams on market research, analysis, and client-ready deliverables.",
  },
  {
    id: 13,
    company: "PwC Ghana",
    role: "Tax Intern",
    location: "Accra",
    type: "Finance",
    tags: ["Tax", "Excel"],
    logo: "PW",
    color: "#EA580C",
    deadline: "Nov 8, 2026",
    applicants: 173,
    posted: "5h ago",
    remote: false,
    desc: "Support tax professionals with research, compliance reviews, and client documentation.",
  },
  {
    id: 14,
    company: "Jumia Ghana",
    role: "Growth Marketing Intern",
    location: "Accra, Hybrid",
    type: "Marketing",
    tags: ["Growth", "E-commerce"],
    logo: "JM",
    color: "#F59E0B",
    deadline: "Nov 12, 2026",
    applicants: 129,
    posted: "1d ago",
    remote: true,
    desc: "Help plan and measure campaigns that connect more Ghanaian shoppers with online commerce.",
  },
  {
    id: 15,
    company: "Zipline Ghana",
    role: "Flight Operations Intern",
    location: "Omenako",
    type: "Technology",
    tags: ["Logistics", "Operations"],
    logo: "ZP",
    color: "#DC2626",
    deadline: "Oct 29, 2026",
    applicants: 82,
    posted: "3d ago",
    remote: false,
    desc: "Support life-saving autonomous delivery operations and flight readiness processes.",
  },
  {
    id: 16,
    company: "Stanbic Bank Ghana",
    role: "Client Solutions Intern",
    location: "Accra",
    type: "Finance",
    tags: ["Customer Success", "Banking"],
    logo: "SB",
    color: "#1E40AF",
    deadline: "Nov 15, 2026",
    applicants: 136,
    posted: "2d ago",
    remote: false,
    desc: "Learn how client teams create thoughtful financial solutions for individuals and businesses.",
  },
  {
    id: 17,
    company: "Unilever Ghana",
    role: "Brand Management Intern",
    location: "Tema",
    type: "Marketing",
    tags: ["Brand", "Consumer Insights"],
    logo: "UL",
    color: "#4338CA",
    deadline: "Nov 18, 2026",
    applicants: 205,
    posted: "6h ago",
    remote: false,
    desc: "Support iconic consumer brands with campaign planning and customer insight projects.",
  },
  {
    id: 18,
    company: "Newmont Ghana",
    role: "Environmental Intern",
    location: "Ahafo",
    type: "Technology",
    tags: ["ESG", "Field Research"],
    logo: "NG",
    color: "#B45309",
    deadline: "Nov 20, 2026",
    applicants: 64,
    posted: "1d ago",
    remote: false,
    desc: "Assist environmental teams with field monitoring, data collection, and sustainability reporting.",
  },
  {
    id: 19,
    company: "Graphic Communications Group",
    role: "Editorial Intern",
    location: "Accra",
    type: "Media",
    tags: ["Journalism", "Editing"],
    logo: "GC",
    color: "#7C3AED",
    deadline: "Nov 9, 2026",
    applicants: 77,
    posted: "3d ago",
    remote: false,
    desc: "Develop reporting and editing skills alongside one of Ghana’s leading newsrooms.",
  },
  {
    id: 20,
    company: "Ghana Cocoa Board",
    role: "Research Intern",
    location: "Accra",
    type: "Technology",
    tags: ["Research", "Data"],
    logo: "CB",
    color: "#92400E",
    deadline: "Nov 22, 2026",
    applicants: 103,
    posted: "5d ago",
    remote: false,
    desc: "Contribute to research and data projects supporting Ghana’s cocoa sector.",
  },
];

const types = ["All", "Technology", "Finance", "Marketing", "Media"];

export default function ProgramsPage({
  setPage,
  user,
}: {
  setPage: (p: AppPage) => void;
  user: AppUser;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selected, setSelected] = useState(jobs[0]);
  const [applyTarget, setApplyTarget] = useState<(typeof jobs)[0] | null>(null);

  const filtered = jobs.filter((j) => {
    const matchSearch =
      j.role.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === "All" || j.type === filter;
    const matchRemote = !remoteOnly || j.remote;
    return matchSearch && matchType && matchRemote;
  });

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-3.5rem)]">
      {/* List panel */}
      <div className="w-full lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-white">
        <div className="p-4 border-b border-border space-y-3">
          <h2
            className="font-bold text-base"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Browse Programs
          </h2>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search roles, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === t ? "text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
                style={
                  filter === t
                    ? {
                        background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                      }
                    : {}
                }
              >
                {t}
              </button>
            ))}
          </div>
          <label
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setRemoteOnly(!remoteOnly)}
          >
            <div
              className="w-9 h-5 rounded-full transition-colors relative"
              style={{ background: remoteOnly ? "#2D3561" : "#e5e7eb" }}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${remoteOnly ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </div>
            <span className="text-xs text-muted-foreground">Remote only</span>
          </label>
        </div>

        <div className="overflow-y-auto flex-1">
          <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground">
            {filtered.length} programs found
          </p>
          {filtered.map((job) => (
            <button
              key={job.id}
              onClick={() => {
                setSelected(job);
                if (window.innerWidth < 1024) setApplyTarget(job);
              }}
              className={`w-full text-left px-4 py-3.5 border-b border-border hover:bg-muted/30 transition-colors ${selected?.id === job.id ? "bg-secondary" : ""}`}
              style={
                selected?.id === job.id
                  ? { borderLeft: "3px solid #2D3561" }
                  : {}
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: job.color,
                    color: ["#F5B731", "#FBBF24"].includes(job.color)
                      ? "#1a1f3a"
                      : "white",
                  }}
                >
                  {job.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{job.role}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.company} · {job.location}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {job.posted}
                    </span>
                    <span className="lg:hidden text-[10px] font-semibold text-primary ml-auto">
                      View & apply
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="hidden lg:flex flex-1 flex-col overflow-y-auto bg-cream">
          <div className="p-8 border-b border-border bg-white">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: selected.color,
                  color: ["#F5B731", "#FBBF24"].includes(selected.color)
                    ? "#1a1f3a"
                    : "white",
                }}
              >
                {selected.logo}
              </div>
              <div className="flex-1">
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {selected.role}
                </h2>
                <p className="text-muted-foreground">
                  {selected.company} · {selected.location}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 bg-secondary rounded-full font-medium"
                      style={{ color: "#2D3561" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                ["Applicants", selected.applicants.toString()],
                ["Deadline", selected.deadline],
                ["Format", selected.remote ? "Remote" : "On-site"],
              ].map(([label, value]) => (
                <div key={label} className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-semibold text-sm">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setApplyTarget(selected)}
              className="px-8 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
              }}
            >
              Apply Now
            </button>
          </div>

          <div className="p-8">
            <h3 className="font-semibold mb-3">About this role</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {selected.desc}
            </p>

            <h3 className="font-semibold mb-3">Requirements</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              {[
                "Currently enrolled in a university (Level 200–400)",
                "Strong communication skills",
                `Familiarity with ${selected.tags.join(", ")}`,
                "Minimum CGPA of 3.0 / 5.0",
                "Available for at least 3 months",
              ].map((r) => (
                <li key={r} className="flex gap-2">
                  <span style={{ color: "#10B981" }}>✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {applyTarget && (
        <ApplyFormModal
          prefilledCompany={applyTarget.company}
          prefilledRole={applyTarget.role}
          ownerEmail={user.email}
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  );
}
