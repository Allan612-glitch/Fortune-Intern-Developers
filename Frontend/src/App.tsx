import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import MainApp from "./pages/MainApp";
import AIChatWidget from "./components/AIChatWidget";
import LandingPage from "./pages/LandingPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

export type AppUser = {
  name: string;
  email: string;
  school: string;
  major: string;
  avatar: string;
  isAdmin: boolean;
  verified: boolean;
  role: "student";
};

export type AppPage =
  | "home"
  | "dashboard"
  | "applications"
  | "announcements"
  | "programs"
  | "apply"
  | "profile"
  | "admin";

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [showOTP, setShowOTP] = useState(false);
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [authScreen, setAuthScreen] = useState<
    "landing" | "login" | "register" | "forgot" | "reset"
  >("landing");

  const navigateAuth = (screen: typeof authScreen) => {
    const path =
      screen === "forgot"
        ? "/forgot-password"
        : screen === "reset"
          ? "/reset-password"
          : "/";
    window.history.pushState({}, "", path);
    setAuthScreen(screen);
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/forgot-password") setAuthScreen("forgot");
    if (path === "/reset-password") setAuthScreen("reset");
  }, []);

  const handleRegister = (userData: AppUser) => {
    setPendingUser(userData);
    setShowOTP(true);
  };

  const handleOTPVerified = () => {
    if (pendingUser) {
      setUser({ ...pendingUser, verified: true });
      setPendingUser(null);
      setShowOTP(false);
    }
  };

  const handleLogin = (userData: AppUser) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setPendingUser(null);
    setShowOTP(false);
    setAuthScreen("login");
  };

  if (!user) {
    if (authScreen === "forgot")
      return (
        <ForgotPasswordPage
          onBack={() => navigateAuth("login")}
          onReset={() => navigateAuth("reset")}
        />
      );
    if (authScreen === "reset")
      return (
        <ResetPasswordPage
          onLogin={() => navigateAuth("login")}
          onForgot={() => navigateAuth("forgot")}
        />
      );
    if (authScreen === "landing") {
      return (
        <LandingPage
          onStudentPortal={(mode = "login") => setAuthScreen(mode)}
        />
      );
    }
    return (
      <AuthPage
        key={authScreen}
        initialMode={authScreen}
        onBack={() => setAuthScreen("landing")}
        onLogin={handleLogin}
        onRegister={handleRegister}
        showOTP={showOTP}
        onOTPVerified={handleOTPVerified}
        pendingEmail={pendingUser?.email || ""}
        onForgotPassword={() => navigateAuth("forgot")}
      />
    );
  }

  return (
    <>
      <MainApp user={user} onLogout={handleLogout} />
      <AIChatWidget user={user} />
    </>
  );
}
