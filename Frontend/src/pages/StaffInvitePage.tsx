import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { acceptStaffInvite } from "../services/platform";

import { staffInviteStorageKey } from "../services/auth";

export default function StaffInvitePage({ email, onLogout }: { email?: string; onLogout: () => void }) {
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || sessionStorage.getItem(staffInviteStorageKey));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accept = async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      await acceptStaffInvite(token);
      sessionStorage.removeItem(staffInviteStorageKey);
      window.location.replace("/app/admin");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The invitation could not be accepted.");
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-cream p-4">
      <section className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-primary">Fortune Intern staff invitation</h1>
        {!token ? <p className="mt-3 text-sm text-muted-foreground">Open the invitation link sent to you.</p>
          : email ? (
            <>
              <p className="mt-3 break-words text-sm text-muted-foreground">Accept using the invited address. You’re signed in as {email}.</p>
              <button type="button" onClick={() => void accept()} disabled={busy} className="mt-5 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? "Accepting…" : "Accept invitation"}
              </button>
              <button type="button" disabled={busy} className="ml-3 text-sm font-semibold text-primary underline"
                onClick={() => { sessionStorage.setItem(staffInviteStorageKey, token); onLogout(); }}>Use another account</button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">Sign in or create an account with the invited email address to accept.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {["login", "register"].map((mode) => (
                  <button type="button" key={mode} onClick={() => { sessionStorage.setItem(staffInviteStorageKey, token); navigate(`/${mode}`); }}
                    className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-primary">
                    {mode === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
            </>
          )}
        {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
        <Link to={email ? "/app/dashboard" : "/"} onClick={() => sessionStorage.removeItem(staffInviteStorageKey)}
          className="mt-5 inline-block text-sm font-semibold text-primary underline">Leave invitation</Link>
      </section>
    </main>
  );
}
