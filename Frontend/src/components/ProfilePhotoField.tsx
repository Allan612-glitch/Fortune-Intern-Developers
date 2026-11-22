import { useEffect, useId, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { uploadProfilePhoto } from "../services/auth";
import ProfileAvatar from "./layout/ProfileAvatar";

export default function ProfilePhotoField({ photo, initials, onSaved, onBusyChange }: {
  photo: string | null | undefined;
  initials: string;
  onSaved: (photo: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!pending) { setPreview(""); return; }
    const url = URL.createObjectURL(pending);
    setPreview(url);
    dialog.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const save = async () => {
    if (!pending) return;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const result = await uploadProfilePhoto(pending);
      onSaved(result.profile_picture);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save profile photo.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4 text-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" aria-label="View profile photo" disabled={!photo} onClick={() => dialog.current?.showModal()} className="shrink-0 rounded-full">
          <ProfileAvatar initials={initials} photoUrl={photo} className="size-12 bg-accent text-sm text-accent-foreground" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold">Profile photo</p>
          <p className="text-xs text-muted-foreground">Shared across your workspaces and application reviews.</p>
        </div>
        <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-primary focus-within:ring-2">
          <Upload aria-hidden="true" className="size-4" />{photo ? "Change photo" : "Upload photo"}
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) { setError("Choose a photo under 5 MB."); return; }
              setError("");
              setPending(file);
            }} />
        </label>
      </div>
      {error && !pending && <p role="alert" className="mt-2 text-xs text-red-800">{error}</p>}
      <dialog ref={dialog} onClose={() => { setPending(null); setError(""); }} onCancel={e => { if (busy) e.preventDefault(); }}
        aria-label="Profile photo preview" className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-5 shadow-xl backdrop:bg-black/50">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Profile photo</h2>
          <button type="button" aria-label="Close photo preview" disabled={busy} onClick={() => dialog.current?.close()}><X className="size-5" /></button>
        </div>
        {(preview || photo) && <img src={preview || photo || ""} alt="Profile photo preview" className="mx-auto max-h-[55vh] w-full rounded-lg object-contain" />}
        {error && pending && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
        {pending && <button type="button" disabled={busy} onClick={() => void save()} className="mt-4 min-h-11 w-full rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save photo"}</button>}
      </dialog>
    </div>
  );
}
