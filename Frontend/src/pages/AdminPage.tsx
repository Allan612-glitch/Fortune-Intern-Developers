import { useEffect, useState } from "react";
import {
  listAdminApplications,
  listAdminUsers,
  listAnnouncements,
  publishAnnouncement,
  saveResumeDownload,
  setApplicationStatus,
  setUserSuspension,
  type AdminUser,
  type Announcement,
  type BackendApplication,
} from "../services/platform";

const initialUsers = [
  {
    id: 1,
    name: "Kwame Asante",
    email: "kwame@ug.edu.gh",
    role: "Student",
    suspended: false,
    joined: "Sep 1, 2026",
  },
  {
    id: 2,
    name: "Ama Boateng",
    email: "ama.boateng@knust.edu.gh",
    role: "Student",
    suspended: false,
    joined: "Sep 5, 2026",
  },
  {
    id: 3,
    name: "Allan Fiifi Buaful",
    email: "buafallan56@gmail.com",
    role: "Admin",
    suspended: false,
    joined: "Aug 1, 2026",
  },
  {
    id: 4,
    name: "Yaw Mensah",
    email: "yaw.mensah@email.com",
    role: "Student",
    suspended: true,
    joined: "Sep 10, 2026",
  },
  {
    id: 5,
    name: "Akosua Frimpong",
    email: "akosua@ucc.edu.gh",
    role: "Student",
    suspended: false,
    joined: "Sep 12, 2026",
  },
];

const applications = [
  {
    id: 1,
    student: "Ama Boateng",
    company: "Flutterwave",
    role: "Software Intern",
    status: "review",
    date: "Sep 22, 2026",
  },
  {
    id: 2,
    student: "Yaw Mensah",
    company: "MTN Ghana",
    role: "Marketing Intern",
    status: "applied",
    date: "Sep 24, 2026",
  },
  {
    id: 3,
    student: "Akosua Frimpong",
    company: "Vodafone Ghana",
    role: "Data Analytics Intern",
    status: "interview",
    date: "Sep 20, 2026",
  },
  {
    id: 4,
    student: "Kwame Asante",
    company: "Andela",
    role: "PM Intern",
    status: "offered",
    date: "Sep 15, 2026",
  },
];

const statusBadge: Record<string, string> = {
  applied: "status-applied",
  review: "status-review",
  interview: "status-interview",
  offered: "status-offered",
  rejected: "status-rejected",
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [applications, setApplications] = useState<BackendApplication[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tab, setTab] = useState<"users" | "announcements" | "applications">(
    "users",
  );
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listAdminUsers(), listAdminApplications(), listAnnouncements()])
      .then(([loadedUsers, loadedApplications, loadedAnnouncements]) => {
        setUsers(loadedUsers);
        setApplications(loadedApplications);
        setAnnouncements(loadedAnnouncements);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load admin data."));
  }, []);

  const toggleSuspend = async (account: AdminUser) => {
    try {
      const updated = await setUserSuspension(account.id, !account.is_suspended);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update user status.");
    }
  };

  const updateStatus = async (application: BackendApplication, status: string) => {
    try {
      const updated = await setApplicationStatus(application.id, status);
      setApplications((current) => current.map((row) => row.id === updated.id ? updated : row));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update application status.");
    }
  };

  const submitAnnouncement = async () => {
    try {
      await publishAnnouncement(annTitle, annContent);
      setAnnouncements(await listAnnouncements());
      setPublished(true);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish announcement.");
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Admin Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage student users, announcements and applications
          </p>
        </div>
        <div
          className="ml-auto px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
        >
          ADMIN
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Users", value: users.length, icon: "👥" },
          { label: "Announcements", value: announcements.length, icon: "📢" },
          { label: "Applications", value: applications.length, icon: "📋" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5 overflow-x-auto">
        {(["users", "applications", "announcements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            style={
              tab === t
                ? { background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }
                : {}
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === "users" && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Users ({users.length})
            </p>
          </div>
          <div className="divide-y divide-border">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                    }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email} · {user.is_admin ? "Admin" : "Student"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.is_suspended && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                      Suspended
                    </span>
                  )}
                  {!user.is_admin && (
                    <button
                      onClick={() => void toggleSuspend(user)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${user.is_suspended ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                    >
                      {user.is_suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {tab === "applications" && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Applications ({applications.length})
            </p>
          </div>
          <div className="divide-y divide-border">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm">{app.applicant_name || `Applicant ${app.user_id.slice(0, 8)}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {app.program_name} · {new Date(app.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[app.student_index_number, app.gender, app.year_of_study].filter(Boolean).join(" · ") || "No academic details"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[app.status] || "status-applied"}`}
                  >
                    {app.status}
                  </span>
                  {app.resume_filename && <button onClick={() => void saveResumeDownload(app.id, true, app.resume_filename || "resume").catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to download resume."))} className="text-xs font-semibold text-primary underline">Resume</button>}
                  <button onClick={() => void updateStatus(app, "accepted")} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-semibold">
                    Accept
                  </button>
                  <button onClick={() => void updateStatus(app, "rejected")} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-semibold">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements */}
      {tab === "announcements" && (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-5">Publish Announcement</h3>
          {published ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📢</div>
              <p className="font-semibold text-emerald-700">
                Announcement published!
              </p>
              <button
                onClick={() => {
                  setPublished(false);
                  setAnnTitle("");
                  setAnnContent("");
                }}
                className="mt-4 text-sm text-muted-foreground hover:underline"
              >
                Publish another
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-muted-foreground">
                  Title
                </label>
                <input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Announcement title..."
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 bg-muted/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-muted-foreground">
                  Content
                </label>
                <textarea
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Announcement content..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 bg-muted/30 resize-none"
                />
              </div>
              <button
                onClick={() => void submitAnnouncement()}
                className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                }}
              >
                Publish Announcement
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
