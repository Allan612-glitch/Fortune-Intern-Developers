import { useNavigate } from "react-router-dom";
import type { AppPage } from "../../App";
import { navItems } from "./Sidebar";

interface BottomNavProps {
  page?: AppPage;
  onNavigate?: (page: AppPage) => void;
}

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
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex w-full items-center">
        {navItems
          .filter((item) => item.id !== "announcements")
          .map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id as AppPage)}
                className="relative flex flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors"
                style={{ color: active ? "#2D3561" : "#9ca3af" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            );
          })}
      </div>
    </nav>
  );
}
