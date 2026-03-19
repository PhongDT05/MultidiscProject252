export type AuditCategory = "user_action" | "system_event" | "sensor_data";
import type { ReasonCode } from "../types/reasonCodes";

export type AuditResult = "success" | "failed" | "attempted";

export interface AuditEvent {
  category: AuditCategory;
  action: string;
  interfaceName: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetType?: string;
  targetId?: string;
  roomId?: string;
  reasonCode?: ReasonCode;
  result: AuditResult;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

const AUDIT_ENDPOINT =
  import.meta.env.VITE_AUDIT_ENDPOINT?.toString() ?? "/api/audit/events";

const DEFAULT_ACTOR = {
  id: "usr-lab-manager-01",
  name: "Dr. Sarah Chen",
  role: "lab_manager",
};

const createCorrelationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `corr-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const sendWithBeacon = (payload: AuditEvent) => {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) {
    return false;
  }

  try {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    return navigator.sendBeacon(AUDIT_ENDPOINT, blob);
  } catch {
    return false;
  }
};

export const logAuditEvent = async (event: Omit<AuditEvent, "timestamp">) => {
  const payload: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(AUDIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Keep UI responsive if audit service is temporarily unavailable.
  }
};

export const logUserAction = async (
  event: Omit<
    AuditEvent,
    "category" | "actorId" | "actorName" | "actorRole" | "timestamp" | "correlationId"
  >,
) => {
  const fullEvent: Omit<AuditEvent, "timestamp"> = {
    category: "user_action",
    actorId: DEFAULT_ACTOR.id,
    actorName: DEFAULT_ACTOR.name,
    actorRole: DEFAULT_ACTOR.role,
    correlationId: createCorrelationId(),
    ...event,
  };

  if (event.action === "REFRESH_DASHBOARD" && sendWithBeacon({
    ...fullEvent,
    timestamp: new Date().toISOString(),
  })) {
    return;
  }

  await logAuditEvent(fullEvent);
};