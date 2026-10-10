import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import type { AppUser } from "../App";
import { ApiError } from "../services/api";
import { requestForgotPassword } from "../services/authNotifications";
import { getProfile, login, loginWithGoogle, register, resendVerification, updateProfile, verifyEmail } from "../services/auth";
import TurnstileChallenge from "../components/TurnstileChallenge";

const ghanaUniversities = [
  "University of Ghana",
  "KNUST",
  "University of Cape Coast",
  "Ashesi University",
  "Ghana Institute of Management and Public Administration (GIMPA)",
  "Central University",
  "University of Professional Studies",
  "Accra Technical University",
  "Ho Technical University",
  "University of Energy and Natural Resources",
  "Other",
];

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (pw: string) => pw.length >= 8;

interface AuthPageProps {
  initialMode?: "login" | "register";
  onBack?: () => void;
  onModeChange?: (mode: "login" | "register") => void;
  onLogin: (user: AppUser, programId?: string | null) => void;
  onRegister: (user: AppUser) => void;
  showOTP: boolean;
  onOTPVerified: (programId?: string | null) => void;
  pendingEmail: string;
  onForgotPassword?: () => void;
}

export default function AuthPage({
  initialMode = "login",
  onBack,
  onModeChange,
  onLogin,
  onRegister,
  showOTP,
  onOTPVerified,
  pendingEmail,
  onForgotPassword,
}: AuthPageProps) {
  const location = useLocation();
  const [localMode, setLocalMode] = useState<"login" | "register">(initialMode);
  const mode = onModeChange ? initialMode : localMode;
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    school: "",
    major: "",
    industry: "",
    userType: "student" as const,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(() =>
    Math.min(384, Math.max(200, window.innerWidth - 96)),
  );
  const googleClientConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

  useEffect(() => {
    const updateGoogleButtonWidth = () => {
      setGoogleButtonWidth(Math.min(384, Math.max(200, window.innerWidth - 96)));
    };

    window.addEventListener("resize", updateGoogleButtonWidth);
    return () => window.removeEventListener("resize", updateGoogleButtonWidth);
  }, []);

  useEffect(() => {
    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      school: "",
      major: "",
      industry: "",
      userType: "student",
    });
    setTouched({});
    setLoading(false);
    setSubmitError("");
    setRecoveryOpen(false);
    setCaptchaRequired(false);
    setCaptchaToken("");
    setCaptchaWidgetKey(0);
  }, [initialMode]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setSubmitError("");
  };
  const touch = (k: string) => setTouched((p) => ({ ...p, [k]: true }));

  const errors: Record<string, string> = {};
  if ((touched.email || submitError) && form.email && !isValidEmail(form.email))
    errors.email = "Invalid email address";
  if ((touched.email || submitError) && !form.email)
    errors.email = "Email is required";
  if ((touched.password || submitError) && !form.password)
    errors.password = "Password is required";
  if (
    (touched.password || submitError) &&
    form.password &&
    !isValidPassword(form.password)
  )
    errors.password = "Password must be at least 8 characters";
  if (mode === "register") {
    if ((touched.name || submitError) && !form.name)
      errors.name = "Full name is required";
    if (
      (touched.school || submitError) &&
      form.userType === "student" &&
      !form.school
    )
      errors.school = "Please select your university";
    if ((touched.confirmPassword || submitError) && !form.confirmPassword)
      errors.confirmPassword = "Please confirm your password";
    if (
      (touched.confirmPassword || submitError) &&
      form.confirmPassword &&
      form.confirmPassword !== form.password
    )
      errors.confirmPassword = "Passwords do not match";
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setSubmitError("");
    if (
      !form.email ||
      !isValidEmail(form.email) ||
      !form.password ||
      !isValidPassword(form.password)
    )
      return;
    setLoading(true);
    try {
      const account = await login(form.email.trim(), form.password);
      const profile = await getProfile();
      onLogin(
        {
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
        },
        new URLSearchParams(location.search).get("program"),
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: { credential?: string }) => {
    if (!response.credential) {
      setSubmitError("Google sign-in did not return a credential.");
      return;
    }
    if (mode === "register" && !form.school) {
      touch("school");
      setSubmitError("Select your university before signing up with Google.");
      return;
    }

    setLoading(true);
    setSubmitError("");
    try {
      const account = await loginWithGoogle(response.credential);
      const profile = await getProfile();
      if (mode === "register") {
        await updateProfile({ university: form.school, major: form.major });
        profile.university = form.school;
        profile.major = form.major;
      }
      onLogin({
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
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      school: true,
      industry: true,
    });
    if (
      !form.name ||
      !form.email ||
      !isValidEmail(form.email) ||
      !form.password ||
      !isValidPassword(form.password) ||
      form.confirmPassword !== form.password ||
      !form.school
    )
      return;
    setLoading(true);
    try {
      await register(
        form.name.trim(),
        form.email.trim(),
        form.password,
        captchaToken || undefined,
      );
      onRegister({
      name: form.name,
      email: form.email,
      school: form.school || "N/A",
      major: form.major || "General",
      avatar: form.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      isAdmin: false,
      verified: false,
      role: "student",
      });
    } catch (error) {
      if (error instanceof ApiError && (error.code === "captcha_required" || error.code === "captcha_invalid")) {
        setCaptchaRequired(true);
        setCaptchaToken("");
        setCaptchaWidgetKey((key) => key + 1);
        setSubmitError(error.code === "captcha_invalid" ? error.message : "");
        return;
      }
      setSubmitError(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      if (captchaToken) {
        setCaptchaToken("");
        setCaptchaWidgetKey((key) => key + 1);
      }
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "register") => {
    setTouched({});
    setSubmitError("");
    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      school: "",
      major: "",
      industry: "",
      userType: "student",
    });
    if (onModeChange) {
      onModeChange(m);
      return;
    }
    setLocalMode(m);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      {onBack && (
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-40 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 border border-border shadow-sm text-xs font-semibold text-primary hover:bg-white transition-colors"
        >
          <span aria-hidden="true">←</span> Back to home
        </button>
      )}
      <div className="w-full flex items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-emerald-700">
              Student Portal
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Choose Sign In if you already have an account, or Sign Up to
              create one.
            </p>
          </div>
          {/* Tab toggle */}
          <div className="flex bg-white border border-border rounded-2xl p-1.5 mb-8 shadow-sm">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? "text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                style={
                  mode === m
                    ? {
                        background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                      }
                    : {}
                }
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
            <h2
              className="text-2xl font-bold mb-1"
              style={{
                fontFamily: "Inter, sans-serif",
                color: "#1a1f3a",
              }}
            >
              {mode === "login"
                ? "Welcome back to the Student Portal"
                : "Create Student Account"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "login"
                ? "Sign in to access your internship dashboard."
                : "Create your account to start applying."}
            </p>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                <Field
                  label=" Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  onBlur={() => touch("email")}
                  placeholder="you@email.com"
                  error={errors.email}
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  }
                />
                <Field
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  onBlur={() => touch("password")}
                  placeholder="••••••••"
                  error={errors.password}
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  }
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-border" />
                    <span className="text-xs text-muted-foreground">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onForgotPassword
                        ? onForgotPassword()
                        : setRecoveryOpen(true)
                    }
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                {submitError && (
                  <p className="text-red-500 text-xs">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60 shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4" noValidate>
                <Field
                  label="Full Name"
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  onBlur={() => touch("name")}
                  placeholder="Kwame Asante"
                  error={errors.name}
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  }
                />

                <Field
                  label="Email address"
                  type="email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  onBlur={() => touch("email")}
                  placeholder="you@email.com"
                  error={errors.email}
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  }
                />

                {form.userType === "student" && (
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: "#1a1f3a" }}
                    >
                      University
                    </label>
                    <select
                      value={form.school}
                      onChange={(e) => set("school", e.target.value)}
                      onBlur={() => touch("school")}
                      className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-muted/30 transition-colors ${errors.school ? "border-red-400 bg-red-50" : "border-border"}`}
                    >
                      <option value="">Select your university</option>
                      {ghanaUniversities.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                    {errors.school && <ErrorMsg msg={errors.school} />}
                  </div>
                )}

                {form.userType === "student" && (
                  <Field
                    label="Programme / Major"
                    value={form.major}
                    onChange={(v) => set("major", v)}
                    placeholder="e.g. Computer Science"
                    icon={
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    }
                  />
                )}

                <Field
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  onBlur={() => touch("password")}
                  placeholder="Min. 8 characters"
                  error={errors.password}
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  }
                />

                <Field
                  label="Confirm password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(v) => set("confirmPassword", v)}
                  onBlur={() => touch("confirmPassword")}
                  placeholder="Re-enter your password"
                  error={errors.confirmPassword}
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12l2 2 4-4m3 1V7a6 6 0 10-12 0v4m0 0H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2H6z"
                    />
                  }
                />

                {captchaRequired && (
                  <div className="space-y-2">
                    {turnstileSiteKey ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Please complete this security check to continue signing up.
                        </p>
                        <TurnstileChallenge
                          key={captchaWidgetKey}
                          siteKey={turnstileSiteKey}
                          onToken={(token) => {
                            setCaptchaToken(token);
                            if (token) setSubmitError("");
                          }}
                        />
                      </>
                    ) : (
                      <p className="text-red-500 text-xs" role="alert">
                        Signup security verification is not configured. Please contact support.
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (captchaRequired && !captchaToken)}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60 shadow-md mt-2"
                  style={{
                    background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <p className="text-[11px] text-muted-foreground text-center">
                  A 6-digit verification code will be sent to your email.
                </p>

                {submitError && (
                  <p className="text-red-500 text-xs">{submitError}</p>
                )}
              </form>
            )}

            <div className="mt-5 space-y-4">
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {googleClientConfigured ? (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setSubmitError("Google sign-in failed. Please try again.")}
                    text="continue_with"
                    theme="filled_blue"
                    shape="rectangular"
                    size="large"
                    width={String(googleButtonWidth)}
                  />
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Google sign-in is not configured for this deployment.
                </p>
              )}

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="w-full py-3 rounded-xl border-2 border-border text-sm font-semibold text-foreground hover:border-primary hover:bg-secondary transition-all"
                >
                  Sign Up
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2026 Fortune Intern Network · Accra, Ghana
          </p>
        </div>
      </div>

      {showOTP && (
        <OTPModal
          email={pendingEmail}
          university={form.school}
          major={form.major}
          onVerified={() =>
            onOTPVerified(new URLSearchParams(location.search).get("program"))
          }
        />
      )}
      {recoveryOpen && (
        <PasswordRecoveryModal
          initialEmail={form.email}
          onClose={() => setRecoveryOpen(false)}
        />
      )}
    </div>
  );
}

function PasswordRecoveryModal({
  initialEmail,
  onClose,
}: {
  initialEmail: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) return;
    setLoading(true);
    setLoading(true);
    try {
      await requestForgotPassword(email.trim());
      setSent(true);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl border border-border shadow-2xl p-6 slide-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700">
              Student account
            </p>
            <h2
              id="recovery-title"
              className="font-display text-2xl text-primary mt-2"
            >
              Reset your password
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center"
            aria-label="Close password recovery"
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
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
        </div>
        {sent ? (
          <div className="mt-5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold mt-4">Check your email</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              Password reset instructions have been requested for{" "}
              <strong>{email}</strong>.
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              If you don’t see the email, check your spam or junk folder.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5">
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Enter the email associated with your student account.
            </p>
            <Field
              label="Student email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@university.edu.gh"
            />
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            <button
              type="submit"
              disabled={loading || !isValidEmail(email)}
              className="w-full mt-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Sending instructions..." : "Send Reset Instructions"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Shared Field component ── */
function Field({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  icon,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label
        className="block text-xs font-semibold mb-1.5"
        style={{ color: "#1a1f3a" }}
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4"
            style={{ color: error ? "#ef4444" : "#9ca3af" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {icon}
          </svg>
        </span>
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full pl-10 ${isPassword ? "pr-10" : "pr-4"} py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-red-400 bg-red-50 focus:ring-red-200"
              : "border-border bg-muted/30 focus:ring-blue-100"
          }`}
          style={{ borderColor: error ? "#ef4444" : undefined }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <ErrorMsg msg={error} />}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs font-medium text-red-500 slide-in">
      <svg
        className="w-3.5 h-3.5 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {msg}
    </p>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ── OTP Modal ── */
