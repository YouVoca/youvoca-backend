import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "youvoca-backend",
    timestamp: new Date().toISOString(),
  });
}
