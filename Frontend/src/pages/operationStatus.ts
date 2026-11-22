export function operationTone(text: string) {
  const status = text.toLowerCase().replace(/_/g, " ");
  if (["healthy", "success", "accepted", "completed", "configured"].includes(status)) return "green";
  if (["failed", "failure", "unavailable", "rejected", "cancelled", "error", "critical"].includes(status)) return "red";
  if (["setup required", "partial", "partial success", "degraded", "reversed", "under review", "in progress"].includes(status)) return "orange";
  if (["submitted", "pending", "skipped", "waiting", "awaiting documents", "warning"].includes(status)) return "yellow";
  return "neutral";
}
