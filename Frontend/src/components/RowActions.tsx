import { useId, useRef } from "react";
import { Ellipsis } from "lucide-react";

export type RowAction = { label: string; run: () => void; disabled?: boolean; danger?: boolean };

export default function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  return (
    <>
      <button type="button" popoverTarget={id} aria-label={label} title={label}
        className="inline-grid text-current size-10 shrink-0 place-items-center rounded-lg hover:bg-current/10 focus-visible:outline-2"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const element = menu.current;
          if (!element) return;
          element.style.left = `${Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216))}px`;
          const height = actions.length * 40 + 12;
          element.style.top = `${rect.bottom + height <= window.innerHeight ? rect.bottom : Math.max(8, rect.top - height)}px`;
        }}>
        <Ellipsis aria-hidden="true" className="size-5" />
      </button>
      <div ref={menu} id={id} popover="auto" aria-label={label}
        className="fixed inset-auto m-0 max-h-[calc(100dvh-1rem)] w-52 overflow-y-auto rounded-xl border border-border bg-white p-1 text-foreground shadow-lg">
        {actions.map(({ label, run, disabled, danger }) => (
          <button key={label} type="button" disabled={disabled} onClick={() => {
            menu.current?.hidePopover();
            run();
          }} className={`block min-h-10 w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-secondary disabled:opacity-50 ${danger ? "text-red-800" : "text-primary"}`}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
