import { useCallback, useEffect, useState } from "react";
import AsyncState from "../components/AsyncState";
import type { AppUser } from "../App";
import { listAnnouncements, publishAnnouncement, type Announcement } from "../services/platform";

export default function AnnouncementsPage({ user }: { user: AppUser }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loadError, setLoadError] = useState("");
  const [publishError, setPublishError] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setAnnouncements(await listAnnouncements());
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : "Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    if (!title.trim() || !content.trim()) return;
    setPublishing(true);
    setPublishError("");
    try {
      await publishAnnouncement(title.trim(), content.trim());
      setTitle("");
      setContent("");
      await load();
    } catch (requestError) {
      setPublishError(requestError instanceof Error ? requestError.message : "Unable to publish announcement.");
    } finally {
      setPublishing(false);
    }
  };

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

      {loading ? (
        <AsyncState kind="loading" message="Loading announcements..." />
      ) : loadError ? (
        <AsyncState
          kind="error"
          message={loadError}
          onRetry={() => void load()}
        />
      ) : announcements.length === 0 ? (
        <AsyncState kind="empty" message="There are no announcements yet." />
      ) : (
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
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {ann.content}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: "#2D3561" }}
                >
                  F
                </div>
                <span>Fortune Intern Network</span>
                <span>·</span>
                <span>{new Date(ann.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {user.isAdmin && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-sm text-red-700 mb-3">
            Admin: Publish Announcement
          </h3>
          <div className="space-y-3">
            {publishError && (
              <p className="text-sm text-red-700" role="alert">
                {publishError}
              </p>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1 text-red-700">
                Title
              </label>
              <input
                placeholder="Announcement title..."
                className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm focus:outline-none focus:ring-2 bg-white"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setPublishError("");
                }}
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
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setPublishError("");
                }}
              />
            </div>
            <button
              onClick={publish}
              disabled={publishing || !title.trim() || !content.trim()}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
              }}
            >
              {publishing ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
