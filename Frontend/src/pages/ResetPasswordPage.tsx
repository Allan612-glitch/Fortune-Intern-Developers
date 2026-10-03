import { useState } from "react";
import logo from "../assets/attach1.png";
import { resetPassword } from "../services/authNotifications";

export default function ResetPasswordPage({
  onLogin,
  onForgot,
}: {
  onLogin: () => void;
  onForgot: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [show, setShow] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const token =
      new URLSearchParams(window.location.search).get("token") || "";
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError(
        "This password reset link is invalid or has expired. Please request a new reset link.",
      );
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch {
      setError(
        "This password reset link is invalid or has expired. Please request a new reset link.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-sm p-8">
        <img
          src={logo}
          alt="Fortune Intern Network"
          className="w-14 h-14 mx-auto rounded-2xl object-contain"
        />
        {success ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold mt-5">
              Password Reset Successful
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              Your password has been successfully changed. You can now log in
              with your new password.
            </p>
            <button
              onClick={onLogin}
              className="w-full mt-6 py-3 rounded-xl bg-primary text-white font-semibold"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center mt-5">
              Reset Your Password
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              Create a new password for your Fortune Intern Network account.
            </p>
            <form onSubmit={submit} className="space-y-4 mt-6">
              <PasswordField
                label="New Password"
                value={password}
                onChange={setPassword}
                show={show}
                toggle={() => setShow(!show)}
              />
              <PasswordField
                label="Confirm Password"
                value={confirm}
                onChange={setConfirm}
                show={show}
                toggle={() => setShow(!show)}
              />
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters with a mix of letters and numbers.
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-60"
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={onForgot}
                className="w-full text-sm text-primary font-semibold"
              >
                Request New Reset Link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  toggle: () => void;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <div className="flex mt-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={show ? "text" : "password"}
          className="w-full px-4 py-3 rounded-l-xl border border-border bg-muted/30 text-sm"
        />
        <button
          type="button"
          onClick={toggle}
          className="px-3 border border-l-0 border-border rounded-r-xl text-xs"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
