import { useId } from "react";
import { ChevronsUpDown } from "lucide-react";

export default function SearchableField({ label, value, choices, onChange, required }: {
  label: string;
  value: string;
  choices: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = useId();
  return (
    <label className="block min-w-0 text-xs font-semibold text-muted-foreground">
      {label}
      <span className="relative mt-1.5 block">
        <input type="text" required={required} list={id} value={value} onChange={e => onChange(e.target.value)}
          autoComplete="off" className="min-h-11 w-full rounded-lg border border-border bg-white px-3 pr-8 text-sm text-foreground [&::-webkit-calendar-picker-indicator]:opacity-100" />
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden="true" />
      </span>
      <datalist id={id}>
        {[...new Set(choices.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(choice => <option key={choice} value={choice} />)}
      </datalist>
    </label>
  );
}
