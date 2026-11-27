import { Children, Fragment, cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactNode, type ReactElement } from "react";
import { ChevronDown } from "lucide-react";
import "./AdminTable.css";

const mobileSummary: Record<string, [heading: string, meta?: string]> = {
  Users: ["User", "Status"],
  Applications: ["Applicant", "Status"],
  "Work and study registrations": ["Applicant", "Role"],
  Programs: ["Program", "Status"],
  "Published announcements": ["Announcement", "Category"],
  "Staff accounts": ["Name", "Status"],
  "Staff invitations": ["Email", "Status"],
  "Staff roles": ["Role", "Status"],
  "Support tickets": ["Ticket", "Status"],
  "Audit events": ["Action", "Outcome"],
  "Payments & receipts": ["Recipient", "Amount"],
  "Expenses & vouchers": ["Recipient", "Amount"],
  Invoices: ["Recipient", "Amount"],
  "Internal income": ["Recipient", "Amount"],
  "Finance category breakdown": ["Category", "Amount"],
  "Six-month finance comparison": ["Month", "Net cash flow"],
  Placements: ["Student", "Status"],
  Employers: ["Employer"],
  Openings: ["Opening", "Status"],
  "Invoice matches": ["Invoice", "Status"],
  "Unmatched payments": ["Payer", "Amount"],
  "Processed refunds": ["Reference", "Amount"],
  "Settlement results": ["Reference", "Status"],
};

type CellProps = { children?: ReactNode; className?: string; id?: string; "data-label"?: string; "data-compact-cell"?: string };
type RowProps = { children?: ReactNode; "data-compact-open"?: string };

function cellKind(cell: ReactElement<CellProps>, [heading, meta]: [string, string?]) {
  const label = cell.props["data-label"];
  const classNames = cell.props.className?.split(/\s+/) ?? [];
  if (label === "Select" || classNames.includes("admin-table-check")) return "select";
  if (label === "Actions" || label === "Details" || classNames.includes("admin-table-actions")) return "actions";
  if (label === heading) return "heading";
  if (label && label === meta) return "meta";
  return "detail";
}

function CompactRow({ row, summary, expanded, toggle, titleToggles }: {
  row: ReactElement<RowProps>;
  summary: [string, string?];
  expanded: boolean;
  toggle: () => void;
  titleToggles?: boolean;
}) {
  const rowId = useId();
  const cells = Children.toArray(row.props.children);
  const fields = cells.map(cell => isValidElement<CellProps>(cell) && cell.type === "td" ? cellKind(cell, summary) : null);
  if (!fields.includes("heading")) return row;
  const details = fields.map((kind, index) => kind === "detail" ? `${rowId}-${index}` : null).filter(Boolean);
  const disclosure = { "aria-expanded": expanded, "aria-controls": details.join(" ") || undefined, onClick: toggle };
  const hasDetails = details.length > 0;
  return cloneElement(row, { "data-compact-open": String(expanded) }, cells.map((cell, index) => {
    const kind = fields[index];
    if (!isValidElement<CellProps>(cell) || !kind) return cell;
    if (kind !== "heading") return cloneElement(cell, {
      "data-compact-cell": kind,
      ...(kind === "detail" && { id: `${rowId}-${index}`, children: <div className="compact-detail-value">{cell.props.children}</div> }),
    });
    return cloneElement(cell, { "data-compact-cell": kind }, <>
      {titleToggles && hasDetails ? <>
        <span className="compact-desktop-title">{cell.props.children}</span>
        <button type="button" className="compact-title-toggle" {...disclosure}>{cell.props.children}</button>
      </> : cell.props.children}
      {hasDetails && <button className="compact-row-toggle" type="button" {...disclosure}
        aria-label={expanded ? "Hide row details" : "Show row details"} title={expanded ? "Hide details" : "Show details"}>
        <ChevronDown className={`size-4 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>}
    </>);
  }));
}

export function AdminTable({ name, columns, children, titleToggles }: {
  name: string;
  columns: ReactNode[];
  children: ReactNode;
  titleToggles?: boolean;
}) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const summary = mobileSummary[name];
  function renderRows(nodes: ReactNode, path = name): ReactNode {
    return Children.toArray(nodes).map((child, index) => {
      if (!isValidElement<RowProps>(child)) return child;
      const key = `${path}/${child.key ?? index}`;
      if (child.type === Fragment) return cloneElement(child, {}, renderRows(child.props.children, key));
      if (child.type !== "tr" || !summary) return child;
      return <CompactRow key={key} row={child} summary={summary} expanded={openRow === key}
        toggle={() => setOpenRow(current => current === key ? null : key)} titleToggles={titleToggles} />;
    });
  }

  return (
    <table className="admin-table" role="table" aria-label={name}>
      <thead role="rowgroup">
        <tr role="row">
          {columns.map((column, index) => (
            <th key={index} role="columnheader" scope="col">{column}</th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">{summary ? renderRows(children) : children}</tbody>
    </table>
  );
}

export function TableSelection({ label, checked, mixed = false, disabled, onChange }: {
  label: string;
  checked: boolean;
  mixed?: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <label className="inline-flex size-10 shrink-0 items-center justify-center">
      <input ref={input} type="checkbox" aria-label={label} checked={checked}
        disabled={disabled} onChange={onChange}
        className="size-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40" />
    </label>
  );
}
