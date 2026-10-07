import { useEffect, useRef, useState } from "react"
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom"

import AuthPage from "./pages/AuthPage"

import MainApp from "./pages/MainApp"

import AIChatWidget from "./components/AIChatWidget"

import LandingPage from "./pages/LandingPage"

import ForgotPasswordPage from "./pages/ForgotPasswordPage"

import ResetPasswordPage from "./pages/ResetPasswordPage"

import { getCurrentUser, getProfile } from "./services/auth"

import { getAccessToken, setAccessToken } from "./services/api"

export type AppUser = {
  name: string

  email: string

  school: string

  major: string

  avatar: string

  isAdmin: boolean

  verified: boolean

  role: "student"
}

export type AppPage = "home" | "dashboard" | "applications" | "announcements" | "programs" | "apply" | "profile" | "admin"

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(getAccessToken()))
  const [showOTP, setShowOTP] = useState(false)
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null)
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null)
  const pendingProgramIdRef = useRef<string | null>(null)

  const selectedProgramId =
    pendingProgramIdRef.current ||
    pendingProgramId ||
    new URLSearchParams(location.search).get("program")
  const authenticatedPath = selectedProgramId ? "/app/programs" : "/app/home"
  const programIdFromUrl = new URLSearchParams(location.search).get("program")

  useEffect(() => {
    if (!programIdFromUrl) return
    pendingProgramIdRef.current = programIdFromUrl
    setPendingProgramId(programIdFromUrl)
  }, [programIdFromUrl])

  const navigateAuth = (
    path: "/login" | "/register" | "/forgot-password" | "/reset-password",
  ) =>
    navigate({
      pathname: path,
      search: selectedProgramId
        ? `?program=${encodeURIComponent(selectedProgramId)}`
        : "",
    })

  useEffect(() => {
    if (getAccessToken()) {
      let active = true

      Promise.all([getCurrentUser(), getProfile()])

        .then(([account, profile]) => {
          if (!active) return

          setUser({
            name: account.name,

            email: account.email,

            school: profile.university || "",

            major: profile.major || profile.course || "",

            avatar: account.name

              .split(" ")

              .map((part) => part[0])

              .join("")

              .toUpperCase()

              .slice(0, 2),

            isAdmin: account.is_admin,

            verified: true,

            role: "student",
          })
        })

        .catch(() => setAccessToken(null))
        .finally(() => {
          if (active) setAuthLoading(false)
        })

      return () => {
        active = false
      }
    }
  }, [])

  const handleRegister = (userData: AppUser) => {
    setPendingUser(userData)

    setShowOTP(true)
  }

  const handleOTPVerified = (programId?: string | null) => {
    if (pendingUser) {
      const selectedProgram = programId || selectedProgramId
      if (selectedProgram) {
        pendingProgramIdRef.current = selectedProgram
        setPendingProgramId(selectedProgram)
      }
      setUser({ ...pendingUser, verified: true })

      setPendingUser(null)

      setShowOTP(false)

      navigate(selectedProgram ? "/app/programs" : "/app/home")
    }
  }

  const handleLogin = (userData: AppUser, programId?: string | null) => {
    const selectedProgram = programId || selectedProgramId
    if (selectedProgram) {
      pendingProgramIdRef.current = selectedProgram
      setPendingProgramId(selectedProgram)
    }
    setUser(userData)

    navigate(selectedProgram ? "/app/programs" : "/app/home")
  }

  const handleLogout = () => {
    setAccessToken(null)

    setUser(null)

    setPendingUser(null)

    setShowOTP(false)

    pendingProgramIdRef.current = null
    setPendingProgramId(null)

    navigate("/login")
  }

  const authPage = (mode: "login" | "register") =>
    user ? (
      <Navigate to={authenticatedPath} replace />
    ) : (
      <AuthPage
        key={mode}
        initialMode={mode}
        onBack={() => {
          pendingProgramIdRef.current = null
          setPendingProgramId(null)
          navigate("/")
        }}
        onModeChange={(nextMode) => navigateAuth(`/${nextMode}`)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        showOTP={showOTP}
        onOTPVerified={handleOTPVerified}
        pendingEmail={pendingUser?.email || ""}
        onForgotPassword={() => navigateAuth("/forgot-password")}
      />
    )

  if (authLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-cream text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Checking your session...
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={authenticatedPath} replace />
            ) : (
              <LandingPage
                onStudentPortal={(mode = "login") => navigateAuth(`/${mode}`)}
                onApplyToProgram={(programId) => {
                  setPendingProgramId(programId)
                  pendingProgramIdRef.current = programId
                  navigate(`/login?program=${encodeURIComponent(programId)}`)
                }}
              />
            )
          }
        />
        <Route path="/login" element={authPage("login")} />
        <Route path="/register" element={authPage("register")} />
        <Route
          path="/forgot-password"
          element={
            user ? (
              <Navigate to={authenticatedPath} replace />
            ) : (
              <ForgotPasswordPage
                onBack={() => navigateAuth("/login")}
              />
            )
          }
        />
        <Route
          path="/reset-password"
          element={
            user ? (
              <Navigate to={authenticatedPath} replace />
            ) : (
              <ResetPasswordPage
                onLogin={() => navigateAuth("/login")}
                onForgot={() => navigateAuth("/forgot-password")}
              />
            )
          }
        />
        <Route
          path="/reset-password.html"
          element={
            <Navigate to={`/reset-password${location.search}`} replace />
          }
        />
        <Route
          path="/app/*"
          element={
            user ? (
              <>
                <MainApp
                  user={user}
                  onLogout={handleLogout}
                  initialProgramId={selectedProgramId}
                  onInitialProgramHandled={() => {
                    pendingProgramIdRef.current = null
                    setPendingProgramId(null)
                  }}
                />
                <AIChatWidget user={user} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? authenticatedPath : "/"} replace />}
        />
      </Routes>
    </>
  )
}
