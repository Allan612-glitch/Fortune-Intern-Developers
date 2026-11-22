import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "./StudentPortalUI.css";

export function StudentPage({ title, description, action, children }: {
  title: string; description?: string; action?: ReactNode; children: ReactNode;
}) {
  return <section className="student-page">
    <header className="student-heading">
      <div className="min-w-0"><h1>{title}</h1>
        {description && <p>{description}</p>}</div>
      {action}
    </header>
    {children}
  </section>;
}

export function StudentDisclosure({ title, subtitle, badge, open, onToggle, children }: {
  title: string; subtitle?: string; badge?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  const detailId = useId();
  return <li className="student-disclosure" data-open={open}>
    <button type="button" aria-expanded={open} aria-controls={detailId} onClick={onToggle} className="student-disclosure-trigger">
      <span className="student-disclosure-title">
        <span className="block font-semibold">{title}</span>
        {subtitle && <small className="block text-muted-foreground">{subtitle}</small>}
      </span>
      {badge && <span className="student-disclosure-badge">{badge}</span>}
      <ChevronDown className="size-4" aria-hidden="true" />
    </button>
    <div id={detailId} hidden={!open} className="student-disclosure-body">{open && children}</div>
  </li>;
}

export const studentLink = "inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90";
export const studentField = "min-h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm text-foreground";
