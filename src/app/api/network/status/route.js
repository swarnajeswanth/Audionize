import { NextResponse } from "next/server";
import { getSecurityHeaders } from "../../../../utils/security";

export async function GET() {
  try {
    const networkStatus = {
      status: "connected",
      timestamp: new Date().toISOString(),
      latency: Math.floor(Math.random() * 50) + 10, // Simulated latency
      connectionType: "websocket",
      serverLocation: "global",
    };

    return NextResponse.json(networkStatus, {
      status: 200,
      headers: getSecurityHeaders(),
    });
  } catch (error) {
    console.error("Network status error:", error);
    return NextResponse.json(
      { status: "disconnected", error: "Network check failed" },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
