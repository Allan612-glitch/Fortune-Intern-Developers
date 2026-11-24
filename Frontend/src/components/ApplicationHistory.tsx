import { useEffect, useState } from "react";
import { applicationStatusLabel } from "../services/applications";
import { listApplicationHistory } from "../services/platform";
import AsyncState from "./AsyncState";

export default function ApplicationHistory({ id, status, admin = false }: {
  id: string;
  status: string;
  admin?: boolean;
}) {
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listApplicationHistory>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listApplicationHistory(id, admin)
      .then((rows) => { if (active) setEntries(rows); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load status history.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, status, admin, retry]);

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">Status history</h3>
      {loading ? <AsyncState kind="loading" message="Loading status history…" /> : error ? (
        <AsyncState kind="error" message={error} onRetry={() => setRetry((count) => count + 1)} />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No dated status changes are available.</p>
      ) : (
        <ol className="space-y-3 border-l border-border pl-4">
          {entries.map((entry, index) => (
            <li key={`${entry.created_at}-${index}`}>
              <p className="text-sm font-medium">{applicationStatusLabel(entry.new_status)}</p>
              {admin && entry.reason && <p className="text-xs text-muted-foreground capitalize">{entry.reason.replace(/_/g, " ")}</p>}
              <time className="text-xs text-muted-foreground" dateTime={entry.created_at}>
                {new Date(entry.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
