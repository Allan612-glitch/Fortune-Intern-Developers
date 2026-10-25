import { useState } from "react";
import logo from "../assets/attach1.png";
import { deleteAccount } from "../services/auth";
import Icon from "./ui/Icon";

type DeletionStep = "confirm" | "feedback" | "final";

export default function AccountDeletionModal({
  onCancel,
  onDeleted,
}: {
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<DeletionStep>("confirm");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmDeletion = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteAccount(confirmation.trim());
      onDeleted();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete your account. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white border border-border shadow-2xl p-6 sm:p-7 slide-in">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
          <img
            src={logo}
            alt=""
            className="h-11 w-11 rounded-xl border border-border object-contain"
          />
          <div>
            <p className="font-semibold text-sm text-primary">Fortune Intern Network</p>
            <p className="text-xs text-muted-foreground">Account settings</p>
          </div>
        </div>
        {step === "confirm" && (
          <>
            <h2 id="delete-account-title" className="font-display text-2xl text-primary">
              Are you sure you want to delete your account?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              Your account will be disabled immediately and scheduled for permanent deletion after 30 days. Your profile, applications, and uploaded files will remain stored during that period.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary"
              >
                Keep my account
              </button>
              <button
                type="button"
                onClick={() => setStep("feedback")}
                className="py-3 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800"
              >
                Yes, continue
              </button>
            </div>
          </>
        )}

        {step === "feedback" && (
          <>
            <h2 id="delete-account-title" className="font-display text-2xl text-primary">
              We’d love to hear from you
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Is there anything we could have done better? If something went wrong, our team is happy to help.
            </p>
            <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Get in touch
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <a
                  href="mailto:fortuneintern.gh@gmail.com"
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-white p-3 text-sm font-medium text-primary transition-colors hover:border-primary/30 hover:bg-secondary/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon name="email" className="h-4 w-4" />
                  </span>
                  <span className="truncate">Email our team</span>
                </a>
                <a
                  href="tel:+233200313672"
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 text-sm font-medium text-primary transition-colors hover:border-primary/30 hover:bg-secondary/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon name="phone" className="h-4 w-4" />
                  </span>
                  <span>+233 20 031 3672</span>
                </a>
                <a
                  href="tel:+233257038948"
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 text-sm font-medium text-primary transition-colors hover:border-primary/30 hover:bg-secondary/50 sm:col-span-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon name="phone" className="h-4 w-4" />
                  </span>
                  <span>+233 25 703 8948</span>
                </a>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Follow us
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  {
                    name: "WhatsApp",
                    icon: "whatsapp",
                    href: "https://whatsapp.com/channel/0029Val97zy1yT2BGkOZi511",
                    color: "text-emerald-700 hover:bg-emerald-50",
                  },
                  {
                    name: "LinkedIn",
                    icon: "linkedin",
                    href: "https://www.linkedin.com/company/fortune-intern-network/",
                    color: "text-blue-700 hover:bg-blue-50",
                  },
                  {
                    name: "X",
                    icon: "x",
                    href: "https://x.com/fortune_intern1",
                    color: "text-slate-800 hover:bg-slate-100",
                  },
                  {
                    name: "Instagram",
                    icon: "instagram",
                    href: "https://www.instagram.com/fortuneintern/",
                    color: "text-pink-700 hover:bg-pink-50",
                  },
                ] as const).map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Fortune Intern on ${social.name}`}
                    title={social.name}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border transition-colors ${social.color}`}
                  >
                    <Icon name={social.icon} className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary"
              >
                Keep my account
              </button>
              <button
                type="button"
                onClick={() => setStep("final")}
                className="py-3 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800"
              >
                Continue to delete
              </button>
            </div>
          </>
        )}

        {step === "final" && (
          <>
            <h2 id="delete-account-title" className="font-display text-2xl text-red-800">
              This cannot be undone
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              Type <strong>delete</strong> to disable your account now and schedule permanent deletion after 30 days.
            </p>
            <label htmlFor="delete-account-confirmation" className="block mt-5 text-sm font-semibold">
              Type delete to confirm
            </label>
            <input
              id="delete-account-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              className="mt-2 w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2"
            />
            {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeletion()}
                disabled={deleting || confirmation.trim() !== "delete"}
                className="py-3 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete my account"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
