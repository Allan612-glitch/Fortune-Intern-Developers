import { ArrowUpRight, GraduationCap, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppUser } from "../App";
import AccountDeletionSection from "../components/AccountDeletionSection";
import ProfileAvatar from "../components/layout/ProfileAvatar";

export default function AdminAccountPage({ user, onSignOut, onAccountDeleted }: {
  user: AppUser;
  onSignOut: () => void;
  onAccountDeleted: () => void;
}) {
  return (
    <div className="admin-page mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
      <header className="admin-section-header p-4 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight">Staff account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your sign-in details and workspace access.</p>
      </header>

      <section aria-label="Sign-in details" className="admin-panel p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <ProfileAvatar initials={user.avatar} photoUrl={user.profilePhotoUrl} className="size-12 bg-accent text-accent-foreground" />
          <div className="min-w-0">
            <h2 className="break-words font-semibold">{user.name}</h2>
            <p className="break-all text-sm text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
              {user.isAdmin ? "Administrator" : "Staff"}
            </span>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <button type="button" onClick={onSignOut} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-secondary">
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </section>

      <section className="admin-panel flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Student Portal</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Use the same sign-in to set up your student profile whenever you need it.</p>
          </div>
        </div>
        <Link to="/app/account" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white">
          Open student profile <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </section>

      <AccountDeletionSection onAccountDeleted={onAccountDeleted} />
    </div>
  );
}
