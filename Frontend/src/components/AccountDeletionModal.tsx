import { useState } from "react";
import { deleteAccount } from "../services/auth";

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
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white border border-border shadow-2xl p-6 slide-in">
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
              Is there anything we could have done better?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              We’re sorry to see you go. If something went wrong, we’d appreciate hearing from you. You can contact us at any time:
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <a className="block text-blue-700 underline" href="mailto:fortuneintern.gh@gmail.com">
                fortuneintern.gh@gmail.com
              </a>
              <a className="block text-blue-700 underline" href="tel:+233200313672">
                +233 20 031 3672
              </a>
              <a className="block text-blue-700 underline" href="tel:+233257038948">
                +233 25 703 8948
              </a>
              <a
                className="block text-blue-700 underline"
                href="https://whatsapp.com/channel/0029Val97zy1yT2BGkOZi511"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="block text-blue-700 underline"
                href="https://www.linkedin.com/company/fortune-intern-network/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              <a
                className="block text-blue-700 underline"
                href="https://x.com/fortune_intern1"
                target="_blank"
                rel="noopener noreferrer"
              >
                X (@fortune_intern1)
              </a>
              <a
                className="block text-blue-700 underline"
                href="https://www.instagram.com/fortuneintern/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram (@fortuneintern)
              </a>
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
