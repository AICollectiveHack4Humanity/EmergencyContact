import { mockGraph } from "./graph";
import { mockMessaging } from "./messaging";
import { mockLlm, geminiLlm } from "./llm";

// Barrel: the LLM is live when GEMINI_API_KEY is set, mock otherwise.
// Messaging + graph are local-only (prior Photon/FalkorDB integrations removed).
export const llm = process.env.GEMINI_API_KEY ? geminiLlm : mockLlm;

export const messaging = mockMessaging;

export const graph = mockGraph;

export function adapterModes(): {
  gemini: "live" | "mock";
  store: "local";
} {
  return {
    gemini: process.env.GEMINI_API_KEY ? "live" : "mock",
    store: "local",
  };
}
