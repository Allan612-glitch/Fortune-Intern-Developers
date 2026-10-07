import { useEffect, useState } from "react";
import type { AppUser, AppPage } from "../App";
import HomePage from "./HomePage";
import DashboardPage from "./DashboardPage";
import ApplicationsPage from "./ApplicationsPage";
import AnnouncementsPage from "./AnnouncementsPage";
import ProgramsPage from "./ProgramsPage";
import ApplyPage from "./ApplyPage";
import ProfilePage from "./ProfilePage";
import AdminPage from "./AdminPage";
import LogoutConfirmationModal from "../components/LogoutConfirmationModal";
import TopBar from "../components/layout/TopBar";
import Sidebar from "../components/layout/Sidebar";
import BottomNav from "../components/layout/BottomNav";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../services/platform";

interface MainAppProps {
  user: AppUser;
  onLogout: () => void;
}

export default function MainApp({ user, onLogout }: MainAppProps) {
  const [page, setPage] = useState<AppPage>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listNotifications(), getUnreadNotificationCount()])
      .then(([items, unread]) => {
        if (!active) return;
        setNotifications(items);
        setNotifCount(unread.count);
      })
      .catch((error) => {
        if (active) setNotificationError(error instanceof Error ? error.message : "Unable to load notifications.");
      });
    return () => {
      active = false;
    };
  }, [user.email]);

  const openNotification = async (notification: NotificationItem) => {
    try {
      if (!notification.read) await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
      setNotifCount((count) => Math.max(0, count - (notification.read ? 0 : 1)));
      setNotificationsOpen(false);
      if (notification.target_type === "application") goTo("applications");
      else goTo("announcements");
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : "Unable to update notification.");
    }
  };

  const readAllNotifications = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setNotifCount(0);
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : "Unable to update notifications.");
    }
  };

  const goTo = (p: AppPage) => {
    setPage(p);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <TopBar
        user={user}
        notifCount={notifCount}
        notificationsOpen={notificationsOpen}
        notifications={notifications}
        notificationError={notificationError}
        onToggleSidebar={() => setSidebarOpen(true)}
        onGoHome={() => goTo("home")}
        onGoProfile={() => goTo("profile")}
        onToggleNotifications={() => setNotificationsOpen((o) => !o)}
        onOpenNotification={(n) => void openNotification(n)}
        onMarkAllRead={() => void readAllNotifications()}
        setNotifications={setNotifications}
        setNotifCount={setNotifCount}
        setNotificationError={setNotificationError}
      />

      <Sidebar
        user={user}
        page={page}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={goTo}
        onLogout={() => setShowLogout(true)}
      />

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
          {page === "programs" && <ProgramsPage setPage={goTo} user={user} />}
          {page === "apply" && <ApplyPage user={user} />}
          {page === "profile" && <ProfilePage user={user} />}
          {page === "admin" && user.isAdmin && <AdminPage />}
        </div>
      </main>

      <BottomNav page={page} onNavigate={goTo} />

      {showLogout && (
        <LogoutConfirmationModal
          onCancel={() => setShowLogout(false)}
          onConfirm={onLogout}
        />
      )}
    </div>
  );
}
