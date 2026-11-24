import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom"

import CookieConsent from "./components/CookieConsent"
import InstallBanner from "./components/InstallBanner"
import LandingPage from "./pages/LandingPage"
import Footer from "./components/layout/Footer"
import { getCurrentUser, getProfile, logout, profilePhotoUpdatedEvent, staffInviteStorageKey } from "./services/auth"
import { ApiError, getAccessToken, setAccessToken } from "./services/api"

// Performance: these pages load only when a visitor opens them, so the
// landing page no longer downloads the logged-in app, admin code, etc.
const StaffInvitePage = lazy(() => import("./pages/StaffInvitePage"))
const AuthPage = lazy(() => import("./pages/AuthPage"))
const MainApp = lazy(() => import("./pages/MainApp"))
const AIChatWidget = lazy(() => import("./components/AIChatWidget"))
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"))
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"))
const About = lazy(() => import("./pages/companypages/About"))
const Contact = lazy(() => import("./pages/companypages/ContactUs"))
const PrivacyPolicy = lazy(() => import("./pages/companypages/PrivacyPolicy"))
const Terms = lazy(() => import("./pages/companypages/TAC"))
const VerifyLetterPage = lazy(() => import("./pages/VerifyLetterPage"))
const ChaptersPage = lazy(() => import("./pages/ChaptersPage"))

export type AppUser = {
  name: string
  email: string
  school: string
  major: string
  avatar: string
  profilePhotoUrl?: string | null
  isAdmin: boolean
  staffPermissions?: string[]
  verified: boolean
  role: "student"
}

export type AppPage =
  | "support"
  | "documents"
  | "placements"
  | "home"
  | "dashboard"
  | "applications"
  | "announcements"
  | "programs"
  | "apply"
  | "more"
  | "account"
  | "admin"

