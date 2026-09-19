import { SEED_RESOURCES } from "@/data/seed-resources";

/** Curated local resources, filtered by crisis type. Never invents entries. */
export function resourcesForType(type: string): { name: string; phone: string; kind: string; note?: string }[] {
  switch (type) {
    case "mental_health":
      return [
        { name: "988 Suicide & Crisis Lifeline", phone: "988", kind: "hotline", note: "Call or text 988, 24/7" },
        { name: "W.O.M.A.N. Inc (SF)", phone: "415-864-4722", kind: "hotline" },
      ];
    case "silent_safety":
      return [
        { name: "National Domestic Violence Hotline", phone: "1-800-799-7233", kind: "hotline", note: "Text START to 88788" },
        { name: "W.O.M.A.N. Inc (SF)", phone: "415-864-4722", kind: "hotline" },
        { name: "San Francisco Citywide Shelter Reservation", phone: "311", kind: "shelter" },
      ];
    case "medical":
      return [
        { name: "Zuckerberg San Francisco General", phone: "628-206-8000", kind: "hospital", note: "1001 Potrero Ave" },
        { name: "SFPD Non-emergency", phone: "415-553-0123", kind: "pd" },
      ];
    case "followed":
      return [
        { name: "SFPD Non-emergency", phone: "415-553-0123", kind: "pd" },
        { name: "San Francisco Citywide Shelter Reservation", phone: "311", kind: "shelter" },
      ];
    default:
      return SEED_RESOURCES.map((r) => ({ name: r.name, phone: r.phone, kind: r.kind }));
  }
}
