import { useEffect, useRef, useState } from "react";
import AsyncState from "./AsyncState";
import {
  listSiteImages,
  prepareSiteImage,
  removeSiteImage,
  siteImageSlots,
  uploadSiteImage,
  type SiteImageSlot,
} from "../services/siteImages";

type Notice = { kind: "success" | "error"; text: string };

/**
 * Admin tab for the photos on the public landing page.
 * Only rendered inside AdminPage, which is already admin-only; the backend
 * must enforce admin-only on the upload and delete endpoints as well.
 */
export default function SiteImagesPanel() {
  const [images, setImages] = useState<Partial<Record<SiteImageSlot, string>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [busySlot, setBusySlot] = useState<SiteImageSlot | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<SiteImageSlot | null>(null);
  const [notices, setNotices] = useState<Partial<Record<SiteImageSlot, Notice>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<SiteImageSlot | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    listSiteImages()
      .then((found) => {
        if (active) setImages(found);
      })
      .catch((requestError) => {
        if (active) {
          setLoadError(
            requestError instanceof Error ? requestError.message : "Unable to load site images.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryCount]);

  const setNotice = (slot: SiteImageSlot, notice: Notice | null) =>
    setNotices((current) => {
      const next = { ...current };
      if (notice) next[slot] = notice;
      else delete next[slot];
      return next;
    });

  const chooseFile = (slot: SiteImageSlot) => {
    pendingSlotRef.current = slot;
    setConfirmRemove(null);
    fileInputRef.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slot = pendingSlotRef.current;
    event.target.value = "";
    pendingSlotRef.current = null;
    if (!file || !slot) return;

    setBusySlot(slot);
    setNotice(slot, null);
    try {
      const prepared = await prepareSiteImage(file);
      const saved = await uploadSiteImage(slot, prepared.blob, prepared.filename);
      setImages((current) => ({ ...current, [slot]: saved.url }));
      setNotice(slot, { kind: "success", text: "Image saved. It now shows on the landing page." });
    } catch (requestError) {
      setNotice(slot, {
        kind: "error",
        text: requestError instanceof Error ? requestError.message : "Unable to upload the image.",
      });
    } finally {
      setBusySlot(null);
    }
  };

  const handleRemove = async (slot: SiteImageSlot) => {
    setBusySlot(slot);
    setNotice(slot, null);
    try {
      await removeSiteImage(slot);
      setImages((current) => {
        const next = { ...current };
        delete next[slot];
        return next;
      });
      setConfirmRemove(null);
      setNotice(slot, { kind: "success", text: "Image removed. The card shows without a photo." });
    } catch (requestError) {
      setNotice(slot, {
        kind: "error",
        text: requestError instanceof Error ? requestError.message : "Unable to remove the image.",
      });
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="bg-white border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold">Site images</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Photos shown on the FIN CONNECT cards on the public landing page. Use a landscape photo
          (about 16:10, at least 1200 × 750 pixels) in JPG, PNG or WebP. Large photos are shrunk
          automatically before they upload. Only admins can change these.
        </p>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleFile(event)}
        aria-hidden="true"
        tabIndex={-1}
      />

      {loading ? (
        <AsyncState kind="loading" message="Loading site images..." />
      ) : loadError ? (
        <AsyncState
          kind="error"
          message={loadError}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {siteImageSlots.map(({ slot, label, where }) => {
            const url = images[slot];
            const busy = busySlot === slot;
            const notice = notices[slot];
            return (
              <article
                key={slot}
                className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3"
              >
                <div>
                  <h4 className="font-semibold text-sm">{label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{where}</p>
                </div>
                <div className="aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                  {url ? (
                    <img
                      src={url}
                      alt={`Current photo for ${label}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <p className="px-4 text-center text-xs text-muted-foreground">
                      No photo yet. The card shows without one.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => chooseFile(slot)}
                    disabled={busy}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
                  >
                    {busy ? "Working..." : url ? "Replace photo" : "Upload photo"}
                  </button>
                  {url && confirmRemove !== slot && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(slot)}
                      disabled={busy}
                      className="px-4 py-2.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                  {url && confirmRemove === slot && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleRemove(slot)}
                        disabled={busy}
                        className="px-4 py-2.5 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        {busy ? "Removing..." : "Yes, remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(null)}
                        disabled={busy}
                        className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
                {notice && (
                  <p
                    className={`text-xs ${notice.kind === "success" ? "text-emerald-700" : "text-red-600"}`}
                    role={notice.kind === "success" ? "status" : "alert"}
                  >
                    {notice.text}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
