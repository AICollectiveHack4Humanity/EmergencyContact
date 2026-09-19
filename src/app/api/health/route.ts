import { NextResponse } from "next/server";
import { adapterModes } from "@/lib/adapters";
import { GEMINI_MODEL } from "@/lib/adapters/llm";

export async function GET() {
  return NextResponse.json({
    ...adapterModes(),
    // Debugging aids (no secrets): does the server see a key, and which model id?
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    geminiModel: GEMINI_MODEL,
  });
}
