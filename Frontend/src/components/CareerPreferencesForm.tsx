import { useState, type FormEvent } from "react";
import { studentField, studentLink } from "./StudentPortalUI";
import { workModes, type CareerPreferences } from "../services/opportunities";
import { updateProfile } from "../services/auth";

const emptyCareer: CareerPreferences = { location: "", work_mode: "", available_from: null, portfolio_url: "" };

export default function CareerPreferencesForm({ initial }: { initial?: CareerPreferences }) {
  const [draft, setDraft] = useState(initial || emptyCareer);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError(false);
    try {
      const result = await updateProfile({ career: draft });
      setDraft(result.career || emptyCareer);
      setMessage("Career preferences saved.");
    } catch (error) {
      setError(true);
      setMessage(error instanceof Error ? error.message : "Unable to save your preferences.");
    } finally { setSaving(false); }
  }
  return <details className="student-panel p-3 sm:p-4">
    <summary className="cursor-pointer text-sm font-semibold">Career preferences</summary>
    <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={save}>
      <label className="grid gap-1 text-xs font-medium">Preferred location<input className={studentField} maxLength={160}
        value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} /></label>
      <label className="grid gap-1 text-xs font-medium">Preferred work mode<select className={studentField} value={draft.work_mode}
        onChange={event => setDraft({ ...draft, work_mode: event.target.value as CareerPreferences["work_mode"] })}>
        <option value="">Any work mode</option>{Object.entries(workModes).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select></label>
      <label className="grid gap-1 text-xs font-medium">Available from<input className={studentField} type="date"
        value={draft.available_from || ""} onChange={event => setDraft({ ...draft, available_from: event.target.value || null })} /></label>
      <label className="grid gap-1 text-xs font-medium">Portfolio link<input className={studentField} type="url" maxLength={500}
        placeholder="https://" value={draft.portfolio_url} onChange={event => setDraft({ ...draft, portfolio_url: event.target.value })} /></label>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><button className={studentLink} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</button>
        {message && <p role={error ? "alert" : "status"} className="text-xs">{message}</p>}
      </div>
    </form>
  </details>;
}
