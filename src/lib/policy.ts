import type { CrisisType, Incident } from "./types";

export interface SuggestedAction {
  id: string;
  label: string;
  tool: "notify" | "brief" | "script911" | "safe" | "resources" | "location";
  immediate: boolean;
  confirmRequired: boolean;
}

/** Short quiet reply used when the user cannot speak freely. */
export function quietReply(): string {
  return "Noted. You're not alone.";
}

/** Clamp Haven replies for silent_safety when the user cannot speak freely. */
export function shapeReplyForPolicy(incident: Incident, reply: string): string {
  if (incident.type === "silent_safety" && incident.speakFreely === false) {
    const words = reply.trim().split(/\s+/);
    if (words.length <= 12) return reply;
    return words.slice(0, 12).join(" ");
  }
  return reply;
}

export function chooseActions(incident: Incident): SuggestedAction[] {
  const t: CrisisType = incident.type;
  switch (t) {
    case "silent_safety":
      return [
        { id: "notify", label: "Notify trusted contacts", tool: "notify", immediate: incident.notifyContactsOk, confirmRequired: true },
        { id: "brief", label: "Open responder briefing", tool: "brief", immediate: false, confirmRequired: false },
        { id: "script911", label: "Draft 911 script (needs confirm)", tool: "script911", immediate: false, confirmRequired: true },
        { id: "safe", label: "I'm safe", tool: "safe", immediate: false, confirmRequired: true },
      ];
    case "mental_health":
      return [
        { id: "resources", label: "Show 988 + local crisis resources", tool: "resources", immediate: true, confirmRequired: false },
        { id: "brief", label: "Open responder briefing", tool: "brief", immediate: false, confirmRequired: false },
        { id: "notify", label: "Notify a contact (only if you ask)", tool: "notify", immediate: false, confirmRequired: true },
        { id: "safe", label: "I'm safe for now", tool: "safe", immediate: false, confirmRequired: true },
      ];
    case "medical":
      return [
        { id: "resources", label: "Nearest hospital + what to tell them", tool: "resources", immediate: true, confirmRequired: false },
        { id: "notify", label: "Notify contacts (optional)", tool: "notify", immediate: false, confirmRequired: true },
        { id: "script911", label: "Draft 911 script (needs confirm)", tool: "script911", immediate: false, confirmRequired: true },
        { id: "brief", label: "Open responder briefing", tool: "brief", immediate: false, confirmRequired: false },
      ];
    case "followed":
      return [
        { id: "location", label: "Share live location with contacts", tool: "location", immediate: incident.notifyContactsOk, confirmRequired: true },
        { id: "notify", label: "Notify contacts with description", tool: "notify", immediate: incident.notifyContactsOk, confirmRequired: true },
        { id: "brief", label: "Open responder briefing", tool: "brief", immediate: false, confirmRequired: false },
        { id: "safe", label: "I'm safe", tool: "safe", immediate: false, confirmRequired: true },
      ];
    case "general":
    default:
      return [
        { id: "notify", label: "Notify contacts", tool: "notify", immediate: false, confirmRequired: true },
        { id: "brief", label: "Open responder briefing", tool: "brief", immediate: false, confirmRequired: false },
        { id: "resources", label: "Show helpful resources", tool: "resources", immediate: false, confirmRequired: false },
        { id: "safe", label: "I'm safe", tool: "safe", immediate: false, confirmRequired: true },
      ];
  }
}

/** Whether the policy layer allows an automatic notify without a fresh tap. */
export function policyAllowsAutoNotify(incident: Incident): boolean {
  // Never auto-notify on mental_health unless user pre-authorized.
  if (incident.type === "mental_health") return false;
  // Silent safety: only if pre-authorized AND user cannot speak freely.
  if (incident.type === "silent_safety") {
    return incident.notifyContactsOk && incident.speakFreely === false;
  }
  return false;
}
