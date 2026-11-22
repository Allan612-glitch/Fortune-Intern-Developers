import StudentPlacementsPage from "./StudentPlacementsPage";
import { StudentPage } from "../components/StudentPortalUI";
import PlacementsPage from "./PlacementsPage";
import StudentDocumentsPage from "./StudentDocumentsPage";
import FinancePage from "./FinancePage";
import SupportPage from "./SupportPage";
import AuditTrailPage from "./AuditTrailPage";
import OperationsPage from "./OperationsPage";
import { Activity, History, Wallet, LifeBuoy, ClipboardList, FolderOpen, LayoutDashboard, Megaphone, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AppUser, AppPage } from "../App";
import DashboardPage from "./DashboardPage";
import ApplicationsPage from "./ApplicationsPage";
import AnnouncementsPage from "./AnnouncementsPage";
import ProgramsPage from "./ProgramsPage";
import ProfilePage from "./ProfilePage";
import AdminAccountPage from "./AdminAccountPage";
import AdminPage, { type AdminSection } from "./AdminPage";
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
  initialProgramId?: string | null;
  onInitialProgramHandled?: () => void;
}

const appPages = new Set<AppPage>([
  "dashboard",
  "applications",
  "announcements",
  "programs",
  "more",
  "support",
  "documents",
  "placements",
  "account",
  "admin",
]);

const adminNavigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "applications", label: "Applications", icon: ClipboardList },
  { id: "programs", label: "Programs", icon: FolderOpen },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "users", label: "Users", icon: Users },
  { id: "staff", label: "Staff & Access", icon: ShieldCheck },
  { id: "placements", label: "Placements", icon: FolderOpen },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "support", label: "Support & incidents", icon: LifeBuoy },
  { id: "operations", label: "Operations", icon: Activity },
  { id: "audit", label: "Audit trail", icon: History },
] as const;

