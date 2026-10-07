import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import type { AppUser, AppPage } from "../App"

import logo from "../assets/attach1.png"

import HomePage from "./HomePage"

import DashboardPage from "./DashboardPage"

import ApplicationsPage from "./ApplicationsPage"

import AnnouncementsPage from "./AnnouncementsPage"

import ProgramsPage from "./ProgramsPage"

import ApplyPage from "./ApplyPage"

import ProfilePage from "./ProfilePage"

import AdminPage from "./AdminPage"

import LogoutConfirmationModal from "../components/LogoutConfirmationModal"

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../services/platform"

interface MainAppProps {
  user: AppUser

  onLogout: () => void

  initialProgramId?: string | null

  onInitialProgramHandled?: () => void
}

const navItems = [
  {
    id: "home",

    label: "Home",

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },

  {
    id: "dashboard",

    label: "Dashboard",

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
  },
  {
    id: "announcements",

    label: "Announcements",

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 11v2a1 1 0 001 1h2l4 4V6l-4 4H4a1 1 0 00-1 1zm7-2 9-4v14l-9-4m3 2 1.5 4H18l-2-5"
      />
    ),
  },
  {
    id: "programs",

    label: "Programs",

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
  },

  {
    id: "apply",

    label: "Apply",

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },

  {
    id: "profile",

    label: "Profile",

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
  },
]

const appPages = new Set<AppPage>([
  "home",
  "dashboard",
  "applications",
  "announcements",
  "programs",
  "apply",
  "profile",
  "admin",
])

