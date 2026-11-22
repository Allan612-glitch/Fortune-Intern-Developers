import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { apiRequest } from "../services/api";
import type { RefObject } from "react";

export const field = "w-full min-h-11 rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm text-foreground";
export const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50";
export const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50";
export const money = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value / 100);
export const monthNow = () => new Date().toISOString().slice(0, 7);
export const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export const label = (value: string) => value.replace(/[_.]/g, " ").replace(/^./, char => char.toUpperCase());
export const failureMessage = (error: unknown) => error instanceof Error ? error.message : "The request could not be completed.";

export function useDebounced<T>(value: T, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function useRequest<T>(path: string, revision = 0) {
  const [result, setResult] = useState<{ path: string; revision: number; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    apiRequest<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ path, revision, data });
    }, error => {
      if (!controller.signal.aborted) setResult({ path, revision, error: failureMessage(error) });
    });
    return () => controller.abort();
  }, [path, revision]);
  return result?.path === path && result.revision === revision ? result : null;
}

export function Field({ name, children }: { name: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-foreground">{name}{children}</label>;
}

export function PanelDialog({ dialog, title, children }: { dialog: RefObject<HTMLDialogElement | null>; title: string; children: ReactNode }) {
  return <dialog ref={dialog} aria-label={title} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-[var(--surface)] p-0 text-foreground shadow-2xl backdrop:bg-black/50">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-[var(--surface)] px-3 py-2 sm:px-5 sm:py-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <button className={button} type="button" aria-label="Close dialog" onClick={() => dialog.current?.close()}><X className="size-4" /></button>
    </div>
    <div className="p-3 sm:p-5">{children}</div>
  </dialog>;
}

export function AccountPicker({ value, onChange, required = false }: { value: string; onChange: (id: string) => void; required?: boolean }) {
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const result = useRequest<{ id: string; name: string; email: string }[]>(search.length >= 2 ? "/api/admin/recipient-search?q=" + encodeURIComponent(search) : "");
  return <fieldset className="grid gap-2">
    <legend className="mb-2 text-sm font-medium">Recipient account {required ? "" : "(optional)"}</legend>
    <input type="search" value={query} maxLength={120} aria-label="Find an account" className={field}
      placeholder="Search by name or email" onChange={event => { setQuery(event.target.value); onChange(""); }} />
    {search.length >= 2 && <select aria-label="Recipient account" required={required} className={field} value={value} onChange={event => onChange(event.target.value)}>
      <option value="">{result?.data?.length ? "Select an account" : result?.data ? "No matching accounts" : "Searching…"}</option>
      {result?.data?.map(account => <option key={account.id} value={account.id}>{account.name} · {account.email}</option>)}
    </select>}
    {result?.error && <p role="alert" className="text-sm text-muted-foreground">{result.error}</p>}
  </fieldset>;
}

export function PageControls({ page, total, setPage }: { page: number; total: number; setPage: (page: number) => void }) {
  const last = Math.max(1, Math.ceil(total / 25));
  return <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-sm">
    <span>{total.toLocaleString()} records</span>
    <div className="flex items-center gap-2">
      <button type="button" className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>{page} / {last}</span>
      <button type="button" className={button} disabled={page >= last} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </footer>;
}