function OTPModal({
  email,
  university,
  major,
  onVerified,
}: {
  email: string;
  university: string;
  major: string;
  onVerified: () => void;
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendSeconds === 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleInput = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = ["", "", "", "", "", ""];
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setOtp(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyEmail(email, code);
      await updateProfile({ university, major, course: major });
      onVerified();
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Unable to verify this code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await resendVerification(email);
      setOtp(["", "", "", "", "", ""]);
      setResendSeconds(60);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to resend the verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 slide-in text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
        >
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Verify your email
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          We sent a 6-digit code to
          <br />
          <span className="font-semibold text-foreground">{email}</span>
        </p>
        <p className="text-[11px] text-muted-foreground -mt-4 mb-4">
          If it doesn’t arrive, check your spam or junk folder.
        </p>

        <div className="flex justify-center gap-2 mb-4">
          {otp.map((v, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={v}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="otp-input"
              maxLength={1}
              inputMode="numeric"
              style={{ borderColor: v ? "#2D3561" : undefined }}
            />
          ))}
        </div>

        {error && (
          <p className="flex items-center justify-center gap-1 text-xs font-medium text-red-500 mb-3 slide-in">
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm mb-4 hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #F5B731, #d9a020)",
            color: "#1a1f3a",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner />
              Verifying...
            </span>
          ) : (
            "Verify Email"
          )}
        </button>

        <button
          onClick={() => void handleResend()}
          disabled={resending || resendSeconds > 0}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {resending
            ? "Sending a new code..."
            : resendSeconds > 0
              ? `Resend available in ${resendSeconds}s`
              : "Didn't receive it? Resend code"}
        </button>
        <p className="text-[11px] text-muted-foreground mt-3">
          Code expires in 10 minutes
        </p>
      </div>
    </div>
  );
}