export default function MainApp({
  user,

  onLogout,

  initialProgramId = null,

  onInitialProgramHandled,
}: MainAppProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const pageSegment = location.pathname.replace(/^\/app\/?/, "").split("/")[0]
  const page = appPages.has(pageSegment as AppPage)
    ? pageSegment as AppPage
    : "home"

  const [programSelectionPending, setProgramSelectionPending] = useState(
    Boolean(initialProgramId),
  )

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [notifCount, setNotifCount] = useState(0)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const [notificationError, setNotificationError] = useState("")

  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    if (
      !appPages.has(pageSegment as AppPage) ||
      (page === "admin" && !user.isAdmin)
    ) {
      navigate("/app/home", { replace: true })
    }
  }, [navigate, page, pageSegment, user.isAdmin])

  useEffect(() => {
    let active = true

    Promise.all([listNotifications(), getUnreadNotificationCount()])

      .then(([items, unread]) => {
        if (!active) return

        setNotifications(items)

        setNotifCount(unread.count)
      })

      .catch((error) => {
        if (active)
          setNotificationError(
            error instanceof Error
              ? error.message
              : "Unable to load notifications.",
          )
      })

    return () => {
      active = false
    }
  }, [user.email])

  const openNotification = async (notification: NotificationItem) => {
    try {
      if (!notification.read) await markNotificationRead(notification.id)

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      )

      setNotifCount((count) => Math.max(0, count - (notification.read ? 0 : 1)))

      setNotificationsOpen(false)

      if (notification.target_type === "application") goTo("applications")
      else goTo("announcements")
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Unable to update notification.",
      )
    }
  }

  const readAllNotifications = async () => {
    try {
      await markAllNotificationsRead()

      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      )

      setNotifCount(0)
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Unable to update notifications.",
      )
    }
  }

  const goTo = (p: AppPage) => {
    navigate(`/app/${p}`)

    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-border flex items-center px-4 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors mr-2"
        >
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <button
          onClick={() => goTo("home")}
          className="flex items-center gap-2"
        >
          <img src={logo} alt="FIN" className="h-9 w-9 object-contain" />
          <div className="hidden sm:block">
            <span
              className="font-bold text-sm leading-none"
              style={{
                color: "#2D3561",

                fontFamily: "Inter, sans-serif",
              }}
            >
              FORTUNE
            </span>
            <div className="text-[10px] leading-none mt-0.5">
              <span style={{ color: "#F5B731" }}>INTERN</span>
              <span style={{ color: "#2D3561" }}> NETWORK</span>
            </div>
          </div>
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
          <button
            onClick={() => {
              const shouldOpen = !notificationsOpen;
              setNotificationsOpen(shouldOpen);
              if (shouldOpen) {
                Promise.all([listNotifications(), getUnreadNotificationCount()])
                  .then(([items, unread]) => {
                    setNotifications(items);
                    setNotifCount(unread.count);
                    setNotificationError("");
                  })
                  .catch((error) => setNotificationError(error instanceof Error ? error.message : "Unable to load notifications."));
              }
            }}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={`Notifications${notifCount ? `, ${notifCount} unread` : ""}`}
            aria-expanded={notificationsOpen}
          >
            <svg
              className="w-5 h-5 text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notifCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
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
                {notifCount > 0 && <button onClick={() => void readAllNotifications()} className="text-xs font-semibold text-primary">Mark all read</button>}
              </div>
              {notificationError && <p className="px-4 py-2 text-xs text-red-600" role="alert">{notificationError}</p>}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length ? notifications.slice(0, 8).map((notification) => (
                  <button key={notification.id} onClick={() => void openNotification(notification)} className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 ${notification.read ? "" : "bg-secondary/40"}`}>
                    <p className="text-sm">{notification.message}</p>
                    <time className="block mt-1 text-[11px] text-muted-foreground">{new Date(notification.created_at).toLocaleString()}</time>
                  </button>
                )) : <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>}
              </div>
            </div>
          )}
          </div>
          <button
            onClick={() => goTo("profile")}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
            style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
          >
            {user.avatar}
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-border flex-col z-30">
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = page === item.id

            return (
              <button
                key={item.id}
                onClick={() => goTo(item.id as AppPage)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "text-white shadow-sm"
                    : "text-foreground hover:bg-secondary"
                }`}
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                      }
                    : {}
                }
              >
                <svg
                  className="w-4.5 h-4.5 flex-shrink-0 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {item.icon}
                </svg>
                {item.label}
              </button>
            )
          })}
          {user.isAdmin && (
            <button
              onClick={() => goTo("admin")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                page === "admin"
                  ? "text-white shadow-sm"
                  : "text-red-600 hover:bg-red-50"
              }`}
              style={
                page === "admin"
                  ? { background: "linear-gradient(135deg, #dc2626, #b91c1c)" }
                  : {}
              }
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Admin Dashboard
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => setShowLogout(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col slide-in shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img
                  src={logo}
                  alt="FIN"
                  className="h-10 w-10 object-contain"
                />
                <div>
                  <div
                    className="font-bold text-sm"
                    style={{
                      color: "#2D3561",

                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    FORTUNE
                  </div>
                  <div className="text-[10px]">
                    <span style={{ color: "#F5B731" }}>INTERN</span>{" "}
                    <span style={{ color: "#2D3561" }}>NETWORK</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{
                    background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                  }}
                >
                  {user.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.school}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = page === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id as AppPage)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "text-white"
                        : "text-foreground hover:bg-secondary"
                    }`}
                    style={
                      active
                        ? {
                            background:
                              "linear-gradient(135deg, #2D3561, #3d4a8a)",
                          }
                        : {}
                    }
                  >
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {item.icon}
                    </svg>
                    {item.label}
                  </button>
                )
              })}
              {user.isAdmin && (
                <button
                  onClick={() => goTo("admin")}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    page === "admin"
                      ? "text-white"
                      : "text-red-600 hover:bg-red-50"
                  }`}
                  style={
                    page === "admin"
                      ? {
                          background:
                            "linear-gradient(135deg, #dc2626, #b91c1c)",
                        }
                      : {}
                  }
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Admin Dashboard
                </button>
              )}
            </nav>

            <div className="p-3 border-t border-border">
              <button
                onClick={() => setShowLogout(true)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Log Out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 pt-14 lg:pl-56 pb-safe">
        <div className="min-h-[calc(100vh-3.5rem)]">
          {page === "home" && <HomePage user={user} setPage={goTo} />}
          {page === "dashboard" && (
            <DashboardPage
              email={user.email}
              onApplications={() => goTo("applications")}
            />
          )}
          {page === "applications" && <ApplicationsPage email={user.email} />}
          {page === "announcements" && <AnnouncementsPage user={user} />}
          {page === "programs" && (
            <ProgramsPage
              user={user}
              initialSelectedProgramId={
                programSelectionPending ? initialProgramId : null
              }
              onInitialSelectionHandled={() => {
                setProgramSelectionPending(false)

                onInitialProgramHandled?.()
              }}
            />
          )}
          {page === "apply" && <ApplyPage user={user} />}
          {page === "profile" && <ProfilePage user={user} />}
          {page === "admin" && user.isAdmin && <AdminPage />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex w-full items-center">
          {navItems.filter((item) => item.id !== "announcements").map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.id as AppPage)}
                className="relative flex flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors"
                style={{ color: active ? "#2D3561" : "#9ca3af" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {item.icon}
                </svg>
                <span
                  className="nav-label w-full break-words text-center leading-tight"
                  style={{ color: active ? "#F5B731" : "#9ca3af" }}
                >
                  {item.label}
                </span>
                {active && (
                  <div
                    className="absolute bottom-0 w-6 h-0.5 rounded-full"
                    style={{ background: "#F5B731" }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
      {showLogout && (
        <LogoutConfirmationModal
          onCancel={() => setShowLogout(false)}
          onConfirm={onLogout}
        />
      )}
    </div>
  )
}