function studentReturnTo(value: string | null) {
  if (value === "/chapters.html" || value === "/chapters") return "/chapters"
  if (!value || value.includes("\\")) return null
  const path = value.split(/[?#]/, 1)[0]
  return /^\/app(?:\/(?:home|dashboard|programs|applications|announcements|documents|placements|support|account|profile|more|apply))?\/?$/.test(path) ||
    /^\/app\/(?:programs|apply)\/[\w-]+\/?$/.test(path) ? value : null
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(getAccessToken()))
  const [showOTP, setShowOTP] = useState(false)
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null)
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null)
  const pendingProgramIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (location.hash) {
      try {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
      } catch { /* A malformed hash does not have a destination. */ }
      return
    }
    if (location.state?.keepScroll) return

    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [location.pathname, location.hash, location.state])

  useEffect(() => {
    const handleSessionExpired = () => {
      setAccessToken(null)
      setUser(null)
      navigate("/login")
    }
    window.addEventListener("auth:session-expired", handleSessionExpired)
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired)
  }, [navigate])

  const selectedProgramId =
    pendingProgramIdRef.current ||
    pendingProgramId ||
    new URLSearchParams(location.search).get("program")
  const requestedReturnTo = new URLSearchParams(location.search).get("returnTo")
  const returnTo = studentReturnTo(requestedReturnTo)
  const authenticatedPath = returnTo || (selectedProgramId ? "/app/programs" : "/app/dashboard")
  const programIdFromUrl = new URLSearchParams(location.search).get("program")

  useEffect(() => {
    if (!programIdFromUrl) return
    pendingProgramIdRef.current = programIdFromUrl
    setPendingProgramId(programIdFromUrl)
  }, [programIdFromUrl])

  const navigateAuth = (
    path: "/login" | "/register" | "/forgot-password" | "/reset-password",
  ) => {
    const search = new URLSearchParams()
    if (selectedProgramId) search.set("program", selectedProgramId)
    if (returnTo) search.set("returnTo", returnTo)
    const searchString = search.toString()
    navigate({
      pathname: path,
      search: searchString ? `?${searchString}` : "",
    })
  }

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

            profilePhotoUrl: profile.profile_picture,
            isAdmin: account.is_admin,
            staffPermissions: account.staff_permissions,

            verified: true,

            role: "student",
          })
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            setAccessToken(null)
          }
        })
        .finally(() => {
          if (active) setAuthLoading(false)
        })

      return () => {
        active = false
      }
    }
    setAuthLoading(false)
  }, [])

  useEffect(() => {
    const updatePhoto = (event: Event) => {
      const photo = (event as CustomEvent<string | null>).detail
      setUser(current => current ? { ...current, profilePhotoUrl: photo } : current)
    }
    window.addEventListener(profilePhotoUpdatedEvent, updatePhoto)
    return () => window.removeEventListener(profilePhotoUpdatedEvent, updatePhoto)
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
      navigate(sessionStorage.getItem(staffInviteStorageKey) ? "/staff-invite" : returnTo || (selectedProgram ? "/app/programs" : "/app/dashboard"))
    }
  }
  const handleLogin = (userData: AppUser, programId?: string | null) => {
    const selectedProgram = programId || selectedProgramId
    if (selectedProgram) {
      pendingProgramIdRef.current = selectedProgram
      setPendingProgramId(selectedProgram)
    }
    setUser(userData)
    navigate(sessionStorage.getItem(staffInviteStorageKey) ? "/staff-invite" : returnTo || (selectedProgram ? "/app/programs" : "/app/dashboard"))
  }

  const handleLogout = () => {
    void logout().catch((error: unknown) => {
      console.error("Unable to clear the refresh session during logout.", error)
    })
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
      <Navigate
        to={sessionStorage.getItem(staffInviteStorageKey) ? "/staff-invite" : authenticatedPath}
        replace
      />
    ) : (
      // Google's sign-in script now loads only on the login/register pages
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <AuthPage
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
      </GoogleOAuthProvider>
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
      <Suspense
        fallback={
          <div
            className="flex min-h-screen items-center justify-center bg-cream text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Loading...
          </div>
        }
      >
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
          path="/chapters"
          element={
            user ? (
              <ChaptersPage user={user} />
            ) : (
              <Navigate to="/login?returnTo=%2Fchapters" replace />
            )
          }
        />
        <Route path="/chapters.html" element={<Navigate to={`/chapters${location.search}${location.hash}`} replace />} />
        {/* TEMPORARY: sign-in-free preview of the chapters page. Dev server only
            (import.meta.env.DEV is false in a production build). Delete before launch. */}
        {import.meta.env.DEV && (
          <Route
            path="/chapters-preview"
            element={
              <ChaptersPage
                user={{
                  name: "Preview Visitor",
                  email: "preview@example.com",
                  school: "",
                  major: "",
                  avatar: "PV",
                  isAdmin: true,
                  verified: true,
                  role: "student",
                }}
              />
            }
          />
        )}
        <Route
          path="/forgot-password"
          element={
            user ? (
              <Navigate to={authenticatedPath} replace />
            ) : (
              <ForgotPasswordPage onBack={() => navigateAuth("/login")} />
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
          element={<Navigate to={`/reset-password${location.search}`} replace />}
        />
        <Route
          path="/about"
          element={
            <>
              <About />
              <Footer />
            </>
          }
        />
        <Route
          path="/contact"
          element={
            <>
              <Contact />
              <Footer />
            </>
          }
        />
        <Route
          path="/cookie-policy"
          element={<Navigate to="/privacy-policy" replace />}
        />
        <Route
          path="/privacy-policy"
          element={
            <>
              <PrivacyPolicy />
              <Footer />
            </>
          }
        />
        <Route
          path="/refund-policy"
          element={<Navigate to="/terms#refunds" replace />}
        />
        <Route
          path="/terms"
          element={
            <>
              <Terms />
              <Footer />
            </>
          }
        />
        <Route
          path="/verify-letter"
          element={
            <>
              <VerifyLetterPage />
              <Footer />
            </>
          }
        />
        <Route path="/staff-invite" element={<StaffInvitePage email={user?.email} onLogout={handleLogout} />} />
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
                <Suspense fallback={null}>
                  <AIChatWidget user={user} />
                </Suspense>
              </>
            ) : (
              <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? authenticatedPath : "/"} replace />}
        />
      </Routes>
      </Suspense>
      <CookieConsent />
      <InstallBanner />
    </>
  )
}
