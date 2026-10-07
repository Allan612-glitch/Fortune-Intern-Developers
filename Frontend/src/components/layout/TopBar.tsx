import type { AppPage } from "../../App";
import type { NotificationItem } from "../../services/platform";
import logo from "../../assets/attach1.png";
import {
  getUnreadNotificationCount,
  listNotifications,
} from "../../services/platform";

interface TopBarProps {
  user: { avatar: string };
  notifCount: number;
  notificationsOpen: boolean;
  notifications: NotificationItem[];
  notificationError: string;
  onToggleSidebar: () => void;
  onGoHome: () => void;
  onGoProfile: () => void;
  onToggleNotifications: () => void;
  onOpenNotification: (n: NotificationItem) => void;
  onMarkAllRead: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  setNotifCount: React.Dispatch<React.SetStateAction<number>>;
  setNotificationError: React.Dispatch<React.SetStateAction<string>>;
}

export default function TopBar({
  user,
  notifCount,
  notificationsOpen,
  notifications,
  notificationError,
  onToggleSidebar,
  onGoHome,
  onGoProfile,
  onToggleNotifications,
  onOpenNotification,
  onMarkAllRead,
  setNotifications,
  setNotifCount,
  setNotificationError,
}: TopBarProps) {
  const handleToggleNotifications = () => {
    const shouldOpen = !notificationsOpen;
    onToggleNotifications();
    if (shouldOpen) {
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
        );
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-border flex items-center px-4 shadow-sm">
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
          <span className="font-bold text-sm leading-none" style={{ color: "#2D3561", fontFamily: "Inter, sans-serif" }}>
            FORTUNE
          </span>
          <div className="text-[10px] leading-none mt-0.5">
            <span style={{ color: "#F5B731" }}>INTERN</span>
            <span style={{ color: "#2D3561" }}> NETWORK</span>
          </div>
        </div>
      </button>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
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
                {notifications.length ? (
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

        {/* Avatar */}
        <button
          onClick={onGoProfile}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
          style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
        >
          {user.avatar}
        </button>
      </div>
    </header>
  );
}
