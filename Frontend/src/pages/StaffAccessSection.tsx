import FilterMenu from "../components/FilterMenu";
import { useLocation } from "react-router-dom";
import AccountManagementDialog from "./AccountManagementDialog";
import RoleManagement, { type RoleManagementControls } from "./RoleManagement";
import RowActions from "../components/RowActions";
import { useEffect, useRef, useState } from "react";
import { Plus, UserPlus, X } from "lucide-react";
import { AdminTable, TableSelection } from "../components/AdminTable";
import AdminReportActions from "../components/AdminReportActions";
import AsyncState from "../components/AsyncState";
import ProfileAvatar from "../components/layout/ProfileAvatar";
import { changeStaffAccess, getAdminPhoto, getStaffDirectory, inviteStaff, updateStaffRole, type StaffAccount, type StaffDirectory } from "../services/platform";

const button = "max-w-full min-h-10 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary disabled:opacity-50";
const input = "min-h-11 rounded-lg border border-border bg-white px-3 text-sm";
const cap = 50;

export default function StaffAccessSection() {
  const location = useLocation();
  const inviteEmail = (location.state as { inviteEmail?: string } | null)?.inviteEmail;
  const roleControls = useRef<RoleManagementControls>(null);
  const accountEditDialog = useRef<HTMLDialogElement>(null);
  const [editingAccount, setEditingAccount] = useState<StaffAccount | null>(null);
  useEffect(() => { if (editingAccount) accountEditDialog.current?.showModal(); }, [editingAccount]);
  const [tab, setTab] = useState<"accounts" | "invitations" | "roles">("accounts");
  const [directory, setDirectory] = useState<StaffDirectory | null>(null);
  const [query, setQuery] = useState("");
  const [showRevoked, setShowRevoked] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [link, setLink] = useState("");
  const [preview, setPreview] = useState<StaffAccount | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [revealedPhoto, setRevealedPhoto] = useState(false);
  const inviteDialog = useRef<HTMLDialogElement>(null);
  const profileDialog = useRef<HTMLDialogElement>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    getStaffDirectory().then(value => { if (active) setDirectory(value); }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : "Unable to load staff.");
    });
    return () => { active = false; };
  }, [retry]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try { await work(); } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to update staff access.");
    } finally { setBusy(false); }
  };

  const title = (id: string) => id === "owner" ? "Administrator" : directory?.roles.find(item => item.id === id)?.name || id;
  const accounts = (directory?.accounts || []).filter(item => showRevoked || item.status !== "revoked");
  const records = (tab === "invitations" ? directory?.invitations || [] : accounts)
    .filter(row => [row.email, title(row.role), "name" in row ? row.name : ""].some(value => String(value).toLowerCase().includes(query.trim().toLowerCase())));
  const pageNumber = Math.min(page, Math.max(1, Math.ceil(records.length / 25)));
  const visible = records.slice((pageNumber - 1) * 25, pageNumber * 25);
  const rowIds = visible.filter(row => !("protected" in row) || (!row.protected && row.status !== "revoked")).map(row => row.id);
  const selectCount = rowIds.filter(id => selected.includes(id)).length;
  const all = rowIds.length > 0 && selectCount === rowIds.length;
  const selectPage = () => setSelected(ids => all || ids.length === cap
    ? ids.filter(id => !rowIds.includes(id)) : [...new Set([...ids, ...rowIds])].slice(0, cap));

  const showInvite = (address = "", roleId = "") => {
    setEmail(address);
    setRole(roleId);
    setLink("");
    setError("");
    inviteDialog.current?.showModal();
  };

  const change = (action: "suspend" | "restore" | "revoke") => {
    if (!window.confirm(`${action === "revoke" ? "Remove access for" : action === "restore" ? "Restore access for" : "Suspend access for"} ${selected.length} selected record(s)?`)) return;
    void run(async () => {
      const result = await changeStaffAccess(selected, action, tab === "invitations" ? "invitations" : "accounts");
      setSelected([]);
      setDirectory(await getStaffDirectory());
      setNotice(`Updated ${result.updated} staff record(s).`);
    });
  };

  const showProfile = (account: StaffAccount) => {
    setPreview(account);
    setPhoto(null);
    setRevealedPhoto(false);
    profileDialog.current?.showModal();
    void getAdminPhoto("users", account.id).then(result => setPhoto(result.photo)).catch(() => {});
  };

  return (
    <section className="admin-panel overflow-hidden" aria-label="Staff management">
      <header className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-5">
        <div className="flex flex-wrap gap-1" aria-label="Staff views">
          {(["accounts", "invitations", "roles"] as const).map(view => (
            <button key={view} type="button" aria-pressed={tab === view}
              className={`min-h-10 rounded-lg px-2 text-xs font-semibold sm:px-3 sm:text-sm ${tab === view ? "bg-primary text-white" : "text-primary hover:bg-secondary"}`}
              onClick={() => { setTab(view); setSelected([]); setPage(1); setQuery(""); setError(""); }}>
              {view === "accounts" ? "Staff" : view === "invitations" ? "Invitations" : "Roles"}
            </button>
          ))}
        </div>
        <button type="button" disabled={!directory} onClick={() => tab === "roles" ? roleControls.current?.openNew() : showInvite(inviteEmail)}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 sm:px-4 sm:text-sm">
          {tab === "roles" ? <Plus aria-hidden="true" className="size-4" /> : <UserPlus aria-hidden="true" className="size-4" />}
          {tab === "roles" ? "New role" : "Invite staff"}
        </button>
      </header>
      {error && <p role="alert" className="mx-4 mb-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mx-4 mb-3 text-sm text-emerald-800">{notice}</p>}
      {!directory ? (
        <AsyncState kind={error ? "error" : "loading"} message={error || "Loading staff…"} onRetry={() => { setError(""); setRetry(count => count + 1); }} />
      ) : tab === "roles" ? (
        <RoleManagement ref={roleControls} roles={directory.roles} reload={async () => setDirectory(await getStaffDirectory())} onError={setError} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 border-t border-border p-4">
            <input className={`${input} min-w-0 flex-1`} type="search" aria-label="Search staff" placeholder="Search name, email or role" value={query} onChange={e => { setQuery(e.target.value); setSelected([]); setPage(1); }} />
            {tab === "accounts" && <FilterMenu label="Staff filters" active={showRevoked}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showRevoked} onChange={e => { setShowRevoked(e.target.checked); setPage(1); setSelected([]); }} /> Show removed access</label></FilterMenu>}
            <AdminReportActions table={tab === "accounts" ? "staff" : "invitations"} ids={selected.length ? selected : visible.map(row => row.id)}
              label={tab === "accounts" ? "staff" : "invitations"} onError={setError} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary px-4 py-2">
            <div className="flex items-center lg:hidden">
              <TableSelection label="Select staff on this page" checked={all} mixed={selectCount > 0 && !all} disabled={!rowIds.length} onChange={selectPage} />
              <span className="text-xs">This page</span>
            </div>
            <span className="text-xs font-semibold" aria-live="polite">{selected.length} selected</span>
            {selected.length > 0 && (
              <>
                <select aria-label="Bulk staff actions" className={button} value="" disabled={busy} onChange={e => {
                  const value = e.target.value;
                  if (value === "suspend" || value === "restore" || value === "revoke") change(value);
                }}>
                  <option value="">Bulk actions…</option>
                  {tab === "accounts" && <><option value="suspend">Suspend access</option><option value="restore">Restore access</option></>}
                  <option value="revoke">{tab === "invitations" ? "Revoke invitations" : "Remove access"}</option>
                </select>
                <button type="button" className={button} onClick={() => setSelected([])}>Clear selection</button>
              </>
            )}
          </div>
          {visible.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No records match these filters.</p> : (
            <AdminTable name={tab === "accounts" ? "Staff accounts" : "Staff invitations"} columns={[
              <TableSelection key="selection" label="Select staff on this page" checked={all} mixed={selectCount > 0 && !all} disabled={!rowIds.length} onChange={selectPage} />,
              "Person", "Role", "Status", "Actions",
            ]}>
              {visible.map(row => {
                const account = "protected" in row ? row as StaffAccount : null;
                const checked = selected.includes(row.id);
                return (
                  <tr role="row" key={row.id} data-selected={checked}>
                    <td role="cell" className="admin-table-check"><TableSelection label={`Select ${row.email}`} checked={checked}
                      disabled={!rowIds.includes(row.id) || (!checked && selected.length >= cap)}
                      onChange={() => setSelected(current => checked ? current.filter(id => id !== row.id) : [...current, row.id])} /></td>
                    <td role="cell" data-label={account ? "Name" : "Email"}>
                      {account ? <button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => showProfile(account)}>{account.name}</button> :
                        <button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => showInvite(row.email, row.role)}>{row.email}</button>}
                      {account && <p className="compact-secondary text-xs text-muted-foreground">{row.email}</p>}
                    </td>
                    <td role="cell" data-label="Role" className="admin-table-wide">
                      {account && !account.protected && row.status !== "revoked" ? (
                        <select aria-label={`Role for ${row.email}`} disabled={busy} className={button} value={row.role} onChange={e => {
                          const next = e.target.value;
                          if (!window.confirm(`Change ${row.email} to ${title(next)}?`)) return;
                          void run(async () => {
                            await updateStaffRole(row.id, next);
                            setDirectory(await getStaffDirectory());
                          });
                        }}>
                          {directory.roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      ) : title(row.role)}
                    </td>
                    <td role="cell" data-label="Status"><span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold capitalize text-primary">{row.status}</span></td>
                    <td role="cell" className="admin-table-actions">
                      <RowActions label={`Actions for ${row.email}`} actions={account
                        ? [{ label: "View staff profile", run: () => showProfile(account) }]
                        : [{ label: "New invite link", run: () => showInvite(row.email, row.role) }]} />
                    </td>
                  </tr>
                );
              })}
            </AdminTable>
          )}
          {records.length > 25 && <nav aria-label="Staff pages" className="flex items-center justify-end gap-3 border-t border-border p-3 text-sm">
            <button type="button" className={button} disabled={pageNumber === 1} onClick={() => setPage(pageNumber - 1)}>Previous</button>
            Page {pageNumber}
            <button type="button" className={button} disabled={pageNumber * 25 >= records.length} onClick={() => setPage(pageNumber + 1)}>Next</button>
          </nav>}
        </>
      )}
      <dialog ref={inviteDialog} aria-label="Invite staff" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-5 shadow-xl backdrop:bg-black/45">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Invite staff</h2><button type="button" aria-label="Close invitation" onClick={() => inviteDialog.current?.close()}><X className="size-5" /></button></div>
        {link ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Send this single-use link to the invited address. It expires in seven days.</p>
            <input className={`${input} w-full`} aria-label="Invitation link" value={link} readOnly onFocus={e => e.currentTarget.select()} />
            <a className={`${button} inline-flex items-center`} href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Fortune Intern staff invitation")}&body=${encodeURIComponent("Accept your Fortune Intern Network staff invitation:\n\n" + link)}`}>Open email draft</a>
            <button type="button" className={`${button} ml-2`} onClick={() => void navigator.clipboard.writeText(link).then(() => setNotice("Invitation link copied.")).catch(() => setError("Select and copy the invitation link manually."))}>Copy invitation link</button>
          </div>
        ) : (
          <form className="mt-4 grid gap-3" onSubmit={e => {
            e.preventDefault();
            void run(async () => {
              const result = await inviteStaff(email.trim(), role);
              setLink(`${window.location.origin}/staff-invite#token=${encodeURIComponent(result.token)}`);
              setDirectory(await getStaffDirectory());
              setTab("invitations");
              setQuery("");
              setSelected([]);
              setPage(1);
            });
          }}>
            <label className="grid gap-1 text-sm">Email<input className={input} type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Role<select className={input} required value={role} onChange={e => setRole(e.target.value)}>
              <option value="">Choose a role</option>{directory?.roles.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select></label>
            <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy}>{busy ? "Creating…" : "Create invitation link"}</button>
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}
      </dialog>
      <AccountManagementDialog key={editingAccount?.id || "staff-edit"} dialog={accountEditDialog} account={editingAccount} onSaved={message => {
        setNotice(message); setRetry(value => value + 1);
      }} />
      <dialog ref={profileDialog} aria-label="Staff profile" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-5 shadow-xl backdrop:bg-black/45">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Staff profile</h2><button type="button" aria-label="Close staff profile" onClick={() => profileDialog.current?.close()}><X className="size-5" /></button></div>
        {preview && <div className="mt-4 grid justify-items-start gap-2">
          <button type="button" disabled={!photo} aria-label="View staff profile photo" onClick={() => setRevealedPhoto(value => !value)}>
            <ProfileAvatar photoUrl={photo} initials={preview.name.slice(0, 2).toUpperCase()} className="size-14 bg-accent text-accent-foreground" />
          </button>
          {revealedPhoto && photo && <img src={photo} alt="Staff profile photo" className="max-h-52 rounded-xl object-contain" />}
          <p className="font-semibold">{preview.name}</p><p className="break-all text-sm text-muted-foreground">{preview.email}</p>
          <p className="text-sm">{title(preview.role)} · {preview.status}</p>
          {!preview.protected && <button type="button" className={button} onClick={() => { profileDialog.current?.close(); setEditingAccount({ ...preview }); }}>Edit user</button>}
        </div>}
      </dialog>
    </section>
  );
}
