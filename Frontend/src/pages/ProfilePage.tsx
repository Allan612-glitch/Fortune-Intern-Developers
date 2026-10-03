import { useEffect, useState } from "react";
import type { AppUser } from "../App";
import {
  deleteProfileDocument,
  downloadProfileDocument,
  getProfile,
  listProfileDocuments,
  updateProfile,
  uploadProfileDocument,
  type ProfileData,
  type ProfileDocument,
  type ProfileExperience,
} from "../services/auth";
import {
  getDashboard,
  getNotificationPreferences,
  updateNotificationPreferences,
  type DashboardSummary,
  type NotificationPreferences,
} from "../services/platform";

export default function ProfilePage({ user }: { user: AppUser }) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user.name,
    username: user.email.split("@")[0],
    school: user.school,
    major: user.major,
    yearOfStudy: "",
    cgpa: "",
    cgpaScale: "4.0",
  });
  const [draft, setDraft] = useState(profile);
  const [profileError, setProfileError] = useState("");
  const [serverProfile, setServerProfile] = useState<ProfileData | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    sms_notifications: false,
    opportunity_alerts: true,
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [experiences, setExperiences] = useState<ProfileExperience[]>([]);
  const [experienceDraft, setExperienceDraft] = useState<ProfileExperience>({
    role: "",
    organization: "",
    period: "",
    description: "",
  });
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    Promise.all([getProfile(), getNotificationPreferences(), listProfileDocuments(), getDashboard()])
      .then(([result, savedPreferences, savedDocuments, summary]) => {
        setServerProfile(result);
        setPreferences(savedPreferences);
        setDocuments(savedDocuments);
        setDashboard(summary);
        setSkills((result.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean));
        setExperiences(result.experience || []);
        const savedProfile = {
          name: user.name,
          username: user.email.split("@")[0],
          school: result.university || "",
          major: result.major || result.course || "",
          yearOfStudy: result.year_of_study?.toString() || "",
          cgpa: result.cgpa?.toString() || "",
          cgpaScale: result.cgpa_scale?.toString() || "4.0",
        };
        setProfile(savedProfile);
        setDraft(savedProfile);
      })
      .catch((error) => setProfileError(error instanceof Error ? error.message : "Unable to load profile."));
  }, [user.email, user.name]);
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
  const saveProfile = async () => {
    if (
      !draft.school.trim() ||
      !draft.major.trim()
    ) {
      setProfileError("University and programme are required.");
      return;
    }
    setSaving(true);
    setProfileError("");
    try {
      const saved = await updateProfile({
        ...(serverProfile || {}),
        university: draft.school.trim(),
        major: draft.major.trim(),
        course: draft.major.trim(),
        year_of_study: draft.yearOfStudy ? Number(draft.yearOfStudy) : null,
        cgpa: draft.cgpa ? Number(draft.cgpa) : null,
        cgpa_scale: draft.cgpaScale ? Number(draft.cgpaScale) : null,
      });
      setServerProfile(saved);
      setProfile({
        ...profile,
        school: saved.university || "",
        major: saved.major || saved.course || "",
        yearOfStudy: saved.year_of_study?.toString() || "",
        cgpa: saved.cgpa?.toString() || "",
        cgpaScale: saved.cgpa_scale?.toString() || "4.0",
      });
      setEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const changePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      setPreferences(await updateNotificationPreferences(next));
      setProfileError("");
    } catch (error) {
      setPreferences(preferences);
      setProfileError(error instanceof Error ? error.message : "Unable to save notification preferences.");
    }
  };

  const saveSkills = async (next: string[]) => {
    try {
      const saved = await updateProfile({ skills: next.join(", ") });
      setServerProfile(saved);
      setSkills(next);
      setProfileError("");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save skills.");
    }
  };

  const addSkill = () => {
    const value = skillDraft.trim();
    if (!value || skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) return;
    setSkillDraft("");
    void saveSkills([...skills, value]);
  };

  const saveExperience = async () => {
    if (!experienceDraft.role.trim() || !experienceDraft.organization.trim()) {
      setProfileError("Role and organization are required for experience.");
      return;
    }
    const next = [...experiences, experienceDraft];
    try {
      const saved = await updateProfile({ experience: next });
      setExperiences(saved.experience || []);
      setServerProfile(saved);
      setExperienceDraft({ role: "", organization: "", period: "", description: "" });
      setProfileError("");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save experience.");
    }
  };

  const removeExperience = async (index: number) => {
    const next = experiences.filter((_, itemIndex) => itemIndex !== index);
    try {
      const saved = await updateProfile({ experience: next });
      setExperiences(saved.experience || []);
      setServerProfile(saved);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to remove experience.");
    }
  };

  const uploadDocument = async (file?: File) => {
    if (!file) return;
    setDocumentBusy(true);
    try {
      const saved = await uploadProfileDocument(file);
      setDocuments((current) => [saved, ...current]);
      setProfileError("");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to upload document.");
    } finally {
      setDocumentBusy(false);
    }
  };

  const downloadDocument = async (document: ProfileDocument) => {
    try {
      const blob = await downloadProfileDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to download document.");
    }
  };

  const removeDocument = async (document: ProfileDocument) => {
    setDocumentBusy(true);
    try {
      await deleteProfileDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setProfileError("");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to delete document.");
    } finally {
      setDocumentBusy(false);
    }
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
            [String(dashboard?.total_applications ?? 0), "Applications"],
            [String(dashboard?.interviews ?? 0), "Interviews"],
            [String(dashboard?.accepted_applications ?? 0), "Offers"],
            [`${dashboard?.profile_completion ?? 0}%`, "Complete"],
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
        <section className="mt-5 bg-white border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-sm">Notification Preferences</h2>
          <div className="mt-3 grid sm:grid-cols-3 gap-4">
            {([
              ["email_notifications", "Email updates"],
              ["sms_notifications", "SMS updates"],
              ["opportunity_alerts", "Opportunity alerts"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(event) => void changePreference(key, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </section>
      </div>
      {profileError && !editing && <p className="mb-4 text-sm text-red-600" role="alert">{profileError}</p>}

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
                  ["yearOfStudy", "Year of study (1-6)"],
                  ["cgpa", "CGPA"],
                  ["cgpaScale", "CGPA scale"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold">
                  {label}
                  <input
                    value={draft[key]}
                    onChange={(event) => updateDraft(key, event.target.value)}
                    type={key === "cgpa" || key === "cgpaScale" || key === "yearOfStudy" ? "number" : "text"}
                    min={key === "cgpa" || key === "yearOfStudy" ? 0 : undefined}
                    step={key === "cgpa" || key === "cgpaScale" ? 0.1 : 1}
                    disabled={key === "name" || key === "username"}
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 disabled:opacity-60"
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
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90"
              >
                {saving ? "Saving..." : "Save Profile"}
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
              <div className="flex items-center gap-2">
                <input
                  value={skillDraft}
                  onChange={(event) => setSkillDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }}
                  aria-label="Add a skill"
                  placeholder="Add a skill"
                  className="w-32 px-2 py-1.5 rounded-lg border border-border text-xs"
                />
                <button onClick={addSkill} className="text-xs font-semibold text-primary">Add</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: "#EEF0F8", color: "#2D3561" }}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => void saveSkills(skills.filter((item) => item !== skill))}
                    aria-label={`Remove ${skill}`}
                    className="font-bold"
                  >×</button>
                </span>
              ))}
              {!skills.length && <p className="text-xs text-muted-foreground">No skills added yet.</p>}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Experience</h2>
              <button onClick={() => setExperienceDraft({ role: "", organization: "", period: "", description: "" })} className="text-xs font-semibold text-primary">Clear form</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mb-4">
              {([
                ["role", "Role"],
                ["organization", "Organization"],
                ["period", "Period"],
              ] as const).map(([key, label]) => (
                <input key={key} value={experienceDraft[key]} onChange={(event) => setExperienceDraft((current) => ({ ...current, [key]: event.target.value }))} placeholder={label} aria-label={label} className="px-3 py-2 rounded-lg border border-border text-xs" />
              ))}
              <textarea value={experienceDraft.description} onChange={(event) => setExperienceDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" aria-label="Experience description" rows={2} className="sm:col-span-2 px-3 py-2 rounded-lg border border-border text-xs resize-y" />
              <button onClick={() => void saveExperience()} className="sm:col-span-2 justify-self-start px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold">Add experience</button>
            </div>
            <div className="space-y-4">
              {experiences.map((experience, index) => (
                <div key={`${experience.role}-${index}`} className="flex gap-3">
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
                    <p className="font-semibold text-sm">{experience.role}</p>
                    <p className="text-xs text-muted-foreground">
                      {experience.organization} · {experience.period}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {experience.description}
                    </p>
                  </div>
                  <button onClick={() => void removeExperience(index)} className="ml-auto text-xs text-red-600" aria-label={`Remove ${experience.role}`}>Remove</button>
                </div>
              ))}
              {!experiences.length && <p className="text-xs text-muted-foreground">No experience added yet.</p>}
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
                <p className="font-semibold text-sm">B.Sc {profile.major || "Programme not set"}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.school || "University not set"} · {profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : "Study year not set"}
                </p>
                <p className="text-xs mt-0.5 font-medium text-emerald-600">
                  CGPA: {profile.cgpa ? `${profile.cgpa} / ${profile.cgpaScale}` : "Not provided"}
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
                  strokeDashoffset={201 * (1 - (dashboard?.profile_completion ?? 0) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-lg">{dashboard?.profile_completion ?? 0}%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                ["Basic info", Boolean(profile.school && profile.major)],
                ["Skills", skills.length > 0],
                ["Experience", experiences.length > 0],
                ["Upload CV", documents.some((document) => /cv|resume/i.test(document.filename))],
                ["Profile photo", Boolean(serverProfile?.profile_picture)],
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
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg"
                >
                  <div className="w-7 h-7 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-red-600">
                      PDF
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{document.filename}</p>
                    <p className="text-[10px] text-muted-foreground">{(document.file_size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => void downloadDocument(document)} className="text-xs text-primary font-semibold" aria-label={`Download ${document.filename}`}>Download</button>
                  <button onClick={() => void removeDocument(document)} disabled={documentBusy} className="text-xs text-red-600 font-semibold disabled:opacity-50" aria-label={`Delete ${document.filename}`}>Delete</button>
                </div>
              ))}
              {!documents.length && <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>}
              <label className={`block w-full py-2 border border-dashed border-border rounded-lg text-xs text-center text-muted-foreground hover:bg-muted/30 transition-colors ${documentBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
                {documentBusy ? "Uploading..." : "Upload PDF, DOC, or DOCX"}
                <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(event) => { void uploadDocument(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
