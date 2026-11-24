import { useState, type FormEvent, type RefObject } from "react";
import { apiRequest } from "../services/api";
import { failureMessage, Field, field, PanelDialog, primary } from "./AdminWorkflowUI";

export default function AccountManagementDialog({ dialog, account, onSaved }: {
  dialog: RefObject<HTMLDialogElement | null>;
  account: { id: string; name: string } | null;
  onSaved: (message: string) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = Object.fromEntries(new FormData(event.currentTarget));
      await apiRequest(account ? `/api/admin/users/${account.id}` : "/api/admin/users", {
        method: account ? "PATCH" : "POST", body: JSON.stringify(form),
      });
      dialog.current?.close();
      onSaved(account ? "Account updated." : "Student account created. The student can set a password through Forgot password.");
    } catch (failure) { setError(failureMessage(failure)); }
    finally { setBusy(false); }
  }
  return <PanelDialog title={account ? "Edit user" : "Create student account"} dialog={dialog}>
    <form className="grid gap-4" onSubmit={submit}>
      <Field name="Full name"><input name="name" className={field} defaultValue={account?.name} required minLength={2} maxLength={180} /></Field>
      {!account && <><Field name="Email address"><input name="email" type="email" className={field} required maxLength={254} /></Field><p className="text-sm text-muted-foreground">Staff access is assigned through Staff & Access invitations.</p></>}
      {error && <p role="alert" className="text-sm">{error}</p>}
      <button className={primary} disabled={busy}>{account ? "Save changes" : "Create account"}</button>
    </form>
  </PanelDialog>;
}
