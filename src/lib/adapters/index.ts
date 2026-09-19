import { mockGraph, falkorGraph } from "./graph";
import { mockMessaging, photonMessaging } from "./messaging";
import { mockLlm, geminiLlm } from "./llm";

// Barrel: env vars are the ONLY switch. UI + API routes talk to these.
export const llm = process.env.GEMINI_API_KEY ? geminiLlm : mockLlm;

export const messaging =
  process.env.PHOTON_ENABLED === "true" ? photonMessaging : mockMessaging;

export const graph =
  process.env.FALKORDB_ENABLED === "true" ? falkorGraph : mockGraph;

export function adapterModes(): {
  gemini: "live" | "mock";
  photon: "live" | "mock";
  falkordb: "live" | "mock";
} {
  return {
    gemini: process.env.GEMINI_API_KEY ? "live" : "mock",
    photon: process.env.PHOTON_ENABLED === "true" ? "live" : "mock",
    falkordb: process.env.FALKORDB_ENABLED === "true" ? "live" : "mock",
  };
}
