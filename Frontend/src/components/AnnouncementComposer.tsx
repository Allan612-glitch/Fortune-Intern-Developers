import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ghanaUniversities } from "../constants/universities";
import { listPrograms, publishAnnouncement, searchAnnouncementRecipients, type Announcement } from "../services/platform";

export const announcementCategories = ["general", "payments", "refund", "system"];

const control = "min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground";
const statuses = ["Submitted", "Under Review", "Shortlisted", "Accepted", "Rejected", "Withdrawn"];

export default function AnnouncementComposer({ onClose, onPublished }: { onClose: () => void; onPublished: (item: Announcement) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState("general");
  const [audience, setAudience] = useState("all");
  const [target, setTarget] = useState("");
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Awaited<ReturnType<typeof searchAnnouncementRecipients>>>([]);
  const [selected, setSelected] = useState<typeof students>([]);
  const [programs, setPrograms] = useState<Awaited<ReturnType<typeof listPrograms>>>([]);
  const [lookupError, setLookupError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const term = query.trim();
    setLookupError("");
    setStudents([]);
    setPrograms([]);
    if ((audience !== "students" && audience !== "program") || term.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const load = audience === "students"
        ? searchAnnouncementRecipients(term).then(rows => { if (active) setStudents(rows); })
        : listPrograms(term, "All", "all").then(rows => { if (active) setPrograms(rows); });
      void load.catch(() => { if (active) setLookupError("Could not search. Change the search text to retry."); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, audience]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const item = await publishAnnouncement({
        title: String(values.get("title")).trim(), content: String(values.get("content")).trim(), category, audience,
        target_university: audience === "university" ? target : undefined, target: target || undefined,
        student_ids: audience === "students" ? selected.map(student => student.id) : undefined,
      });
      onPublished(item);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to publish announcement.");
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="announcement-composer-title" onClose={onClose}
      onCancel={event => { if (busy) event.preventDefault(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-foreground shadow-xl backdrop:bg-black/50 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="announcement-composer-title" className="text-xl font-bold">New announcement</h2>
        <button type="button" aria-label="Close announcement" disabled={busy} onClick={() => dialog.current?.close()} className="grid size-10 place-items-center rounded-lg hover:bg-secondary"><X className="size-5" aria-hidden="true" /></button>
      </div>
      <form onSubmit={event => void submit(event)} className="space-y-4">
        <label className="grid gap-1 text-sm font-semibold">Title<input name="title" maxLength={180} required className={control} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">Category<select value={category} onChange={e => setCategory(e.target.value)} className={control}>
            {announcementCategories.map(option => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
          </select></label>
          <label className="grid gap-1 text-sm font-semibold">Audience<select value={audience} className={control}
            onChange={e => { setAudience(e.target.value); setTarget(""); setQuery(""); setSelected([]); }}>
            <option value="all">All students</option><option value="students">Specific students</option>
            <option value="university">University group</option><option value="program">Program applicants</option>
            <option value="application_status">Application status</option>
          </select></label>
        </div>
        {audience === "university" && <label className="grid gap-1 text-sm font-semibold">University<select required value={target} onChange={e => setTarget(e.target.value)} className={control}>
          <option value="">Choose a university</option>{ghanaUniversities.map(name => <option key={name}>{name}</option>)}
        </select></label>}
        {audience === "application_status" && <label className="grid gap-1 text-sm font-semibold">Application status<select required value={target} onChange={e => setTarget(e.target.value)} className={control}>
          <option value="">Choose a status</option>{statuses.map(name => <option key={name}>{name}</option>)}
        </select></label>}
        {(audience === "students" || audience === "program") && (
          <div className="space-y-2">
            <label className="grid gap-1 text-sm font-semibold">{audience === "students" ? "Search students" : "Search programs"}
              <input type="search" value={query} maxLength={100} onChange={e => setQuery(e.target.value)} placeholder="Type at least two characters" className={control} />
            </label>
            {lookupError && <p role="alert" className="text-sm text-red-800">{lookupError}</p>}
            {audience === "students" ? (
              <>
                {selected.length > 0 && <div className="flex flex-wrap gap-2">{selected.map(item => (
                  <button key={item.id} type="button" onClick={() => setSelected(current => current.filter(student => student.id !== item.id))}
                    className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary" aria-label={`Remove ${item.name}`}>{item.name} ×</button>
                ))}</div>}
                <div className="max-h-40 divide-y divide-border overflow-auto">{students.filter(item => !selected.some(student => student.id === item.id)).map(item => (
                  <button key={item.id} type="button" disabled={selected.length >= 50} onClick={() => setSelected(current => [...current, item])}
                    className="block min-h-11 w-full p-2 text-left text-sm hover:bg-secondary disabled:opacity-50">{item.name}<span className="block break-all text-xs text-muted-foreground">{item.email}</span></button>
                ))}</div>
              </>
            ) : (
              <>
                {target && <p className="text-xs text-primary">Selected program: {programs.find(program => program.id === target)?.name || "previous selection"}</p>}
                <div className="max-h-40 divide-y divide-border overflow-auto">{programs.map(program => (
                  <button key={program.id} type="button" aria-pressed={target === program.id} onClick={() => setTarget(program.id)}
                    className="block min-h-11 w-full p-2 text-left text-sm hover:bg-secondary aria-pressed:bg-secondary">{program.name}</button>
                ))}</div>
              </>
            )}
          </div>
        )}
        <label className="grid gap-1 text-sm font-semibold">Message<textarea name="content" maxLength={8000} required rows={5} className={`${control} py-2`} /></label>
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy || (audience === "students" ? selected.length === 0 : audience !== "all" && !target)}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Publishing…" : "Publish announcement"}</button>
      </form>
    </dialog>
  );
}
