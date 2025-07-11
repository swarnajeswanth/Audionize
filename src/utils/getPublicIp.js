export async function getPublicIp() {
  try {
    // Try multiple IP detection services for better reliability
    const services = [
      "https://api.ipify.org?format=json",
      "https://api.myip.com",
      "https://ipapi.co/json",
      "https://httpbin.org/ip",
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          const ip = data.ip || data.query || data.origin;
          if (ip && typeof ip === "string") {
            return ip;
          }
        }
      } catch (serviceError) {
        console.warn(`Failed to get IP from ${service}:`, serviceError);
        continue; // Try next service
      }
    }

    // If all services fail, return a placeholder
    console.warn("All IP detection services failed, using placeholder");
    return "your-public-ip.com"; // Placeholder for user to replace
  } catch (error) {
    console.error("Error getting public IP:", error);
    return "your-public-ip.com"; // Placeholder for user to replace
  }
}
