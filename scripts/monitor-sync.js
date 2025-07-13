#!/usr/bin/env node

/**
 * Audionize Sync Server Monitor
 *
 * This script monitors the sync server for performance issues and provides
 * real-time statistics about active sessions, clients, and sync operations.
 */

const axios = require("axios");

const SERVER_URL = process.env.SYNC_SERVER_URL || "http://localhost:4000";
const MONITOR_INTERVAL = 5000; // 5 seconds

class SyncMonitor {
  constructor() {
    this.stats = {
      startTime: Date.now(),
      checks: 0,
      errors: 0,
      lastStatus: null,
      sessionHistory: [],
    };
  }

  async checkServerHealth() {
    try {
      const response = await axios.get(`${SERVER_URL}/status`, {
        timeout: 3000,
      });

      this.stats.checks++;
      this.stats.lastStatus = response.data;

      return response.data;
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Health check failed: ${error.message}`);
      return null;
    }
  }

  async checkServerInfo() {
    try {
      const response = await axios.get(`${SERVER_URL}/info`, {
        timeout: 3000,
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Info check failed: ${error.message}`);
      return null;
    }
  }

  displayStats(data) {
    if (!data) return;

    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const errorRate =
      this.stats.checks > 0
        ? ((this.stats.errors / this.stats.checks) * 100).toFixed(2)
        : 0;

    console.clear();
    console.log("🎵 Audionize Sync Server Monitor");
    console.log("=".repeat(50));
    console.log(`⏱️  Monitor Uptime: ${this.formatDuration(uptime)}`);
    console.log(
      `📊 Checks: ${this.stats.checks} | Errors: ${this.stats.errors} | Error Rate: ${errorRate}%`
    );
    console.log(`🔄 Last Check: ${new Date().toLocaleTimeString()}`);
    console.log("");

    // Server Status
    console.log("📡 Server Status:");
    console.log(`   Status: ${data.status}`);
    console.log(`   Active Sessions: ${data.activeSessions}`);
    console.log(
      `   Timestamp: ${new Date(data.timestamp).toLocaleTimeString()}`
    );
    console.log("");

    // Session Details
    if (data.sessions && data.sessions.length > 0) {
      console.log("🎭 Active Sessions:");
      data.sessions.forEach((session, index) => {
        const duration = Math.floor(
          (Date.now() - new Date(session.createdAt)) / 1000
        );
        console.log(`   ${index + 1}. Session: ${session.sessionCode}`);
        console.log(`      Host: ${session.host || "None"}`);
        console.log(`      Clients: ${session.clientCount}`);
        console.log(`      Audio: ${session.hasAudio ? "✅" : "❌"}`);
        console.log(`      Duration: ${this.formatDuration(duration)}`);

        if (session.clients && session.clients.length > 0) {
          console.log(
            `      Connected: ${session.clients.map((c) => c.name).join(", ")}`
          );
        }
        console.log("");
      });
    } else {
      console.log("🎭 No active sessions");
      console.log("");
    }

    // Performance Metrics
    if (data.sessions && data.sessions.length > 0) {
      const totalClients = data.sessions.reduce(
        (sum, s) => sum + s.clientCount,
        0
      );
      const sessionsWithAudio = data.sessions.filter((s) => s.hasAudio).length;

      console.log("📈 Performance Metrics:");
      console.log(`   Total Connected Clients: ${totalClients}`);
      console.log(
        `   Sessions with Audio: ${sessionsWithAudio}/${data.activeSessions}`
      );
      console.log(
        `   Average Clients per Session: ${(
          totalClients / data.activeSessions
        ).toFixed(1)}`
      );
      console.log("");
    }

    // Memory Usage (if available)
    if (data.memory) {
      console.log("💾 Memory Usage:");
      console.log(`   Used: ${Math.round(data.memory.used / 1024 / 1024)}MB`);
      console.log(`   Total: ${Math.round(data.memory.total / 1024 / 1024)}MB`);
      console.log("");
    }
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  async start() {
    console.log("🚀 Starting Audionize Sync Server Monitor...");
    console.log(`📡 Monitoring: ${SERVER_URL}`);
    console.log(`⏱️  Interval: ${MONITOR_INTERVAL}ms`);
    console.log("");

    // Initial check
    await this.runCheck();

    // Set up periodic monitoring
    setInterval(async () => {
      await this.runCheck();
    }, MONITOR_INTERVAL);
  }

  async runCheck() {
    const healthData = await this.checkServerHealth();
    this.displayStats(healthData);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Monitor stopped");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Monitor stopped");
  process.exit(0);
});

// Start the monitor
const monitor = new SyncMonitor();
monitor.start().catch((error) => {
  console.error("❌ Monitor failed to start:", error);
  process.exit(1);
});
