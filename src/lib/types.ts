export type CrisisType =
  | "silent_safety" // DV / cannot speak / intimate partner
  | "mental_health"
  | "medical"
  | "followed"
  | "general";

export type Urgency = "low" | "medium" | "high" | "critical";

export type ObservationKind =
  | "clothing"
  | "injury"
  | "quote"
  | "weapon"
  | "vehicle"
  | "person"
  | "sound"
  | "other";

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
  at: string; // ISO
}

export interface Person {
  id: string;
  name: string;
  role: "user" | "aggressor" | "witness" | "contact" | "officer";
  phone?: string;
  notes?: string;
}

export interface Observation {
  id: string;
  kind: ObservationKind;
  text: string;
  confidence: number; // 0-1
  source: "text" | "image" | "audio" | "location" | "user";
  aboutPersonId?: string;
  at: string;
}

export interface Message {
  id: string;
  role: "user" | "haven" | "system" | "contact";
  text: string;
  at: string;
  silent?: boolean;
}

export interface OutboundNotice {
  id: string;
  toName: string;
  toPhone: string;
  body: string;
  channel: "imessage" | "sms" | "mock";
  status: "queued" | "sent" | "failed" | "mocked";
  at: string;
}

export interface Incident {
  id: string;
  type: CrisisType;
  urgency: Urgency;
  status: "active" | "safe" | "handed_off" | "closed";
  speakFreely: boolean;
  notifyContactsOk: boolean;
  notifyPoliceOk: boolean;
  startedAt: string;
  user: Person;
  people: Person[];
  observations: Observation[];
  locations: GeoPoint[];
  messages: Message[];
  notices: OutboundNotice[];
  resourcesUsed: string[];
  summary: string;
}
