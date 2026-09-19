import { NextResponse } from "next/server";
import { adapterModes } from "@/lib/adapters";

export async function GET() {
  return NextResponse.json(adapterModes());
}
