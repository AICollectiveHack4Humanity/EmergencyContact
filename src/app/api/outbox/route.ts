import { NextResponse } from "next/server";
import { memoryStore } from "@/lib/store/memory";
import { graph, messaging, llm } from "@/lib/adapters";
import { demoIncident } from "@/data/demo-incident";

export async function GET() {
  return NextResponse.json({ outbox: memoryStore.getOutbox(), via: messaging.mode });
}

/** Judge demo + reset helpers live under /api/demo/*. This GET lists them. */
export async function POST() {
  return NextResponse.json({ ok: true });
}
