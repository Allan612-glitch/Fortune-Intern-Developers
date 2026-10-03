import type { AppUser } from "../App";

const announcements = [
  {
    id: 1,
    title: "New Internship Cohort Now Open!",
    content:
      "We are excited to announce that applications for the 2026 Q4 internship cohort are now open. Over 200 companies are participating this season. Apply early — spots fill fast!",
    date: "Sep 25, 2026",
    author: "FIN Team",
    badge: "New",
    badgeColor: "#10B981",
  },
  {
    id: 2,
    title: "AI Letter Writing Feature Launched",
    content:
      "Fortune Intern Network now offers AI-powered internship letter writing for Pro subscribers. Log into your account, select a role, and let our AI craft a personalized letter in seconds.",
    date: "Sep 22, 2026",
    author: "Product Team",
    badge: "Feature",
    badgeColor: "#2D3561",
  },
  {
    id: 3,
    title: "Workshop: How to Ace Internship Interviews",
    content:
      "Join us this Saturday, September 28 at 10:00 AM for a free online workshop on interview preparation, CV optimization, and networking strategies for students. Register via the link below.",
    date: "Sep 20, 2026",
    author: "FIN Academy",
    badge: "Event",
    badgeColor: "#F5B731",
  },
  {
    id: 4,
    title: "Paystack Integration Complete",
    content:
      "Applications can now be completed securely using Paystack-supported payment methods including Visa/Mastercard, MTN Mobile Money, and bank transfer.",
    date: "Sep 18, 2026",
    author: "Tech Team",
    badge: "Update",
    badgeColor: "#8B5CF6",
  },
  {
    id: 5,
    title: "Partnership with Ashesi University",
    content:
      "We have officially partnered with Ashesi University to provide exclusive internship opportunities for enrolled students. Ashesi students can now access premium features at a 50% discount.",
    date: "Sep 15, 2026",
    author: "Partnerships",
    badge: "Partnership",
    badgeColor: "#EF4444",
  },
];

export default function AnnouncementsPage({ user }: { user: AppUser }) {
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Announcements
        </h1>
        <p className="text-sm text-muted-foreground">
          Stay up to date with the latest from Fortune Intern Network.
        </p>
      </div>

      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-white border border-border rounded-2xl p-5 shadow-sm hover-lift slide-in"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-semibold text-base leading-snug flex-1">
                {ann.title}
              </h2>
              <span
                className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full text-white font-semibold"
                style={{
                  backgroundColor: ann.badgeColor,
                  color: ann.badgeColor === "#F5B731" ? "#1a1f3a" : "white",
                }}
              >
                {ann.badge}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {ann.content}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: "#2D3561" }}
              >
                {ann.author[0]}
              </div>
              <span>{ann.author}</span>
              <span>·</span>
              <span>{ann.date}</span>
            </div>
          </div>
        ))}
      </div>

      {user.isAdmin && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-sm text-red-700 mb-3">
            Admin: Publish Announcement
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-red-700">
                Title
              </label>
              <input
                placeholder="Announcement title..."
                className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm focus:outline-none focus:ring-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-red-700">
                Content
              </label>
              <textarea
                placeholder="Announcement content..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm focus:outline-none focus:ring-2 bg-white resize-none"
              />
            </div>
            <button
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
              }}
            >
              Publish Announcement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
