import { useNavigate } from "react-router-dom";
import type { AppPage } from "../../App";
import { navItems } from "./Sidebar";

interface BottomNavProps {
  page?: AppPage;
  onNavigate?: (page: AppPage) => void;
}

// Keep the label compact on phones and preserve the accessible name.
const shortLabels: Record<string, string> = {
  applications: "Applied",
};

export default function BottomNav({ page, onNavigate }: BottomNavProps) {
  const navigate = useNavigate();

  const handleNavigate = (id: AppPage) => {
    if (onNavigate) {
      onNavigate(id);
    } else {
      // On public pages, send the user to login so they can access the app
      navigate("/");
    }
  };

  return (
    <nav
      aria-label="Student shortcuts"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex w-full items-center">
        {navItems
          .filter((item) => ["dashboard", "programs", "applications", "more"].includes(item.id))
          .map((item) => {
            const active = page === item.id || (item.id === "more" && ["announcements", "support", "documents", "placements", "account"].includes(page ?? ""));
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id as AppPage)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-1.5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
                <span
                  className="w-full text-center text-[11px] font-semibold leading-tight"
                >
                  {shortLabels[item.id] ?? item.label}
                </span>
                {active && (
                  <div
                    className="absolute bottom-0 h-0.5 w-6 rounded-full bg-accent"
                  />
                )}
              </button>
            );
          })}
      </div>
    </nav>
  );
}
