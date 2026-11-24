import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import AsyncState from "../components/AsyncState";
import { StudentDisclosure, StudentPage, studentField } from "../components/StudentPortalUI";
import type { Announcement } from "../services/platform";
import { useRequest } from "./AdminWorkflowUI";

export default function AnnouncementsPage() {
  const [params, setParams] = useSearchParams();
  const notice = params.get("notice");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const result = useRequest<Announcement[]>("/api/announcements", revision);
  const items = result?.data ?? [];
  const term = query.trim().toLowerCase();
  const shown = items.filter(item => item.id === notice || !term || [item.title, item.content, item.category || ""].some(value => value.toLowerCase().includes(term)));
  return <StudentPage title="Announcements">
    {items.length > 0 && <input type="search" className={studentField} aria-label="Search announcements" placeholder="Search announcements" value={query} onChange={event => setQuery(event.target.value)} />}
    {!result ? <AsyncState kind="loading" message="Loading announcements…" /> : result.error ? <AsyncState kind="error" message={result.error} onRetry={() => setRevision(n => n + 1)} /> : <>
      {notice && !items.some(item => item.id === notice) && <p className="student-panel p-3 text-sm" role="status">This announcement is unavailable.</p>}
      {shown.length ? <ul className="student-panel" aria-label="Announcements">{shown.map(item => <StudentDisclosure key={item.id}
        title={item.title} subtitle={new Date(item.created_at).toLocaleDateString("en-GH", { dateStyle: "medium" })}
        badge={<span className="rounded-md bg-secondary px-2 py-1 capitalize text-primary">{item.category || "General"}</span>}
        open={notice === item.id} onToggle={() => setParams(notice === item.id ? {} : { notice: item.id }, { replace: true })}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
        {item.target_university && <p className="mt-2 text-xs text-muted-foreground">For {item.target_university} students</p>}
      </StudentDisclosure>)}</ul> : <AsyncState kind="empty" message={term ? "No announcements match your search." : "There are no announcements yet."} />}
    </>}
  </StudentPage>;
}
