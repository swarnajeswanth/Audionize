import { NextResponse } from "next/server";
import { getSecurityHeaders } from "../../../utils/security";

export async function GET() {
  try {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: "1.0.0",
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: getSecurityHeaders(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Health check failed" },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
