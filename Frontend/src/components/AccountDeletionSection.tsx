import { useState } from "react";
import AccountDeletionModal from "./AccountDeletionModal";

export default function AccountDeletionSection({ onAccountDeleted }: { onAccountDeleted: () => void }) {
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  return (
    <>
      <section className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-sm text-red-800">Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Disable your sign-in across all workspaces immediately and permanently delete its data after a 30-day retention period.
        </p>
        <button
          type="button"
          onClick={() => setDeleteAccountOpen(true)}
          className="mt-4 rounded-xl border border-red-700 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Delete my account
        </button>
      </section>

      {deleteAccountOpen && (
        <AccountDeletionModal
          onCancel={() => setDeleteAccountOpen(false)}
          onDeleted={onAccountDeleted}
        />
      )}
    </>
  );
}
