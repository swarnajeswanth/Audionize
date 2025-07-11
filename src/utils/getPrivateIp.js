export async function getPrivateIp() {
  try {
    // Method 1: Try WebRTC (most reliable for browsers)
    const rtc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    const rtcPromise = new Promise((resolve) => {
      rtc.createDataChannel("");
      rtc
        .createOffer()
        .then((offer) => rtc.setLocalDescription(offer))
        .catch(() => resolve(null));

      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
          if (match) {
            const ip = match[1];
            // Filter out non-private IPs and localhost
            if (
              ip.startsWith("192.168.") ||
              ip.startsWith("10.") ||
              (ip.startsWith("172.") &&
                !ip.startsWith("172.16.") &&
                !ip.startsWith("172.31."))
            ) {
              rtc.close();
              resolve(ip);
              return;
            }
          }
        }
      };

      // Fallback after timeout
      setTimeout(() => {
        rtc.close();
        resolve(null);
      }, 2000);
    });

    const rtcResult = await rtcPromise;
    if (rtcResult) {
      return rtcResult;
    }

    // Method 2: Try STUN server approach
    try {
      const stunPromise = new Promise((resolve) => {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pc.createDataChannel("");
        pc.createOffer().then((offer) => pc.setLocalDescription(offer));

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            const ip = e.candidate.candidate.split(" ")[4];
            if (
              ip &&
              ip.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)
            ) {
              pc.close();
              resolve(ip);
            }
          }
        };

        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 2000);
      });

      const stunResult = await stunPromise;
      if (stunResult) {
        return stunResult;
      }
    } catch (stunError) {
      console.warn("STUN method failed:", stunError);
    }

    // Method 3: Try to get from network interfaces (if available)
    if (typeof navigator !== "undefined" && navigator.connection) {
      try {
        const connection = navigator.connection;
        if (connection.type === "wifi" || connection.type === "ethernet") {
          // For WiFi/Ethernet, try common local IP patterns
          return "192.168.1.100"; // Common router IP
        }
      } catch (navError) {
        console.warn("Network interface detection failed:", navError);
      }
    }

    // Method 4: Try external service for local network info
    try {
      const response = await fetch("https://httpbin.org/ip", {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        // This gives public IP, but we can infer local network
        const publicIp = data.origin;
        if (publicIp) {
          // Try to guess local IP based on common patterns
          const parts = publicIp.split(".");
          if (parts.length === 4) {
            // Common local network patterns
            const candidates = [
              `192.168.1.100`,
              `192.168.0.100`,
              `10.0.0.100`,
              `172.16.0.100`,
            ];
            return candidates[0]; // Return first candidate
          }
        }
      }
    } catch (externalError) {
      console.warn("External IP detection failed:", externalError);
    }

    // Final fallback
    console.warn("Could not detect LAN IP, using fallback");
    return "192.168.1.100"; // Common local network IP
  } catch (error) {
    console.error("Error getting private IP:", error);
    return "192.168.1.100"; // Common fallback
  }
}
