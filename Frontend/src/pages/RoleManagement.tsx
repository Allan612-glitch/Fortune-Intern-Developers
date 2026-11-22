import { useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { AdminTable } from "../components/AdminTable";
import AdminReportActions from "../components/AdminReportActions";
import RowActions from "../components/RowActions";
import { apiRequest } from "../services/api";
import type { StaffDirectory } from "../services/platform";
import { failureMessage, Field, field, label, PanelDialog, primary } from "./AdminWorkflowUI";

type Role = StaffDirectory["roles"][number];
const permissions = ["applications", "programs", "announcements", "users", "placements", "finance", "support", "operations"];

export type RoleManagementControls = { openNew: () => void };

export default function RoleManagement({ ref, roles, reload, onError }: {
  ref?: Ref<RoleManagementControls>;
  roles: Role[];
  reload: () => Promise<void>;
  onError: (error: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  function open(role: Role | null) {
    setEditing(role); setError(""); setRevision(value => value + 1); dialog.current?.showModal();
  }

  useImperativeHandle(ref, () => ({ openNew: () => open(null) }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const selected = form.getAll("permission");
    if (!selected.length) { setError("Select at least one permission."); return; }
    setBusy(true);
    try {
      await apiRequest(editing ? `/api/admin/workspace-roles/${editing.id}` : "/api/admin/workspace-roles", {
        method: editing ? "PUT" : "POST", body: JSON.stringify({ name: form.get("name"), permissions: selected }),
      });
      dialog.current?.close();
      await reload();
    } catch (failure) { setError(failureMessage(failure)); }
    finally { setBusy(false); }
  }

  return <>
    <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
      <AdminReportActions table="roles" ids={[]} label="roles" onError={onError} />
    </div>
    <AdminTable name="Staff roles" columns={["Role", "Workspace permissions", "Status", "Actions"]} titleToggles>
      <tr role="row"><td role="cell" data-label="Role">Administrator</td><td role="cell" data-label="Permissions">All sections and staff access</td><td role="cell" data-label="Status"><span className="rounded bg-secondary px-2 py-1 text-xs">Protected</span></td><td role="cell" data-label="Actions"></td></tr>
      {roles.map(role => <tr role="row" key={role.id}>
        <td role="cell" data-label="Role" className="font-semibold">{role.name}</td>
        <td role="cell" data-label="Permissions">{role.permissions.map(label).join(", ")}</td><td role="cell" data-label="Status"></td>
        <td role="cell" data-label="Actions"><RowActions label={`Actions for ${role.name}`} actions={[{ label: "Edit role", run: () => open(role) }]} /></td>
      </tr>)}
    </AdminTable>
    <PanelDialog title={editing ? "Edit role" : "Create role"} dialog={dialog}>
      <form key={revision} className="grid gap-4" onSubmit={save}>
        <Field name="Role name"><input name="name" defaultValue={editing?.name} className={field} minLength={2} maxLength={80} required /></Field>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold">Workspace permissions</legend>
          {permissions.map(value => <label key={value} className="flex min-h-10 items-center gap-3 rounded-lg border border-border px-3 text-sm">
            <input name="permission" type="checkbox" value={value} defaultChecked={editing?.permissions.includes(value)} />{label(value)}
          </label>)}
        </fieldset>
        {editing && <p className="text-sm text-muted-foreground">Saving applies these permissions to everyone assigned to this role.</p>}
        {error && <p role="alert" className="text-sm">{error}</p>}
        <button className={primary} disabled={busy}>Save role</button>
      </form>
    </PanelDialog>
  </>;
}
