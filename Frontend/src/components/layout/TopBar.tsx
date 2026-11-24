import ThemeToggle from "../ThemeToggle";
import { ChevronDown, ChevronRight, LogOut, Settings } from "lucide-react";
import { useId, useRef, useState } from "react";
import ProfileAvatar from "./ProfileAvatar";
import type { NotificationItem } from "../../services/platform";
import logo from "../../assets/attach1.png";
import {
  getUnreadNotificationCount,
  listNotifications,
} from "../../services/platform";

interface TopBarProps {
  user: { name: string; avatar: string; profilePhotoUrl?: string | null; isAdmin: boolean };
  workspace: "student" | "admin";
  adminSectionLabel?: string;
  canUseAdmin?: boolean;
  onWorkspaceChange: (workspace: "student" | "admin") => void;
  notifCount: number;
  notificationsOpen: boolean;
  notifications: NotificationItem[];
  notificationError: string;
  onToggleSidebar: () => void;
  onGoHome: () => void;
  onGoAccount: () => void;
  onLogout: () => void;
  onToggleNotifications: () => void;
  onOpenNotification: (n: NotificationItem) => void;
  onMarkAllRead: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  setNotifCount: React.Dispatch<React.SetStateAction<number>>;
  setNotificationError: React.Dispatch<React.SetStateAction<string>>;
}

export default function TopBar({
  user,
  workspace,
  adminSectionLabel,
  canUseAdmin = user.isAdmin,
  onWorkspaceChange,
  notifCount,
  notificationsOpen,
  notifications,
  notificationError,
  onToggleSidebar,
  onGoHome,
  onGoAccount,
  onLogout,
  onToggleNotifications,
  onOpenNotification,
  onMarkAllRead,
  setNotifications,
  setNotifCount,
  setNotificationError,
}: TopBarProps) {
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const profileMenuId = useId();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const handleToggleNotifications = () => {
    const shouldOpen = !notificationsOpen;
    onToggleNotifications();
    if (shouldOpen) {
      setLoadingNotifications(true);
      Promise.all([listNotifications(), getUnreadNotificationCount()])
        .then(([items, unread]) => {
          setNotifications(items);
          setNotifCount(unread.count);
          setNotificationError("");
        })
        .catch((error) =>
          setNotificationError(
            error instanceof Error ? error.message : "Unable to load notifications."
          )
        )
        .finally(() => setLoadingNotifications(false));
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-border flex items-center px-4 shadow-sm ${workspace === "admin" ? "admin-topbar lg:px-6" : ""}`}>
      {/* Hamburger (mobile) */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors mr-2"
        aria-label="Open navigation"
      >
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo */}
      <button onClick={onGoHome} className="flex items-center gap-2">
        <img src={logo} alt="FIN" className="h-9 w-9 object-contain" />
        <div className="hidden sm:block">
          <span className="font-bold text-sm leading-none" style={{ color: "var(--brand-ink)", fontFamily: "Inter, sans-serif" }}>
            FORTUNE
          </span>
          <div className="text-[10px] leading-none mt-0.5">
            <span style={{ color: "#F5B731" }}>INTERN</span>
            <span style={{ color: "var(--brand-ink)" }}> NETWORK</span>
          </div>
        </div>
      </button>

      {adminSectionLabel && (
        <div className="ml-2 flex min-w-0 items-center gap-2 text-sm sm:ml-5 lg:ml-10">
          <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span className="hidden shrink-0 text-muted-foreground md:inline">Admin</span>
          <ChevronRight aria-hidden="true" className="hidden size-3.5 shrink-0 text-muted-foreground md:block" />
          <span className="truncate font-semibold text-foreground">{adminSectionLabel}</span>
        </div>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <ThemeToggle />
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={`Notifications${notifCount ? `, ${notifCount} unread` : ""}`}
            aria-expanded={notificationsOpen}
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notifCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: "#F5B731", color: "#1a1f3a" }}
              >
                {notifCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="fixed left-2 right-2 top-16 z-50 mx-auto max-w-md rounded-xl border border-border bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(22rem,calc(100vw-2rem))]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Notifications</h2>
                {notifCount > 0 && (
                  <button onClick={onMarkAllRead} className="text-xs font-semibold text-primary">
                    Mark all read
                  </button>
                )}
              </div>
              {notificationError && (
                <p className="px-4 py-2 text-xs text-red-600" role="alert">{notificationError}</p>
              )}
              <div className="max-h-80 overflow-y-auto">
                {loadingNotifications && notifications.length === 0 ? (
                  <div
                    className="flex items-center justify-center gap-3 px-4 py-6 text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                      aria-hidden="true"
                    />
                    Loading notifications...
                  </div>
                ) : notifications.length ? (
                  notifications.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onOpenNotification(n)}
                      className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 ${n.read ? "" : "bg-secondary/40"}`}
                    >
                      <p className="text-sm">{n.message}</p>
                      <time className="block mt-1 text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </time>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          popoverTarget={profileMenuId}
          aria-label="My profile"
          className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-1.5 hover:bg-muted"
        >
          <ProfileAvatar initials={user.avatar} photoUrl={user.profilePhotoUrl} className={`size-8 text-xs ${workspace === "admin" ? "bg-accent text-accent-foreground" : "bg-primary text-white"}`} />
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
        </button>
        <div
          id={profileMenuId}
          ref={profileMenuRef}
          popover="auto"
          aria-label="My profile"
          className="fixed inset-auto top-16 right-3 m-0 w-[min(22rem,calc(100%-1.5rem))] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-border bg-white text-foreground shadow-xl sm:right-4"
        >
          <div className="flex items-center gap-3 p-4">
            <ProfileAvatar initials={user.avatar} photoUrl={user.profilePhotoUrl} className="size-12 bg-primary text-base text-white" />
            <div className="min-w-0">
              <p className="break-words font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.isAdmin ? "Administrator" : canUseAdmin ? "Staff" : "Student"}</p>
            </div>
          </div>
          {canUseAdmin && (
            <div className="border-t border-border px-4 py-3">
              <label className="block text-sm font-medium">
                Workspace
                <select
                  value={workspace}
                  onChange={(event) => {
                    profileMenuRef.current?.hidePopover();
                    onWorkspaceChange(event.target.value === "admin" ? "admin" : "student");
                  }}
                  className="mt-1.5 block min-h-11 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-primary"
                >
                  <option value="student">Student Portal</option>
                  <option value="admin">Fortune Intern Admin</option>
                </select>
              </label>
            </div>
          )}
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                profileMenuRef.current?.hidePopover();
                onGoAccount();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-muted"
            >
              <Settings className="size-4" aria-hidden="true" />
              {workspace === "admin" ? "Staff account" : "Student profile"}
            </button>
            <button
              type="button"
              onClick={() => {
                profileMenuRef.current?.hidePopover();
                onLogout();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
