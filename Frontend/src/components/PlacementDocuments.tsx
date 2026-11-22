import { useState } from "react";
import { Download } from "lucide-react";
import { saveFile } from "./AdminReportActions";
import { apiBlob } from "../services/api";
import { button, failureMessage } from "../pages/AdminWorkflowUI";

export default function PlacementDocuments({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download(kind: string) {
    setBusy(true); setError("");
    try {
      const file = await apiBlob("/api/applications/" + encodeURIComponent(applicationId) + "/placement-document/" + kind);
      saveFile(file, "FIN-" + kind + ".pdf");
    } catch (error) { setError(failureMessage(error)); }
    finally { setBusy(false); }
  }
  return <div>
    <div className="flex flex-wrap gap-2">
      {[["recommendation", "Recommendation letter"], ["assessment", "Assessment form"]].map(([kind, title]) =>
        <button type="button" key={kind} className={button} disabled={busy} onClick={() => void download(kind)}><Download className="size-4" aria-hidden="true" />{title}</button>)}
    </div>
    {error && <p role="alert" className="mt-1 text-sm">{error}</p>}
  </div>;
}
