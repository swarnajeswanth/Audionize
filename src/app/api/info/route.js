import { NextResponse } from "next/server";
import { getSecurityHeaders } from "../../../utils/security";

export async function GET() {
  try {
    const serverInfo = {
      version: "1.0.0",
      status: "running",
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(serverInfo, {
      status: 200,
      headers: getSecurityHeaders(),
    });
  } catch (error) {
    console.error("Server info error:", error);
    return NextResponse.json(
      { error: "Failed to get server info" },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
