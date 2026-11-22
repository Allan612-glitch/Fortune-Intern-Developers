import { apiBlob, apiRequest } from "./api";

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_type: string | null;
  actor_role: string | null;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  outcome: string;
  correlation_id: string | null;
  workflow_id: string | null;
  parent_id: string | null;
  retry_of_id: string | null;
  reversal_of_id: string | null;
  origin_network?: string | null;
  service?: string;
  details?: { changes?: Record<string, {before: unknown; after: unknown}>; context?: Record<string, unknown> } | null;
}

export function listAudit(filters: Record<string, string>, offset: number, opened: boolean) {
  return apiRequest<{events: AuditEvent[]; has_more: boolean; as_of: string}>(
    `/api/admin/audit?${new URLSearchParams({ ...filters, offset: String(offset), opened: String(opened) })}`,
  );
}

export function inspectAudit(id: string, offset = 0) {
  return apiRequest<{event: AuditEvent; related: AuditEvent[]; has_more: boolean}>(
    `/api/admin/audit/${encodeURIComponent(id)}?offset=${offset}`,
  );
}

export function exportAudit(format: "pdf" | "xlsx" | "json", filters: Record<string, string>) {
  return apiBlob("/api/admin/audit/export", { method: "POST", body: JSON.stringify({ format, filters }) });
}

export function getOperations() {
  return apiRequest<{
    days: number; since: string; new_applications: number; new_accounts: number; announcements: number;
    open_programs: number; application_statuses: Record<string, number>; audit_outcomes: Record<string, number>;
  }>("/api/admin/operations");
}
