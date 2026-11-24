import { SlidersHorizontal, X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

export default function FilterMenu({ label = "Filters", active = false, children }: {
  label?: string;
  active?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  return <div className="shrink-0">
    <button type="button" popoverTarget={id} aria-label={active ? `${label}, active` : label} title={label}
      className="relative grid size-11 place-items-center rounded-lg border border-border bg-card text-foreground"
      onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        panel.current?.style.setProperty("--filter-top", `${Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 300))}px`);
        panel.current?.style.setProperty("--filter-right", `${Math.max(8, window.innerWidth - rect.right)}px`);
      }}>
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      {active && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-1 ring-current" />}
    </button>
    <div id={id} ref={panel} popover="auto" aria-label={label}
      className="filter-popover fixed inset-auto m-0 w-80 max-w-[calc(100vw-1rem)] overflow-auto rounded-xl border border-border bg-card p-3 text-foreground shadow-xl">
      <div className="mb-2 flex items-center justify-between border-b border-border pb-1">
        <span className="text-sm font-semibold">{label}</span>
        <button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Close filters" title="Close filters" className="grid size-10 place-items-center rounded-lg hover:bg-secondary">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="grid min-w-0 gap-3 [&_input]:min-w-0 [&_select]:min-w-0 [&_select]:max-w-full">{children}</div>
    </div>
  </div>;
}
