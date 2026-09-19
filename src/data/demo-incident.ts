import type { Incident } from "@/lib/types";

/** Seed demo incident: Maya, silent_safety, SoMa. Used by /brief/demo and judge demo. */
export function demoIncident(now = new Date()): Incident {
  const at = now.toISOString();
  return {
    id: "demo",
    type: "silent_safety",
    urgency: "high",
    status: "active",
    speakFreely: false,
    notifyContactsOk: true,
    notifyPoliceOk: false,
    startedAt: at,
    user: { id: "u_maya", name: "Maya", role: "user", notes: "Cannot speak freely." },
    people: [
      { id: "u_maya", name: "Maya", role: "user", notes: "Cannot speak freely." },
      { id: "p_aggr", name: "Unknown adult male", role: "aggressor", notes: "Identity unknown." },
      { id: "c_priya", name: "Priya", role: "contact", phone: "+15555550101", notes: "Sister" },
      { id: "c_jordan", name: "Jordan", role: "contact", phone: "+15555550102", notes: "Advocate" },
    ],
    observations: [
      { id: "o1", kind: "clothing", text: "dark hoodie, left forearm tattoo", confidence: 0.8, source: "user", aboutPersonId: "p_aggr", at },
      { id: "o2", kind: "injury", text: "swelling on right cheek", confidence: 0.9, source: "user", aboutPersonId: "u_maya", at },
      { id: "o3", kind: "quote", text: "weather looks bad", confidence: 0.95, source: "text", at },
    ],
    locations: [{ lat: 37.7897, lng: -122.3972, label: "SoMa, San Francisco", at }],
    messages: [
      { id: "m1", role: "user", text: "weather looks bad", at, silent: true },
      { id: "m2", role: "haven", text: "Noted. You're not alone.", at, silent: true },
    ],
    notices: [],
    resourcesUsed: ["National Domestic Violence Hotline"],
    summary: "Maya cannot speak freely in SoMa. Possible DV situation, urgency high.",
  };
}
