import { useState } from "react";
import logo from "../assets/attach1.png";
import { requestForgotPassword } from "../services/authNotifications";

export default function ForgotPasswordPage({
  onBack,
  onReset,
}: {
  onBack: () => void;
  onReset: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestForgotPassword(email.trim());
      setSent(true);
    } catch {
      setError("We couldn't process your request right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell>
      <img
        src={logo}
        alt="Fortune Intern Network"
        className="w-14 h-14 mx-auto rounded-2xl object-contain"
      />
      <h1 className="text-2xl font-bold text-center mt-5">Forgot Password?</h1>
      {sent ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mt-3">
            If an account exists with that email address, we’ve sent a password
            reset link. Please check your inbox and spam folder.
          </p>
          <button
            onClick={onBack}
            className="w-full mt-6 py-3 rounded-xl bg-primary text-white font-semibold"
          >
            Back to Login
          </button>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-sm text-primary font-semibold"
          >
            Resend link
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6">
          <p className="text-sm text-muted-foreground">
            Enter the email address associated with your account and we’ll send
            you a link to reset your password.
          </p>
          <label className="block text-xs font-semibold mt-5">
            Email Address
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="Enter your email address"
              type="email"
              className="mt-1.5 w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm"
            />
            {error && (
              <span className="block text-xs text-red-600 mt-1.5">{error}</span>
            )}
          </label>
          <button
            disabled={loading}
            className="w-full mt-5 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full mt-3 py-3 rounded-xl border border-border text-sm font-semibold"
          >
            Back to Login
          </button>
        </form>
      )}
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-sm p-8">
        {children}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 Fortune Intern Network · Accra, Ghana
        </p>
      </div>
    </div>
  );
}
