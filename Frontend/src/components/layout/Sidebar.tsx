import { Ellipsis, Settings, Wallet, LifeBuoy, ClipboardList, type LucideIcon } from "lucide-react";
import type { AppPage } from "../../App";
import logo from "../../assets/attach1.png";

export const navItems = [
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
    id: "applications",
    label: "My Applications",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4"
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
  { id: "placements", label: "My placements", icon: <ClipboardList /> },
  { id: "documents", label: "Finance documents", icon: <Wallet /> },
  { id: "support", label: "Support tickets", icon: <LifeBuoy /> },
  { id: "profile", label: "Student profile", icon: <Settings /> },
  {
    id: "more",
    label: "More",
    icon: <Ellipsis aria-hidden="true" />,
  },
];

export interface AdminNavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  page: AppPage;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: AppPage) => void;
  adminNavigation?: {
    items: readonly AdminNavigationItem[];
    activeId: string;
    onNavigate: (id: string) => void;
  };
}

function WorkspaceNavigation({ page, onNavigate, adminNavigation }: Pick<SidebarProps, "page" | "onNavigate" | "adminNavigation">) {
  if (adminNavigation) {
    return (
      <nav aria-label="Admin workspace" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <span className="block text-sm font-semibold text-white">Admin workspace</span>
          <span className="mt-1 block text-xs text-white/70">Fortune Intern Network</span>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {adminNavigation.items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={adminNavigation.activeId === id ? "page" : undefined}
              onClick={() => adminNavigation.onNavigate(id)}
              className="admin-sidebar-item flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium"
            >
              <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
              {label}
            </button>
          ))}
        </div>
        <div className="border-t border-white/10 p-3">
          <button type="button" aria-current={adminNavigation.activeId === "account" ? "page" : undefined}
            onClick={() => adminNavigation.onNavigate("account")}
            className="admin-sidebar-item flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium">
            <Settings aria-hidden="true" className="size-[1.125rem] shrink-0" />
            Account
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Student portal" className="flex-1 overflow-y-auto p-3 space-y-0.5">
      {navItems.map((item) => {
        const active = page === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.id as AppPage)}
            className={`w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
          >
            <svg aria-hidden="true" className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {item.icon}
            </svg>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Desktop sidebar (always visible on lg+) */
function DesktopSidebar({ page, onNavigate, adminNavigation }: Omit<SidebarProps, "isOpen" | "onClose">) {
  return (
    <aside className={`hidden lg:flex fixed top-14 left-0 bottom-0 w-56 border-r border-border flex-col z-30 ${adminNavigation ? "admin-sidebar text-white" : "bg-white"}`}>
      <WorkspaceNavigation page={page} onNavigate={onNavigate} adminNavigation={adminNavigation} />
    </aside>
  );
}

/** Mobile slide-out sidebar overlay */
function MobileSidebar({ page, isOpen, onClose, onNavigate, adminNavigation }: SidebarProps) {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col slide-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img src={logo} alt="FIN" className="h-10 w-10 object-contain" />
            <div>
              <div className="font-bold text-sm" style={{ color: "var(--brand-ink)", fontFamily: "Inter, sans-serif" }}>
                FORTUNE
              </div>
              <div className="text-[10px]">
                <span style={{ color: "#F5B731" }}>INTERN</span>{" "}
                <span style={{ color: "var(--brand-ink)" }}>NETWORK</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted" aria-label="Close navigation">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <div className={`flex min-h-0 flex-1 flex-col ${adminNavigation ? "admin-sidebar" : ""}`}>
          <WorkspaceNavigation page={page} onNavigate={onNavigate} adminNavigation={adminNavigation} />
        </div>

      </aside>
    </>
  );
}

/** Exports both Desktop and Mobile sidebars as one component */
export default function Sidebar(props: SidebarProps) {
  return (
    <>
      <DesktopSidebar
        adminNavigation={props.adminNavigation}
        page={props.page}
        onNavigate={props.onNavigate}
      />
      <MobileSidebar {...props} />
    </>
  );
}
