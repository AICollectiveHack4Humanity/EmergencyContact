export interface SeedResource {
  name: string;
  phone: string;
  kind: "hotline" | "shelter" | "hospital" | "pd";
  city?: string;
  notes?: string;
}

export const SEED_RESOURCES: SeedResource[] = [
  { name: "988 Suicide & Crisis Lifeline", phone: "988", kind: "hotline", city: "National", notes: "Call or text 988, 24/7." },
  { name: "National Domestic Violence Hotline", phone: "1-800-799-7233", kind: "hotline", city: "National", notes: "Text START to 88788." },
  { name: "W.O.M.A.N. Inc (SF)", phone: "415-864-4722", kind: "hotline", city: "San Francisco" },
  { name: "San Francisco Citywide Shelter Reservation", phone: "311", kind: "shelter", city: "San Francisco" },
  { name: "Zuckerberg San Francisco General", phone: "628-206-8000", kind: "hospital", city: "San Francisco", notes: "1001 Potrero Ave." },
  { name: "SFPD Non-emergency", phone: "415-553-0123", kind: "pd", city: "San Francisco" },
];