export default function MainApp({
  user,
  onLogout,
  initialProgramId = null,
  onInitialProgramHandled,
}: MainAppProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pageSegment, adminSegment, resourceSegment] = location.pathname.replace(/^\/app\/?/, "").split("/");
  const page = appPages.has(pageSegment as AppPage)
    ? pageSegment as AppPage
    : "dashboard";
  const staffSections = adminNavigation.filter(item => item.id !== "overview" && user.staffPermissions?.includes(item.id));
  const allowedAdminNavigation = user.isAdmin ? adminNavigation : staffSections.length ? [adminNavigation[0], ...staffSections] : [];
  const canFinance = user.isAdmin || Boolean(user.staffPermissions?.includes("finance"));
  const firstAdminSection = allowedAdminNavigation[0]?.id;
  const isAdminWorkspace = page === "admin" && Boolean(firstAdminSection);
  const isAdminAccount = isAdminWorkspace && adminSegment === "account";
  const programDetailId = isAdminWorkspace && adminSegment === "programs" &&
    (user.isAdmin || user.staffPermissions?.some(permission => permission === "programs" || permission === "applications"))
    ? resourceSegment : undefined;
  const activeAdminSection = allowedAdminNavigation.find((item) => item.id === adminSegment) ?? allowedAdminNavigation[0];
  const adminSection = activeAdminSection?.id ?? "overview";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    if (pageSegment === "profile") {
      navigate("/app/account", { replace: true });
      return;
    }
    if (pageSegment === "apply") {
      const query = new URLSearchParams(location.search);
      const id = adminSegment || query.get("program");
      navigate(id && /^[\w-]+$/.test(id) ? `/app/programs/${id}?apply=1` : "/app/programs", { replace: true });
      return;
    }
    if (pageSegment !== "admin" && adminSegment &&
        (pageSegment !== "programs" || resourceSegment || !/^[\w-]+$/.test(adminSegment))) {
      navigate(`/app/${page}`, { replace: true });
      return;
    }
    if (
      !appPages.has(pageSegment as AppPage) ||
      (page === "admin" && !firstAdminSection)
    ) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate, page, pageSegment, firstAdminSection, adminSegment, resourceSegment, location.search]);

  useEffect(() => {
    if (isAdminWorkspace && !isAdminAccount && !programDetailId && !user.isAdmin && adminSegment !== adminSection) {
      navigate(`/app/admin/${adminSection}`, { replace: true });
    }
  }, [adminSection, adminSegment, isAdminAccount, isAdminWorkspace, navigate, programDetailId, user.isAdmin]);

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
      const target = notification.target_id;
      const destination = notification.target_type === "application" ? ["applications", "ref"] :
        notification.target_type === "support" ? ["support", "ticket"] : ["announcements", "notice"];
      const search = target ? new URLSearchParams({ [destination[1]]: target }).toString() : "";
      navigate({ pathname: `/app/${destination[0]}`, search });
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
    navigate(`/app/${p}`);
    setSidebarOpen(false);
  };

  const goToAdmin = (section: (typeof adminNavigation)[number]["id"], search = "") => {
    navigate({ pathname: section === "overview" ? "/app/admin" : `/app/admin/${section}`, search });
    setSidebarOpen(false);
  };

  const isAudit = adminSection === "audit";
  const isOperations = adminSection === "operations";
  const canInvestigate = user.isAdmin;
  const portalLabel = ({ account: "Student profile", applications: "My applications", documents: "Finance documents", placements: "My placements", support: "Support tickets" } as Partial<Record<AppPage, string>>)[page] ?? page.charAt(0).toUpperCase() + page.slice(1);
  const breadcrumbLabel = isAdminWorkspace
    ? isAdminAccount ? "Account" : activeAdminSection?.label || "Overview"
    : portalLabel;
  const directorySections = allowedAdminNavigation.map(item => item.id)
    .filter((id): id is AdminSection => id !== "audit" && id !== "operations" && id !== "finance" && id !== "support" && id !== "placements");

  return (
    <div className={`workspace-shell min-h-screen flex flex-col ${isAdminWorkspace ? "admin-workspace" : "student-portal bg-cream"}`}>
      <TopBar
        user={user}
        workspace={isAdminWorkspace ? "admin" : "student"}
        adminSectionLabel={isAdminWorkspace ? (isAdminAccount ? "Account" : programDetailId ? "Program details" : activeAdminSection?.label) : undefined}
        canUseAdmin={Boolean(firstAdminSection)}
        onWorkspaceChange={(workspace) => goTo(workspace === "admin" ? "admin" : "dashboard")}
        notifCount={notifCount}
        notificationsOpen={notificationsOpen}
        notifications={notifications}
        notificationError={notificationError}
        onToggleSidebar={() => setSidebarOpen(true)}
        onGoHome={() => goTo(isAdminWorkspace ? "admin" : "dashboard")}
        onGoAccount={() => {
          navigate(isAdminWorkspace ? "/app/admin/account" : "/app/account");
          setSidebarOpen(false);
        }}
        onLogout={() => setShowLogout(true)}
        onToggleNotifications={() => setNotificationsOpen((o) => !o)}
        onOpenNotification={(n) => void openNotification(n)}
        onMarkAllRead={() => void readAllNotifications()}
        setNotifications={setNotifications}
        setNotifCount={setNotifCount}
        setNotificationError={setNotificationError}
      />

      <Sidebar
        page={page}
        adminNavigation={isAdminWorkspace ? {
          items: allowedAdminNavigation,
          activeId: isAdminAccount ? "account" : adminSection,
          onNavigate: (id) => {
            if (id === "account") {
              navigate("/app/admin/account");
              setSidebarOpen(false);
              return;
            }
            const section = allowedAdminNavigation.find((item) => item.id === id);
            if (section) goToAdmin(section.id);
          },
        } : undefined}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={goTo}
      />

      <main className="platform-main flex-1 pt-14 lg:pl-56 pb-safe">
        <div className="platform-page min-h-[calc(100dvh-3.5rem)]">
          {!programDetailId && (
            <nav aria-label="Breadcrumb" className="student-breadcrumb mx-auto flex max-w-[86rem] flex-wrap items-center gap-2 px-4 pt-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
              <Link to={isAdminWorkspace ? "/app/admin" : "/app/dashboard"} className="font-semibold text-primary hover:underline">
                {isAdminWorkspace ? "Admin" : "Student Portal"}
              </Link>
              <span aria-hidden="true">/</span>
              {page === "programs" && adminSegment ? <><Link to="/app/programs" className="hover:underline">Programs</Link><span aria-hidden="true">/</span><span aria-current="page">Program details</span></> :
                <span aria-current="page">{breadcrumbLabel}</span>}
            </nav>
          )}
          {page === "dashboard" && <DashboardPage />}
          {page === "applications" && <ApplicationsPage />}
          {page === "announcements" && <AnnouncementsPage />}
          {page === "programs" && (
            <ProgramsPage
              user={user}
              initialSelectedProgramId={initialProgramId}
              onInitialSelectionHandled={onInitialProgramHandled}
            />
          )}
          {page === "documents" && <StudentDocumentsPage />}
          {page === "placements" && <StudentPlacementsPage />}
          {page === "support" && <SupportPage student />}
          {page === "more" && (
            <StudentPage title="More">
              <ul className="student-panel">{[
                { text: "Announcements", path: "/app/announcements", Icon: Megaphone },
                { text: "My placements", path: "/app/placements", Icon: FolderOpen },
                { text: "Finance documents", path: "/app/documents", Icon: Wallet },
                { text: "Support tickets", path: "/app/support", Icon: LifeBuoy },
                { text: "Student profile", path: "/app/account", Icon: Users },
                { text: "Chapters", path: "/chapters", Icon: FolderOpen },
              ].map(({ text, path, Icon }) => <li key={path}><Link to={path} className="flex min-h-12 items-center gap-2 px-3 text-sm font-semibold hover:bg-secondary">
                <Icon className="size-4 text-primary" aria-hidden="true" />{text}
              </Link></li>)}</ul>
            </StudentPage>
          )}
          {page === "account" && <ProfilePage user={user} onAccountDeleted={onLogout} />}
          {isAdminAccount && <AdminAccountPage user={user} onSignOut={() => setShowLogout(true)} onAccountDeleted={onLogout} />}
          {isAdminWorkspace && !isAdminAccount && (
            isAudit && canInvestigate ? <AuditTrailPage /> :
            isOperations ? <OperationsPage canInvestigate={canInvestigate} /> :
            adminSection === "placements" ? <PlacementsPage /> :
            adminSection === "finance" ? (canFinance ? <FinancePage /> : null) :
            adminSection === "support" ? <SupportPage canFinance={canFinance} /> :
            adminSection !== "audit" ? (
              <AdminPage key={programDetailId || "admin-directory"} tab={adminSection} programDetailId={programDetailId}
                onNavigate={goToAdmin} allowedSections={directorySections} canInvestigate={canInvestigate} canFinance={canFinance}
                caseTools={allowedAdminNavigation.map(item => item.id).filter(id => id === "placements" || id === "finance" || id === "support")} />
            ) : null
          )}
        </div>
      </main>

      {!isAdminWorkspace && <BottomNav page={page} onNavigate={goTo} />}

      {showLogout && (
        <LogoutConfirmationModal
          onCancel={() => setShowLogout(false)}
          onConfirm={onLogout}
        />
      )}
    </div>
  );
}
