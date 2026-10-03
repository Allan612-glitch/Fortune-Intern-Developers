import { useState } from "react";
import type { AppUser } from "../App";

const skills = ["React", "Python", "JavaScript", "SQL", "Figma", "Node.js"];

export default function ProfilePage({ user }: { user: AppUser }) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user.name,
    username: user.email.split("@")[0],
    school: user.school,
    major: user.major,
  });
  const [draft, setDraft] = useState(profile);
  const [profileError, setProfileError] = useState("");
  const updateDraft = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const handleEditProfile = () => {
    setDraft(profile);
    setProfileError("");
    setEditing(true);
  };
  const closeEditor = () => {
    setDraft(profile);
    setProfileError("");
    setEditing(false);
  };
  const saveProfile = () => {
    if (
      !draft.name.trim() ||
      !draft.username.trim() ||
      !draft.school.trim() ||
      !draft.major.trim()
    ) {
      setProfileError(
        "Profile name, username, university, and programme are required.",
      );
      return;
    }
    setProfile({
      name: draft.name.trim(),
      username: draft.username.trim(),
      school: draft.school.trim(),
      major: draft.major.trim(),
    });
    setEditing(false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="gradient-hero rounded-2xl p-6 mb-5 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
          style={{
            background: "#F5B731",
            filter: "blur(30px)",
            transform: "translate(30%,-30%)",
          }}
        />
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #F5B731, #d9a020)",
              color: "#1a1f3a",
            }}
          >
            {user.avatar}
          </div>
          <div className="flex-1">
            <h1
              className="text-xl font-bold text-white"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {draft.name}
            </h1>
            <p className="text-white/60 text-sm">
              {draft.school} · {draft.major}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              @{draft.username} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleEditProfile()}
            className="relative z-10 cursor-pointer px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
          >
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          {[
            ["12", "Applications"],
            ["3", "Interviews"],
            ["1", "Offers"],
            ["847", "Views"],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <div
                className="text-lg font-bold text-white"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {v}
              </div>
              <div className="text-[10px] text-white/50">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-[100] pointer-events-auto bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 id="edit-profile-title" className="font-semibold text-lg">
                Edit Profile
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="w-9 h-9 rounded-xl hover:bg-secondary text-lg"
                aria-label="Close edit profile dialog"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              {(
                [
                  ["name", "Profile Name"],
                  ["username", "Username"],
                  ["school", "University"],
                  ["major", "Programme / Major"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold">
                  {label}
                  <input
                    value={draft[key]}
                    onChange={(event) => updateDraft(key, event.target.value)}
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2"
                  />
                </label>
              ))}
            </div>
            {profileError && (
              <p className="text-xs text-red-600 mt-4" role="alert">
                {profileError}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeEditor}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Skills */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Skills</h2>
              <button
                className="text-xs font-semibold hover:underline"
                style={{ color: "#F5B731" }}
              >
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: "#EEF0F8", color: "#2D3561" }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Experience</h2>
              <button
                className="text-xs font-semibold hover:underline"
                style={{ color: "#F5B731" }}
              >
                + Add
              </button>
            </div>
            <div className="space-y-4">
              {[
                {
                  role: "Frontend Developer (Freelance)",
                  org: "Self-employed",
                  period: "Jan 2026 – Present",
                  desc: "Built 3 web apps for small businesses using React and Tailwind CSS.",
                },
                {
                  role: "Tech Lead",
                  org: "University Developers Club",
                  period: "Sep 2025 – Present",
                  desc: "Led a team of 12 developers and organized hackathons for 200+ students.",
                },
              ].map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "#EEF0F8" }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="#2D3561"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{e.role}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.org} · {e.period}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {e.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Education</h2>
              <button
                className="text-xs font-semibold hover:underline"
                style={{ color: "#F5B731" }}
              >
                + Add
              </button>
            </div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">B.Sc {user.major}</p>
                <p className="text-xs text-muted-foreground">
                  {user.school} · 2023 – Present
                </p>
                <p className="text-xs mt-0.5 font-medium text-emerald-600">
                  CGPA: 3.8 / 4.0
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Completeness */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Profile Completeness</h3>
            <div className="relative w-20 h-20 mx-auto mb-4">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="#F5B731"
                  strokeWidth="8"
                  strokeDasharray="201"
                  strokeDashoffset="50"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-lg">75%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                ["Basic info", true],
                ["Skills", true],
                ["Experience", true],
                ["Upload CV", false],
                ["Profile photo", false],
              ].map(([l, done]) => (
                <div
                  key={l as string}
                  className="flex items-center gap-2 text-xs"
                >
                  <span style={{ color: done ? "#10B981" : "#9ca3af" }}>
                    {done ? "✓" : "○"}
                  </span>
                  <span style={{ color: done ? "#1a1f3a" : "#9ca3af" }}>
                    {l as string}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Documents</h3>
            <div className="space-y-2">
              {[
                ["My CV - 2026.pdf", "234 KB"],
                ["Transcript.pdf", "1.2 MB"],
              ].map(([name, size]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg"
                >
                  <div className="w-7 h-7 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-red-600">
                      PDF
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground">{size}</p>
                  </div>
                  <span className="text-emerald-500 text-xs">✓</span>
                </div>
              ))}
              <button className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/30 transition-colors">
                + Upload document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
